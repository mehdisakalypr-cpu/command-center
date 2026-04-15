-- AI key-pool events log
-- One row per provider call: ok / fail / rate_limit / quota_exhausted / circuit_open / circuit_close.
-- Consumed by /admin/ai-pool dashboard and cost alerts.

create table if not exists ai_key_events (
  id bigserial primary key,
  project text not null check (project in ('ftg','ofa','cc')),
  provider text not null,
  key_label text not null,
  event text not null check (event in ('call_ok','call_fail','rate_limit','quota_exhausted','circuit_open','circuit_close')),
  latency_ms int,
  input_tokens int,
  output_tokens int,
  cost_usd numeric(10,6),
  error_code text,
  created_at timestamptz not null default now()
);

create index if not exists ai_key_events_project_provider_idx
  on ai_key_events(project, provider, created_at desc);
create index if not exists ai_key_events_key_label_idx
  on ai_key_events(key_label, created_at desc);
create index if not exists ai_key_events_created_at_idx
  on ai_key_events(created_at desc);

alter table ai_key_events enable row level security;

-- No public access; admin dashboard uses service_role, which bypasses RLS.
drop policy if exists ai_key_events_no_select on ai_key_events;
create policy ai_key_events_no_select on ai_key_events
  for select using (false);
