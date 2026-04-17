-- alerts_log — unified alert history for OFA + CC.
-- Receives every dispatched alert (success or failure) from lib/alerts/dispatch.ts
-- so the CC /admin/alerts-log page can display the chronological timeline.
create table if not exists public.alerts_log (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  level text not null check (level in ('LOW','MEDIUM','HIGH','CRITICAL')),
  message text,
  details jsonb default '{}'::jsonb,
  channels text[] default '{}',
  delivered jsonb default '[]'::jsonb,
  source text,
  created_at timestamptz not null default now()
);

create index if not exists idx_alerts_log_created_at on public.alerts_log(created_at desc);
create index if not exists idx_alerts_log_code_level on public.alerts_log(code, level, created_at desc);

-- Optional RLS (service role bypasses). Enable with care if ever exposed to clients.
alter table public.alerts_log enable row level security;
drop policy if exists alerts_log_admin_read on public.alerts_log;
create policy alerts_log_admin_read on public.alerts_log
  for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and (p.is_admin = true or p.is_delegate_admin = true)
    )
  );
