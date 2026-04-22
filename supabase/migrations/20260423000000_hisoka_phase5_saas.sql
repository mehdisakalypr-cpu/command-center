-- Hisoka Phase 5 — SaaS bridge. Landing content + waitlist.
-- Closes the loop: Minato ticket (queued, project=hisoka) → public landing
-- under /saas/[slug] + waitlist. LLC-safe (no billing yet).

begin;

alter table public.business_ideas
  add column if not exists landing_content      jsonb,
  add column if not exists deployed_url         text,
  add column if not exists landing_rendered_at  timestamptz;

create index if not exists idx_biz_ideas_deployed
  on public.business_ideas(deployed_url)
  where deployed_url is not null;

-- Slug must be unique for public routing (prevents route collisions).
create unique index if not exists uniq_biz_ideas_slug
  on public.business_ideas(slug)
  where slug is not null;

create table if not exists public.saas_waitlist (
  id           uuid primary key default gen_random_uuid(),
  idea_slug    text not null,
  email        text not null,
  source       text,
  user_agent   text,
  ip_hash      text,
  created_at   timestamptz not null default now(),
  unique (idea_slug, email)
);

create index if not exists idx_waitlist_slug_created
  on public.saas_waitlist(idea_slug, created_at desc);

alter table public.saas_waitlist enable row level security;

-- Admin-only read. Inserts go through service-role API route, not direct client.
drop policy if exists "admin read waitlist" on public.saas_waitlist;
create policy "admin read waitlist" on public.saas_waitlist
  for select using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.is_admin = true
    )
  );

-- Public read of published business_ideas (landing_content not null implies live).
alter table public.business_ideas enable row level security;
drop policy if exists "public read published ideas" on public.business_ideas;
create policy "public read published ideas" on public.business_ideas
  for select using (landing_content is not null);

commit;
