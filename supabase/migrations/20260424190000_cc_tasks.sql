-- Command Center tasks — multi-project to-do + test checklist.
-- Consolidates scattered memory lists into one table so the user can tick
-- off tests + tasks from /admin/tasks (covers FTG, OFA, CC, Estate, Shift,
-- Optimus, Hisoka, AAM, and general / cross-cutting work).
--
-- Why a fresh table rather than repurposing an existing one:
--  - `ftg_leads`, `tickets`, etc. are domain-specific with tight schemas
--  - Tasks here are heterogeneous (test/dev/ops/legal/content/marketing)
--  - We want owner split (user vs claude vs shared) for planning

create table if not exists cc_tasks (
  id           uuid primary key default gen_random_uuid(),
  project      text not null check (project in (
    'ftg','ofa','cc','estate','shift','optimus','hisoka','aam','general'
  )),
  category     text not null check (category in (
    'test','dev','ops','legal','content','marketing','design','infra'
  )),
  owner        text not null check (owner in ('user','claude','shared')),
  priority     text not null check (priority in ('critical','high','medium','low')),
  status       text not null default 'pending' check (status in (
    'pending','in_progress','done','blocked'
  )),
  title        text not null,
  description  text,
  url          text,
  platform     text check (platform in ('desktop','mobile','both','api','n/a')) default 'n/a',
  blocked_by   text,
  due_date     date,
  tags         text[] default '{}',
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists idx_cc_tasks_project_status    on cc_tasks (project, status);
create index if not exists idx_cc_tasks_owner_status      on cc_tasks (owner, status);
create index if not exists idx_cc_tasks_category_priority on cc_tasks (category, priority);
create index if not exists idx_cc_tasks_updated           on cc_tasks (updated_at desc);

-- Auto-maintain updated_at + completed_at when status flips to done.
create or replace function cc_tasks_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  if new.status = 'done' and (old is null or old.status <> 'done') then
    new.completed_at := coalesce(new.completed_at, now());
  end if;
  if new.status <> 'done' then
    new.completed_at := null;
  end if;
  return new;
end $$;

drop trigger if exists trg_cc_tasks_touch on cc_tasks;
create trigger trg_cc_tasks_touch
  before update on cc_tasks
  for each row execute function cc_tasks_touch();

comment on table cc_tasks is
  'Command Center unified task tracker: tests + dev + ops + legal across all projects. Surfaced at /admin/tasks.';
