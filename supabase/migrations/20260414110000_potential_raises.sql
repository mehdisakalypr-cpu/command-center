-- Infinite Tsukuyomi ledger — chaque action C3 (potential raise) loggée avec delta mesurable.
-- Permet de prouver que l'overshoot ne tourne pas dans le vide : chaque cycle pointe un asset compound.
create table if not exists potential_raises (
  id            bigserial primary key,
  raised_at     timestamptz not null default now(),
  layer         text not null default 'C3' check (layer in ('C2','C3')),
  kind          text not null,                -- tam_expand | conv_upstream | pricing_options | data_moat | infra_scale_ready | quality_top1 | partnerships | organic_content | scout_amplify | regen_quality | outreach_multi | lp_geo_extra | competitor_watch
  agent         text,                         -- NAMI | KURAMA | BEERUS | SHIKAMARU | …
  trigger_source text not null default 'tsukuyomi_potential_raise' check (trigger_source in ('overshoot_autonomous','tsukuyomi_potential_raise','manual')),
  -- Delta mesurable : au moins un de ces champs doit être non-null
  delta_tam     integer,                      -- nouveaux leads accessibles (TAM units)
  delta_conv_bps integer,                     -- delta conversion en basis points (100 bps = 1%)
  delta_pricing_options integer,              -- nb nouveaux tiers/bundles/add-ons
  delta_leads   integer,                      -- leads ajoutés (scout amplify)
  delta_sites   integer,                      -- sites regen/publish
  delta_lp      integer,                      -- LP GEO produites
  mrr_ceiling_estimate_eur numeric,           -- plafond MRR estimé après l'action
  cost_eur      numeric not null default 0,   -- coût réel (0 si T0)
  notes         text
);

create index if not exists idx_potential_raises_at on potential_raises(raised_at desc);
create index if not exists idx_potential_raises_layer on potential_raises(layer, raised_at desc);
create index if not exists idx_potential_raises_kind on potential_raises(kind);

-- Budget mensuel : vue rapide pour le circuit breaker.
create or replace view potential_raises_monthly_cost as
select
  date_trunc('month', raised_at)::date as month,
  sum(cost_eur) as total_cost_eur,
  count(*) as actions
from potential_raises
group by 1
order by 1 desc;
