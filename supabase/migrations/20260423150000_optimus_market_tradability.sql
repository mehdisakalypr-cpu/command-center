-- Optimus — filtre tradabilité pré-trade.
-- Répond au risque : "bougies trop courtes / marchés inadaptés" (≠ stop-loss post-trade).
-- Additive sur trading_core + kill_switch.

-- 1. Seuil dur au niveau stratégie.
alter table optimus_strategies
  add column if not exists min_tradability_score numeric not null default 60
    check (min_tradability_score >= 0 and min_tradability_score <= 100);

-- 2. Table des scores tradabilité par (venue, symbol, timeframe, snapshot).
create table if not exists optimus_market_tradability (
  venue_id text not null references optimus_venues(id) on delete cascade,
  symbol text not null,
  timeframe text not null check (timeframe in ('1s', '5s', '15s', '1m', '5m', '15m', '1h', '4h', '1d')),
  computed_at timestamptz not null default now(),

  -- métriques brutes (lookback 1000 bougies par défaut)
  lookback_bars int not null,
  avg_range_bps numeric not null,              -- (high-low)/close * 10000, moyen
  median_range_bps numeric,
  round_trip_cost_bps numeric not null,        -- spread + 2*fee + slippage_model
  errc numeric not null,                       -- avg_range_bps / round_trip_cost_bps
  car_pct numeric not null,                    -- % bougies avec range >= 2*cost
  persistence_pct numeric,                     -- P(direction N+1 = signal N), null si pas calculé
  volume_capacity_ratio numeric,               -- vol_usd_moyen / bot_order_size_usd
  latency_headroom_x numeric,                  -- bar_duration_s / bot_tick_to_fill_s

  -- score composite + verdict
  tradability_score numeric not null check (tradability_score >= 0 and tradability_score <= 100),
  verdict text not null check (verdict in ('tradable', 'marginal', 'untradable')),

  -- params du calcul (reproductibilité)
  params jsonb not null default '{}'::jsonb,

  primary key (venue_id, symbol, timeframe, computed_at)
);

create index if not exists optimus_market_tradability_latest_idx
  on optimus_market_tradability (venue_id, symbol, timeframe, computed_at desc);

create index if not exists optimus_market_tradability_tradable_idx
  on optimus_market_tradability (tradability_score desc, computed_at desc)
  where verdict = 'tradable';

-- 3. Vue : dernier score par (venue, symbol, timeframe).
create or replace view optimus_market_tradability_latest as
select distinct on (venue_id, symbol, timeframe)
  venue_id, symbol, timeframe, computed_at,
  avg_range_bps, round_trip_cost_bps, errc, car_pct,
  persistence_pct, volume_capacity_ratio, latency_headroom_x,
  tradability_score, verdict, lookback_bars, params
from optimus_market_tradability
order by venue_id, symbol, timeframe, computed_at desc;

comment on view optimus_market_tradability_latest is
  'Snapshot le plus récent du score tradabilité par (venue, symbol, timeframe). À consommer par le strategy engine avant d''accepter un signal.';
