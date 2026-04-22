-- Phase 7a — central businesses registry.
-- Every business launched (hisoka-promoted idea, ftg, ofa, estate, etc.) gets
-- one row here. Other admin sections (CRM, campaigns, simulator, ki-sense,
-- security) pivot on business_id from this table.

begin;

create table if not exists public.businesses (
  id              uuid primary key default gen_random_uuid(),
  slug            text unique not null,
  name            text not null,
  source          text not null check (source in (
    'hisoka','ftg','ofa','estate','shiftdynamics','gapup','manual'
  )),
  origin_idea_id  uuid references public.business_ideas(id) on delete set null,
  status          text not null default 'active' check (status in (
    'active','paused','archived'
  )),
  -- null => public landing served at {slug}.gapup.io (wildcard fallback)
  domain          text,
  -- {framework, llc_id, stripe_account_id, monthly_mrr, ...}
  stack           jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create unique index if not exists uniq_businesses_domain
  on public.businesses(domain) where domain is not null;
create index if not exists idx_businesses_status on public.businesses(status);
create index if not exists idx_businesses_source on public.businesses(source);
create index if not exists idx_businesses_origin on public.businesses(origin_idea_id);

alter table public.businesses enable row level security;

drop policy if exists "admin all businesses" on public.businesses;
create policy "admin all businesses" on public.businesses
  for all using (
    exists (select 1 from public.profiles
            where profiles.id = auth.uid() and profiles.is_admin = true)
  );

-- Public can read active businesses (used by landing/CRM magic-link flows to
-- resolve slug → name). No sensitive columns exposed at this layer.
drop policy if exists "public read active businesses" on public.businesses;
create policy "public read active businesses" on public.businesses
  for select using (status = 'active');

-- updated_at auto-touch
create or replace function public.touch_businesses_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_businesses_updated_at on public.businesses;
create trigger trg_businesses_updated_at
  before update on public.businesses
  for each row execute function public.touch_businesses_updated_at();

-- Auto-register a business row when a hisoka idea is promoted.
-- Idempotent: skip if a business already points to this idea.
create or replace function public.register_business_from_promoted_idea()
returns trigger language plpgsql as $$
begin
  if new.forge_status = 'promoted'
     and (old.forge_status is distinct from 'promoted')
     and new.slug is not null then
    insert into public.businesses (slug, name, source, origin_idea_id, stack)
    values (
      new.slug,
      coalesce(new.name, new.slug),
      'hisoka',
      new.id,
      jsonb_build_object(
        'origin', 'hisoka_promoted',
        'promoted_at', now()
      )
    )
    on conflict (slug) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_register_business_from_promoted on public.business_ideas;
create trigger trg_register_business_from_promoted
  after update on public.business_ideas
  for each row execute function public.register_business_from_promoted_idea();

-- Backfill: existing promoted ideas → businesses.
insert into public.businesses (slug, name, source, origin_idea_id, stack)
select
  bi.slug,
  coalesce(bi.name, bi.slug),
  'hisoka',
  bi.id,
  jsonb_build_object('origin','hisoka_backfill')
from public.business_ideas bi
where bi.forge_status = 'promoted'
  and bi.slug is not null
  and not exists (
    select 1 from public.businesses b where b.origin_idea_id = bi.id
  )
on conflict (slug) do nothing;

-- Backfill manual seeds for umbrella businesses (pilot phase).
insert into public.businesses (slug, name, source, stack) values
  ('ftg',              'Feel The Gap',     'ftg',  '{"domain":"feelthegap.com"}'::jsonb),
  ('ofa',              'One For All',      'ofa',  '{"domain":"ofaops.xyz"}'::jsonb),
  ('estate',           'The Estate',       'estate','{}'::jsonb),
  ('shift-dynamics',   'Shift Dynamics',   'shiftdynamics','{}'::jsonb),
  ('gapup',            'Gapup',            'gapup','{"domain":"gapup.io"}'::jsonb)
on conflict (slug) do nothing;

commit;
