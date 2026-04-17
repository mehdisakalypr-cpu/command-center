-- Geographic pricing multiplier table (PPP-adjusted per-country)
-- Feeds Stripe price_id generator and in-app pricing display.
-- Seeded by scripts/build-country-pricing.ts (see docs/country-pricing.md)

create table if not exists country_pricing_multiplier (
  iso2 text primary key,
  iso3 text not null,
  name text not null,
  currency text not null,
  multiplier numeric(4, 2) not null check (multiplier between 0.15 and 1.25),
  zone_fallback text not null default 'T2' check (zone_fallback in ('T1', 'T2', 'T3', 'T4')),
  source_weights jsonb not null default '{"wb":0.35,"bm":0.25,"numbeo":0.20,"imf":0.20}'::jsonb,
  components jsonb,
  computed_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_country_pricing_multiplier_iso3 on country_pricing_multiplier(iso3);
create index if not exists idx_country_pricing_multiplier_zone on country_pricing_multiplier(zone_fallback);

-- Derive zone_fallback from multiplier bucket (used when iso2 lookup misses)
create or replace function country_pricing_zone_for(m numeric) returns text as $$
  select case
    when m >= 1.00 then 'T1'
    when m >= 0.70 then 'T2'
    when m >= 0.40 then 'T3'
    else 'T4'
  end
$$ language sql immutable;

-- Auto-populate zone_fallback on insert/update
create or replace function country_pricing_set_zone() returns trigger as $$
begin
  new.zone_fallback := country_pricing_zone_for(new.multiplier);
  new.updated_at := now();
  return new;
end $$ language plpgsql;

drop trigger if exists trg_country_pricing_set_zone on country_pricing_multiplier;
create trigger trg_country_pricing_set_zone
  before insert or update on country_pricing_multiplier
  for each row execute function country_pricing_set_zone();

-- Row-level security: read-only public, write restricted to service role
alter table country_pricing_multiplier enable row level security;

drop policy if exists country_pricing_read_all on country_pricing_multiplier;
create policy country_pricing_read_all on country_pricing_multiplier
  for select using (true);

drop policy if exists country_pricing_write_service on country_pricing_multiplier;
create policy country_pricing_write_service on country_pricing_multiplier
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

comment on table country_pricing_multiplier is
  'PPP-adjusted pricing multipliers per country (US=1.00). Seed + quarterly refresh via scripts/build-country-pricing.ts.';
comment on column country_pricing_multiplier.multiplier is
  'Weighted average of World Bank PPP (35%), Big Mac Index (25%), Numbeo CoL (20%), IMF GDP/cap PPP (20%), clamped 0.15–1.25, rounded to 0.05.';
comment on column country_pricing_multiplier.zone_fallback is
  'T1 (≥1.00), T2 (0.70–0.99), T3 (0.40–0.69), T4 (<0.40). Used when an ISO2 lookup misses (e.g. disputed territories).';
