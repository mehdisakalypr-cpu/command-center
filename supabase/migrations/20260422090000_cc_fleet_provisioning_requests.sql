-- CC Fleet v2 — provisioning requests queue.
-- User cocher "I have N new accounts" dans dashboard → insère N rows ici.
-- Terminal Claude Code lit ces rows pendantes, collecte les clés, exécute setup+register.

begin;

create table if not exists public.cc_fleet_provisioning_requests (
  id                       uuid primary key default gen_random_uuid(),
  requested_by             uuid references auth.users(id) on delete set null,
  desired_worker_id        text,                          -- ex: 'worker-2' (optionnel, auto-assigné si null)
  kind                     text not null default 'autonomous'
                             check (kind in ('autonomous','interactive')),
  capabilities             text[] not null default array['scout','content','refactor','cron','fix'],
  quota_plan               text not null default 'max_20x'
                             check (quota_plan in ('max_5x','max_20x','team','api_direct')),
  night_eligible           boolean not null default true,
  max_concurrent_tickets   int not null default 2,
  notes                    text,                          -- freeform "compte email X acheté le Y"
  state                    text not null default 'pending'
                             check (state in ('pending','in_progress','provisioned','failed','cancelled')),
  provisioned_at           timestamptz,
  provisioning_log         text,                          -- terminal output snippet (appended by wizard)
  error_message            text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index if not exists idx_prov_req_state      on public.cc_fleet_provisioning_requests(state, created_at);
create index if not exists idx_prov_req_requester  on public.cc_fleet_provisioning_requests(requested_by);

drop trigger if exists trg_prov_req_updated_at on public.cc_fleet_provisioning_requests;
create trigger trg_prov_req_updated_at before update on public.cc_fleet_provisioning_requests
  for each row execute function public.cc_fleet_touch_updated_at();

-- Vue simple pour dashboard (nombre de requêtes par state)
create or replace view public.cc_fleet_provisioning_stats as
select state, count(*)::int as cnt
from public.cc_fleet_provisioning_requests
group by state;

alter table public.cc_fleet_provisioning_requests enable row level security;

drop policy if exists prov_req_admin_all on public.cc_fleet_provisioning_requests;
create policy prov_req_admin_all on public.cc_fleet_provisioning_requests
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and (p.is_admin = true or p.is_delegate_admin = true))
  ) with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and (p.is_admin = true or p.is_delegate_admin = true))
  );

commit;
