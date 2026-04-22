-- CC Fleet v1 — N-worker orchestration (dormant by default)
-- Blueprint: memory/project_cc_dual_account_architecture.md (v2 N-ready)
-- Activation: set CC_FLEET_ENABLED=true on command-center + register workers.
-- Tables: cc_workers (registry), minato_tickets (queue), minato_audit (immutable log).

begin;

create extension if not exists pgcrypto;

-- ──────────────────────────────────────────────────────────────────────────────
-- cc_workers: registry of N Claude Code instances (interactive + autonomous)
-- ──────────────────────────────────────────────────────────────────────────────
create table if not exists public.cc_workers (
  id                      text primary key,                   -- 'main', 'worker-1', 'worker-2', …
  display_name            text not null,
  kind                    text not null check (kind in ('interactive','autonomous')),
  capabilities            text[] not null default '{}',       -- ['ui','scout','content','refactor','cron','fix','feature','architecture','review','debug']
  quota_plan              text not null default 'max_20x'     -- 'max_5x'|'max_20x'|'team'|'api_direct'
                            check (quota_plan in ('max_5x','max_20x','team','api_direct')),
  quota_used_pct          numeric(5,2) default 0,             -- 0-100 rolling 5h
  quota_window_started_at timestamptz,
  cost_week_usd           numeric(10,2) default 0,
  heartbeat_at            timestamptz,
  state                   text not null default 'offline'     -- active|paused|offline
                            check (state in ('active','paused','offline')),
  night_eligible          boolean not null default false,
  max_concurrent_tickets  int not null default 1,
  home_path               text,                               -- e.g. '/root' or '/home/cc-worker-1'
  killswitch_file         text,                               -- e.g. '/srv/shared/PAUSE_WORKER_1'
  systemd_unit            text,                               -- e.g. 'cc-worker@1.service', null for main
  gh_author_email         text,                               -- commit co-author trace
  metadata                jsonb not null default '{}'::jsonb,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);
create index if not exists idx_cc_workers_state     on public.cc_workers(state);
create index if not exists idx_cc_workers_heartbeat on public.cc_workers(heartbeat_at desc);

