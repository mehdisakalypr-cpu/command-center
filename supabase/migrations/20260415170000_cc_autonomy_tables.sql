-- CC Autonomy migration: remove VPS fs/exec dependencies.
-- All routes must read these tables instead of reading local files or spawning processes.
-- A VPS cron pushes samples/snapshots here via service role.

-- 1. infra_samples: dashboard/metrics VPS block (free/df/pm2 output) pushed by VPS cron.
create table if not exists infra_samples (
  id            bigserial primary key,
  captured_at   timestamptz not null default now(),
  ram_total_mb  integer,
  ram_used_mb   integer,
  ram_free_mb   integer,
  disk_total    text,
  disk_used     text,
  disk_free     text,
  disk_pct      text,
  pm2_processes jsonb,                  -- [{name,status,memory,restarts}]
  health_tail   text                    -- last 3 lines of /root/monitor/logs/health.log
);
create index if not exists idx_infra_samples_at on infra_samples(captured_at desc);

-- 2. gitnexus_snapshots: snapshot of `gitnexus cypher` overview pushed by VPS cron.
create table if not exists gitnexus_snapshots (
  id           bigserial primary key,
  captured_at  timestamptz not null default now(),
  repos        jsonb not null,          -- full overview array as served by the API
  source       text not null default 'vps-cron'
);
create index if not exists idx_gitnexus_snapshots_at on gitnexus_snapshots(captured_at desc);

-- 3. minato_strategy_logs: tails of scale-request logs pushed by VPS cron so strategy
--    route can surface last tail without readFileSync.
create table if not exists minato_strategy_logs (
  id             bigserial primary key,
  captured_at    timestamptz not null default now(),
  log_path       text not null,
  agent          text,
  scale_req_id   bigint,
  tail           text not null
);
create index if not exists idx_minato_strategy_logs_path_at on minato_strategy_logs(log_path, captured_at desc);
create index if not exists idx_minato_strategy_logs_req on minato_strategy_logs(scale_req_id);

-- 4. remote_action_requests: UI enqueues VPS action (pm2 restart …), cron polls + executes.
create table if not exists remote_action_requests (
  id            bigserial primary key,
  requested_at  timestamptz not null default now(),
  action        text not null,          -- 'restart-ftg' | 'restart-cc' | …
  command       text not null,          -- the shell command to execute on VPS
  status        text not null default 'pending', -- pending | running | done | err
  requested_by  text,
  started_at    timestamptz,
  completed_at  timestamptz,
  stdout        text,
  stderr        text,
  error_msg     text
);
create index if not exists idx_remote_action_requests_status on remote_action_requests(status, requested_at);

-- 5. Ensure compute_samples has the columns the route needs (idempotent — already exists
--    from 20260413090000_compute_max.sql but we allow a VPS push of processes_by_project).
alter table compute_samples add column if not exists processes_by_project jsonb;
alter table compute_samples add column if not exists ram_pct numeric;
alter table compute_samples add column if not exists source text default 'edge';
