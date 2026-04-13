-- Compute monitoring + MAX mode state.
-- Single-row table tracking MAX toggle + last ack from Claude.
create table if not exists compute_max_state (
  id              boolean primary key default true check (id = true),
  max_enabled     boolean not null default false,
  enabled_at      timestamptz,
  disabled_at     timestamptz,
  last_claude_ack timestamptz,
  last_counter    numeric not null default 0,
  updated_at      timestamptz not null default now()
);

insert into compute_max_state (id, max_enabled) values (true, false)
on conflict (id) do nothing;

-- Rolling compute samples (one row per minute from the UI poll).
create table if not exists compute_samples (
  id          bigserial primary key,
  captured_at timestamptz not null default now(),
  utilization numeric not null,        -- 0..1, computed on the server
  processes   integer not null,        -- # of node/tsx/agent processes
  load_avg_1m numeric,
  bg_jobs     jsonb,                   -- [{name,status,last_activity}]
  max_enabled boolean not null default false
);

create index if not exists idx_compute_samples_at on compute_samples(captured_at desc);

-- Pending tasks snapshot (populated by /api/compute/max).
create table if not exists compute_max_dispatch (
  id          bigserial primary key,
  dispatched_at timestamptz not null default now(),
  trigger     text not null,           -- 'button' | 'sticky' | 'cron'
  summary     jsonb                    -- {projects:{ofa:N,ftg:N,...}, total}
);
