-- AAM Phase 5 — extends business_ideas for forge status + new automation_upgrades table.
-- Spec: docs/superpowers/specs/2026-04-22-aam-phase5-design.md §4

begin;

alter table public.business_ideas
  add column if not exists automation_gaps       jsonb not null default '[]'::jsonb,
  add column if not exists forge_attempts        int  not null default 0,
  add column if not exists last_forge_at         timestamptz,
  add column if not exists forge_status          text not null default 'idle'
    check (forge_status in ('idle','queued','forging','promoted','permanent_fail'));

create index if not exists idx_biz_ideas_forge_status
  on public.business_ideas(forge_status)
  where forge_status in ('queued','forging');

create table if not exists public.automation_upgrades (
  id                   uuid primary key default gen_random_uuid(),
  idea_id              uuid not null references public.business_ideas(id) on delete cascade,
  attempt_number       int  not null,
  dim_targeted         text not null
    check (dim_targeted in ('acquisition','content_ops','fulfillment','support')),
  autonomy_before      numeric(3,2) not null,

  candidates           jsonb,
  chosen_candidate     jsonb,

  integration_plan     jsonb,

  sandbox_run_id       text,
  sandbox_logs_url     text,
  test_output          jsonb,

  autonomy_after       numeric(3,2),
  human_params_needed  jsonb,

  verdict              text not null
    check (verdict in ('promoted','failed','needs_human','out_of_budget')),
  verdict_reason       text,

  cost_eur             numeric(6,2) default 0,

  started_at           timestamptz not null default now(),
  finished_at          timestamptz,
  unique(idea_id, attempt_number)
);

create index if not exists idx_auto_upgrades_idea    on public.automation_upgrades(idea_id);
create index if not exists idx_auto_upgrades_verdict on public.automation_upgrades(verdict, finished_at desc);

alter table public.automation_upgrades enable row level security;

commit;
