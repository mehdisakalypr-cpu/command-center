-- Registry of API keys detected across VPS projects. Powers the scale-
-- readiness verdict in /admin/simulator: each agent row flips from ❓
-- unknown → ✅/⛔ once this table is populated by the sync script.
create table if not exists api_keys_registry (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  env_var_name text not null,
  key_hash text not null,
  project text not null,
  status text not null default 'active' check (status in ('active', 'revoked', 'exhausted')),
  daily_quota numeric,
  per_minute_quota numeric,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, key_hash, project)
);

create index if not exists idx_api_keys_registry_provider_status
  on api_keys_registry (provider, status);

alter table api_keys_registry enable row level security;

drop policy if exists service_all_api_keys on api_keys_registry;
create policy service_all_api_keys on api_keys_registry for all using (true) with check (true);
