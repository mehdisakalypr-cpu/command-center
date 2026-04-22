-- Track when a Hisoka business idea has been pushed into Minato's execution queue.
-- Allows UI to show "already queued" badge and prevents duplicate pushes.

begin;

alter table public.business_ideas
  add column if not exists pushed_to_minato_at timestamptz,
  add column if not exists minato_ticket_id    uuid;

create index if not exists idx_biz_ideas_pushed
  on public.business_ideas(pushed_to_minato_at)
  where pushed_to_minato_at is not null;

commit;
