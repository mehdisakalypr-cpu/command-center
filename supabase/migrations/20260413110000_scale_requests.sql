-- Scale-request queue: Vercel writes requests, VPS cron picks them up and runs.
create table if not exists scale_requests (
  id          bigserial primary key,
  requested_at timestamptz not null default now(),
  agent       text not null,       -- e.g. 'ofa:scout-osm'
  instances   integer not null default 1,
  args        text,                -- extra CLI args passed as-is
  status      text not null default 'pending' check (status in ('pending','spawning','active','partial','done','err')),
  spawned_at  timestamptz,
  pids        integer[],
  alive_pids  integer[],
  log_paths   text[],
  last_checked_at timestamptz,
  error_msg   text,
  requester   text,                -- 'ui', 'watchdog', 'cron'
  strategy    text                 -- 'free', 'fixed', 'hybrid' or null
);
create index if not exists idx_scale_requests_status on scale_requests(status, requested_at);
