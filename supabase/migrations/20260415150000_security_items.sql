-- Security cockpit: items (stack + incidents + todo) + score history
create table if not exists security_items (
  id uuid primary key default gen_random_uuid(),
  site text not null check (site in ('ftg','cc','ofa','estate','shift','global')),
  category text not null check (category in ('backdoor','auth','middleware','headers','rls','webhook','secrets','ddos','deps','cors','incident','stack')),
  severity text not null check (severity in ('critical','high','medium','low','info')),
  status text not null default 'open' check (status in ('open','in_progress','done','wontfix','verified')),
  title text not null,
  description text,
  remediation text,
  owner text,
  evidence_url text,
  commit_hash text,
  detected_at timestamptz not null default now(),
  resolved_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists security_items_site_status_severity_idx on security_items(site, status, severity);
create index if not exists security_items_detected_at_idx on security_items(detected_at desc);

alter table security_items enable row level security;

drop policy if exists "admin read" on security_items;
create policy "admin read" on security_items for select using (
  exists(select 1 from profiles where id=auth.uid() and (is_admin=true or is_delegate_admin=true))
);

drop policy if exists "admin write" on security_items;
create policy "admin write" on security_items for all using (
  exists(select 1 from profiles where id=auth.uid() and (is_admin=true or is_delegate_admin=true))
) with check (
  exists(select 1 from profiles where id=auth.uid() and (is_admin=true or is_delegate_admin=true))
);

-- Historical scoring snapshots
create table if not exists security_scores_history (
  id uuid primary key default gen_random_uuid(),
  site text not null,
  score integer not null check (score between 0 and 100),
  counts jsonb not null default '{}'::jsonb,
  captured_at timestamptz not null default now()
);
create index if not exists security_scores_history_site_captured_idx on security_scores_history(site, captured_at desc);

alter table security_scores_history enable row level security;

drop policy if exists "admin read history" on security_scores_history;
create policy "admin read history" on security_scores_history for select using (
  exists(select 1 from profiles where id=auth.uid() and (is_admin=true or is_delegate_admin=true))
);

drop policy if exists "admin write history" on security_scores_history;
create policy "admin write history" on security_scores_history for all using (
  exists(select 1 from profiles where id=auth.uid() and (is_admin=true or is_delegate_admin=true))
) with check (
  exists(select 1 from profiles where id=auth.uid() and (is_admin=true or is_delegate_admin=true))
);

-- Auto-update updated_at
create or replace function set_security_items_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_security_items_updated_at on security_items;
create trigger trg_security_items_updated_at
  before update on security_items
  for each row execute function set_security_items_updated_at();
