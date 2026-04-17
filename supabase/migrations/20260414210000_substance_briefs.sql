-- Substance briefs cache (5 questions canoniques répondues depuis top-5 concurrents)
-- Extrait des vidéos YouTube 2026-04-14 (Jack Roberts / Relume) : avant de générer,
-- confronter aux top 5 de la niche pour obtenir : visitor, 1 action, objections, vibe, brand.

create table if not exists substance_briefs (
  id uuid primary key default gen_random_uuid(),
  archetype_code text not null,
  city_slug text not null,
  -- brief shape : { visitor, action, objections, vibe, brand_assets }
  brief jsonb not null,
  sources text[] not null default '{}',
  source_count int not null default 0,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days'),
  constraint substance_briefs_key unique (archetype_code, city_slug)
);
create index if not exists substance_briefs_expires_idx on substance_briefs (expires_at);
