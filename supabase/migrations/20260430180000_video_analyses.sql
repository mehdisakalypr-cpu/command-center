-- Video analyzer — paste a YouTube/TikTok URL, get transcript + AI analysis.
-- Why: faster than terminal yt-dlp+whisper for casual video research.
-- Worker on VPS polls pending rows, runs yt-dlp + Groq Whisper + Claude.

create table if not exists public.video_analyses (
  id          uuid primary key default gen_random_uuid(),
  url         text not null,
  platform    text not null,                          -- youtube | tiktok | other
  status      text not null default 'pending',        -- pending | downloading | transcribing | analyzing | done | failed
  language    text,
  duration_s  int,
  title       text,
  uploader    text,
  transcript  text,
  analysis    jsonb,
  error       text,
  user_prompt text,                                   -- optional custom analysis angle from user
  cost_eur    numeric(10,6),
  created_at  timestamptz not null default now(),
  started_at  timestamptz,
  finished_at timestamptz,
  created_by  uuid references auth.users(id) on delete set null
);

create index if not exists video_analyses_status_idx
  on public.video_analyses (status, created_at)
  where status in ('pending', 'downloading', 'transcribing', 'analyzing');

create index if not exists video_analyses_created_idx
  on public.video_analyses (created_at desc);

alter table public.video_analyses enable row level security;

-- Service role only (worker reads/writes all). UI uses service-role via server route.
create policy "service_role_all" on public.video_analyses
  for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
