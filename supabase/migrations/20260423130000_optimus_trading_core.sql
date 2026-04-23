-- Optimus trading bot — core schema.
-- Inspiré des recos docs/hisoka-ideas/optimus-ml-stack.md + optimus-research(-v2).md.
-- TimescaleDB si dispo (hypertable sur optimus_candles) ; fallback index B-tree + partitioning manuel sinon.
-- Migration idempotente. L'extension timescaledb est demandée en soft try — pas de fail si absent.

do $$
begin
  if not exists (select 1 from pg_extension where extname = 'timescaledb') then
    begin
      create extension if not exists timescaledb cascade;
    exception when others then
      raise notice 'timescaledb extension unavailable — falling back to vanilla indexes';
    end;
  end if;
end $$;

-- 1. Venues connues (Binance, Hyperliquid, Bybit, Alpaca, …).
create table if not exists optimus_venues (
  id text primary key,
  display_name text not null,
  venue_type text not null check (venue_type in ('crypto_cex', 'crypto_dex_perp', 'stocks', 'fx', 'options')),
  requires_kyc_trade boolean not null default true,
  data_ws_url text,
  exec_api_url text,
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now()
);

insert into optimus_venues (id, display_name, venue_type, requires_kyc_trade, data_ws_url, notes, active)
values
  ('binance', 'Binance', 'crypto_cex', true, 'wss://stream.binance.com:9443', 'WS public lecture sans KYC — KYC requis pour trade', true),
  ('bybit', 'Bybit', 'crypto_cex', true, 'wss://stream.bybit.com/v5/public', 'WS public lecture sans KYC — KYC requis pour trade', true),
  ('hyperliquid', 'Hyperliquid', 'crypto_dex_perp', false, 'wss://api.hyperliquid.xyz/ws', 'No-KYC wallet, 0.2s finality, data+exec même venue', true),
  ('alpaca', 'Alpaca', 'stocks', true, 'wss://stream.data.alpaca.markets/v2', 'Stocks/crypto US, KYC exec requis', true)
on conflict (id) do update set
  display_name = excluded.display_name,
  venue_type = excluded.venue_type,
  data_ws_url = excluded.data_ws_url,
  notes = excluded.notes,
  active = excluded.active;

-- 2. Univers tradable (paires × timeframes suivies pour Optimus).
create table if not exists optimus_symbols (
  id bigserial primary key,
  venue_id text not null references optimus_venues(id) on delete cascade,
  symbol text not null,
  asset_type text not null check (asset_type in ('spot', 'perp', 'future', 'option', 'stock')),
  base text,
  quote text,
  min_tick numeric,
  tick_precision int,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (venue_id, symbol, asset_type)
);

create index if not exists optimus_symbols_venue_idx on optimus_symbols (venue_id) where active;

-- 3. Bougies OHLCV — table de fait principale.
-- Key (venue, symbol, timeframe, ts) unique.
create table if not exists optimus_candles (
  venue_id text not null references optimus_venues(id) on delete cascade,
  symbol text not null,
  timeframe text not null check (timeframe in ('1s', '5s', '15s', '1m', '5m', '15m', '1h', '4h', '1d')),
  ts timestamptz not null,
  open numeric not null,
  high numeric not null,
  low numeric not null,
  close numeric not null,
  volume numeric not null default 0,
  trade_count int,
  vwap numeric,
  ingested_at timestamptz not null default now(),
  primary key (venue_id, symbol, timeframe, ts)
);

create index if not exists optimus_candles_ts_idx on optimus_candles (ts desc);
create index if not exists optimus_candles_symbol_tf_ts_idx on optimus_candles (venue_id, symbol, timeframe, ts desc);

do $$
begin
  if exists (select 1 from pg_extension where extname = 'timescaledb') then
    begin
      perform create_hypertable('optimus_candles', 'ts', if_not_exists => true, chunk_time_interval => interval '1 day');
      perform add_retention_policy('optimus_candles', interval '3 years', if_not_exists => true);
    exception when others then
      raise notice 'hypertable setup skipped: %', sqlerrm;
    end;
  end if;
end $$;

-- 4. Gap tracking — pour couverture 100% temps réel (feedback user explicite).
-- Alimenté par un worker de reconciliation (compare ts attendus vs reçus).
create table if not exists optimus_ingest_gaps (
  id bigserial primary key,
  venue_id text not null references optimus_venues(id) on delete cascade,
  symbol text not null,
  timeframe text not null,
  gap_start timestamptz not null,
  gap_end timestamptz not null,
  expected_count int not null,
  received_count int not null,
  detected_at timestamptz not null default now(),
  filled_at timestamptz,
  fill_source text check (fill_source in ('rest_backfill', 'third_party', 'manual')),
  notes text
);

create index if not exists optimus_ingest_gaps_unfilled_idx on optimus_ingest_gaps (detected_at desc) where filled_at is null;

-- 5. Stratégies (chaque worker NautilusTrader correspond à une stratégie).
create table if not exists optimus_strategies (
  id text primary key,
  display_name text not null,
  regime_filter text,
  timeframe text not null,
  universe_query jsonb not null default '{}'::jsonb,
  params jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'paper', 'live', 'paused', 'killed')),
  kelly_fraction numeric not null default 0.25 check (kelly_fraction > 0 and kelly_fraction <= 1),
  vol_target_pct numeric not null default 10 check (vol_target_pct > 0 and vol_target_pct <= 100),
  drawdown_cap_pct numeric not null default 15,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 6. Positions et ordres (mirror local de ce que chaque venue expose).
create table if not exists optimus_orders (
  id bigserial primary key,
  strategy_id text references optimus_strategies(id) on delete set null,
  venue_id text not null references optimus_venues(id) on delete cascade,
  symbol text not null,
  side text not null check (side in ('buy', 'sell')),
  order_type text not null check (order_type in ('market', 'limit', 'stop', 'stop_limit')),
  qty numeric not null,
  price numeric,
  status text not null default 'pending' check (status in ('pending', 'open', 'filled', 'partial', 'canceled', 'rejected')),
  venue_order_id text,
  filled_qty numeric not null default 0,
  filled_avg_price numeric,
  submitted_at timestamptz not null default now(),
  filled_at timestamptz,
  canceled_at timestamptz,
  error_message text,
  is_paper boolean not null default true
);

create index if not exists optimus_orders_strategy_idx on optimus_orders (strategy_id, submitted_at desc);
create index if not exists optimus_orders_open_idx on optimus_orders (status) where status in ('pending', 'open', 'partial');

-- 7. Backtest runs.
create table if not exists optimus_backtests (
  id bigserial primary key,
  strategy_id text references optimus_strategies(id) on delete set null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  bar_range tstzrange not null,
  symbols text[] not null,
  timeframe text not null,
  params jsonb not null default '{}'::jsonb,
  metrics jsonb,
  report_html_path text,
  status text not null default 'running' check (status in ('running', 'done', 'failed'))
);

create index if not exists optimus_backtests_strategy_idx on optimus_backtests (strategy_id, started_at desc);