-- ──────────────────────────────────────────────────────────────────────────────
-- minato_tickets: the queue. Capability-based routing, scope-locked.
-- ──────────────────────────────────────────────────────────────────────────────
create table if not exists public.minato_tickets (
  id               uuid primary key default gen_random_uuid(),
  project          text not null,                             -- 'ftg'|'ofa'|'cc'|'estate'|'shift'
  type             text not null,                             -- 'feature'|'fix'|'refactor'|'scout'|'content'|'cron'
  title            text not null,
  body             text,
  scope            text[] not null,                           -- glob paths: ['app/api/**','lib/agents/**']
  required_caps    text[] not null default '{}',              -- ['scout'] => worker must have all of these
  forbidden_caps   text[] not null default '{}',              -- ['ui'] => worker must not match any of these
  priority         int not null default 50 check (priority between 0 and 100),
  mrr_impact       numeric(4,2) default 1.0,                  -- multiplier for dispatcher score
  mrr_target_id    text,                                      -- e.g. 'ftg.leads_count', 'ofa.sites_published'
  assignee         text,                                      -- null|'any'|<worker_id>
  exclusive        boolean not null default false,            -- if true: no scope overlap with any in_progress
  night_eligible   boolean not null default false,
  budget_tokens    int,                                       -- required on enqueue; dispatcher enforces
  state            text not null default 'queued'             -- queued|claimed|in_progress|pr_open|merged|done|failed|blocked
                     check (state in ('queued','claimed','in_progress','pr_open','merged','done','failed','blocked','draft')),
  claimed_by       text references public.cc_workers(id) on delete set null,
  claimed_at       timestamptz,
  heartbeat_at     timestamptz,
  last_progress    text,                                      -- hash of diff-in-progress (zombie detection)
  pr_url           text,
  branch           text,
  commit_sha       text,
  deps             uuid[] not null default '{}',
  tokens_used      int default 0,
  cost_usd         numeric(10,4) default 0,
  review_sampled   boolean not null default false,
  oversized        boolean not null default false,            -- budget blown, flagged
  error_message    text,
  retry_count      int not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists idx_tickets_state_priority    on public.minato_tickets(state, priority desc)
  where state in ('queued','blocked');
create index if not exists idx_tickets_claimed_by        on public.minato_tickets(claimed_by) where claimed_by is not null;
create index if not exists idx_tickets_project_state     on public.minato_tickets(project, state);
create index if not exists idx_tickets_heartbeat         on public.minato_tickets(heartbeat_at desc) where state = 'in_progress';
create index if not exists idx_tickets_mrr_target        on public.minato_tickets(mrr_target_id) where mrr_target_id is not null;

-- ──────────────────────────────────────────────────────────────────────────────
-- minato_audit: immutable log of everything that happens. Append-only.
-- ──────────────────────────────────────────────────────────────────────────────
create table if not exists public.minato_audit (
  id           bigserial primary key,
  ticket_id    uuid references public.minato_tickets(id) on delete set null,
  worker_id    text references public.cc_workers(id) on delete set null,
  action       text not null,                                 -- 'claim'|'release'|'commit'|'pr_open'|'merged'|'abort'|'heartbeat'|'kill'|'killswitch'|'register'
  payload      jsonb not null default '{}'::jsonb,            -- free-form context (files touched, tokens, error, …)
  created_at   timestamptz not null default now()
);
create index if not exists idx_audit_ticket on public.minato_audit(ticket_id, created_at desc);
create index if not exists idx_audit_worker on public.minato_audit(worker_id, created_at desc);
create index if not exists idx_audit_action on public.minato_audit(action, created_at desc);

-- ──────────────────────────────────────────────────────────────────────────────
-- touch updated_at on writes
-- ──────────────────────────────────────────────────────────────────────────────
create or replace function public.cc_fleet_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_cc_workers_updated_at   on public.cc_workers;
create trigger trg_cc_workers_updated_at   before update on public.cc_workers
  for each row execute function public.cc_fleet_touch_updated_at();

drop trigger if exists trg_minato_tickets_updated_at on public.minato_tickets;
create trigger trg_minato_tickets_updated_at before update on public.minato_tickets
  for each row execute function public.cc_fleet_touch_updated_at();

-- ──────────────────────────────────────────────────────────────────────────────
-- Views — pre-aggregated metrics for the dashboard (fast read path)
-- ──────────────────────────────────────────────────────────────────────────────
create or replace view public.cc_fleet_summary as
select
  w.id,
  w.display_name,
  w.kind,
  w.state,
  w.quota_plan,
  w.quota_used_pct,
  w.cost_week_usd,
  w.heartbeat_at,
  (now() - coalesce(w.heartbeat_at, 'epoch'::timestamptz)) as since_heartbeat,
  w.capabilities,
  w.night_eligible,
  w.max_concurrent_tickets,
  coalesce(tk_running.cnt, 0)::int     as tickets_in_progress,
  coalesce(tk_done_24h.cnt, 0)::int    as tickets_done_24h,
  coalesce(tk_failed_24h.cnt, 0)::int  as tickets_failed_24h
from public.cc_workers w
left join lateral (
  select count(*) cnt from public.minato_tickets t
   where t.claimed_by = w.id and t.state = 'in_progress'
) tk_running on true
left join lateral (
  select count(*) cnt from public.minato_tickets t
   where t.claimed_by = w.id and t.state in ('merged','done')
     and t.updated_at > now() - interval '24 hours'
) tk_done_24h on true
left join lateral (
  select count(*) cnt from public.minato_tickets t
   where t.claimed_by = w.id and t.state = 'failed'
     and t.updated_at > now() - interval '24 hours'
) tk_failed_24h on true;

create or replace view public.cc_fleet_queue_stats as
select
  state,
  count(*)::int as cnt,
  sum(coalesce(budget_tokens,0))::bigint as tokens_pending
from public.minato_tickets
group by state;

-- ──────────────────────────────────────────────────────────────────────────────
-- RLS — admin-only read/write (via service role or admin JWT).
-- ──────────────────────────────────────────────────────────────────────────────
alter table public.cc_workers    enable row level security;
alter table public.minato_tickets enable row level security;
alter table public.minato_audit  enable row level security;

drop policy if exists cc_workers_admin_all    on public.cc_workers;
drop policy if exists tickets_admin_all       on public.minato_tickets;
drop policy if exists audit_admin_read        on public.minato_audit;
drop policy if exists audit_admin_insert      on public.minato_audit;

create policy cc_workers_admin_all on public.cc_workers
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and (p.is_admin = true or p.is_delegate_admin = true))
  ) with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and (p.is_admin = true or p.is_delegate_admin = true))
  );

create policy tickets_admin_all on public.minato_tickets
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and (p.is_admin = true or p.is_delegate_admin = true))
  ) with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and (p.is_admin = true or p.is_delegate_admin = true))
  );

-- audit: admin read; inserts allowed to service role (dispatcher runs server-side).
create policy audit_admin_read on public.minato_audit
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and (p.is_admin = true or p.is_delegate_admin = true))
  );
-- Service role bypasses RLS, so no explicit insert policy needed; no authenticated-client inserts.

-- ──────────────────────────────────────────────────────────────────────────────
-- Seed: main worker (interactive, = toi). Idempotent.
-- ──────────────────────────────────────────────────────────────────────────────
insert into public.cc_workers (
  id, display_name, kind, capabilities, quota_plan,
  night_eligible, max_concurrent_tickets, home_path,
  killswitch_file, systemd_unit, gh_author_email, state, metadata
) values (
  'main',
  'Main (interactive)',
  'interactive',
  array['ui','feature','architecture','review','debug','fix','refactor','scout','content'],
  'max_20x',
  false,
  3,
  '/root',
  '/srv/shared/PAUSE_MAIN',
  null,
  null,
  'active',
  jsonb_build_object('role','primary','notes','User Mehdi interactive CC')
) on conflict (id) do nothing;

commit;
