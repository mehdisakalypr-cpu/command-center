-- YouTube ingest queue + digests (CoLearn v2)
-- Applied 2026-04-14

create table if not exists yt_ingest_queue (
  id uuid primary key default gen_random_uuid(),
  yt_id text unique not null,
  url text not null,
  category text not null default 'site-builder',
  priority int not null default 5,
  status text not null default 'pending',
  -- pending | processing | done | failed | skipped_filter | skipped_dedup

  title text,
  channel text,
  duration_s int,

  captions_source text,    -- 'youtube-auto' | 'youtube-sub' | 'whisper-groq' | null
  filter_verdict text,     -- 'keep' | 'slop' | 'duplicate'
  filter_reason text,
  score numeric,           -- 0..1 quality score
  tldr text,
  digest_path text,
  error text,
  attempts int not null default 0,

  requested_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);

create index if not exists yt_queue_status_prio_idx
  on yt_ingest_queue (status, priority desc, created_at);
create index if not exists yt_queue_category_idx
  on yt_ingest_queue (category);

-- Trigger updated_at
create or replace function yt_queue_touch() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

drop trigger if exists yt_queue_touch_trg on yt_ingest_queue;
create trigger yt_queue_touch_trg before update on yt_ingest_queue
for each row execute function yt_queue_touch();
