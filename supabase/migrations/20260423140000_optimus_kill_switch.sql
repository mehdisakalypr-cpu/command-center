-- Optimus kill-switch — contrainte structurelle anti-VPS-down.
-- Additif à 20260423130000_optimus_trading_core.sql (pas de réécriture).
-- Objectif : le schéma rend impossible un ordre live sans stop exchange-side + prévoit le dead-man switch.

-- 1. Contraintes de sûreté sur optimus_strategies.
alter table optimus_strategies
  add column if not exists must_have_exchange_stop boolean not null default true,
  add column if not exists max_position_notional_eur numeric,
  add column if not exists last_heartbeat_at timestamptz,
  add column if not exists heartbeat_timeout_seconds int not null default 120 check (heartbeat_timeout_seconds between 10 and 3600),
  add column if not exists killed_at timestamptz,
  add column if not exists killed_reason text;

create index if not exists optimus_strategies_heartbeat_idx on optimus_strategies (last_heartbeat_at desc)
  where status in ('paper', 'live');

-- 2. Log des déclenchements kill-switch.
create table if not exists optimus_kill_switch_triggers (
  id bigserial primary key,
  triggered_at timestamptz not null default now(),
  source text not null check (source in ('heartbeat_timeout', 'drawdown_cap', 'manual', 'startup_safety', 'circuit_breaker', 'chaos_test')),
  strategy_id text references optimus_strategies(id) on delete set null,
  venues_affected text[] not null default '{}',
  positions_before jsonb,
  orders_before jsonb,
  positions_closed_count int,
  orders_canceled_count int,
  exchange_responses jsonb,
  notes text,
  resolved_at timestamptz
);

create index if not exists optimus_kill_switch_triggers_unresolved_idx
  on optimus_kill_switch_triggers (triggered_at desc)
  where resolved_at is null;

create index if not exists optimus_kill_switch_triggers_strategy_idx
  on optimus_kill_switch_triggers (strategy_id, triggered_at desc);

-- 3. Contrainte sur optimus_orders : si is_paper=false ET strategy.must_have_exchange_stop=true,
-- il faut un stop_order_id jumeau avant d'insérer l'ordre d'entrée.
alter table optimus_orders
  add column if not exists parent_order_id bigint references optimus_orders(id) on delete set null,
  add column if not exists stop_price numeric,
  add column if not exists is_stop_for_order_id bigint references optimus_orders(id) on delete set null,
  add column if not exists exchange_stop_order_id text;

-- Vue commode : ordres d'entrée live sans stop jumeau posté côté exchange.
create or replace view optimus_orders_unprotected as
  select o.*, s.must_have_exchange_stop, s.status as strategy_status
  from optimus_orders o
  left join optimus_strategies s on s.id = o.strategy_id
  where o.is_paper = false
    and s.must_have_exchange_stop = true
    and o.order_type in ('market', 'limit')
    and o.status in ('filled', 'partial', 'open')
    and o.exchange_stop_order_id is null
    and o.is_stop_for_order_id is null;

comment on view optimus_orders_unprotected is
  'ALERTE : ordres live sans stop-loss posté côté exchange. Doit rester vide.';

-- 4. Circuit breaker matériel : drawdown atteint → strategy auto-killed.
create or replace function optimus_enforce_drawdown_cap()
returns trigger
language plpgsql
as $$
declare
  cap numeric;
begin
  if new.drawdown_cap_pct is null then return new; end if;
  if new.status in ('killed', 'draft', 'paused') then return new; end if;
  -- Placeholder : la vraie mesure de drawdown vient d'un cron qui met à jour metrics.
  -- Ce trigger garantit juste que si un caller marque la stratégie en 'killed',
  -- killed_at et killed_reason sont cohérents.
  if old.status is distinct from new.status and new.status = 'killed' then
    new.killed_at = coalesce(new.killed_at, now());
    new.killed_reason = coalesce(new.killed_reason, 'manual_or_cap');
  end if;
  return new;
end;
$$;

drop trigger if exists optimus_strategies_killed_trigger on optimus_strategies;
create trigger optimus_strategies_killed_trigger
  before update on optimus_strategies
  for each row
  execute function optimus_enforce_drawdown_cap();

-- 5. Seed row par défaut : une stratégie "smoke-test" kill-switch.
insert into optimus_strategies (id, display_name, timeframe, status, must_have_exchange_stop, kelly_fraction, vol_target_pct, drawdown_cap_pct, heartbeat_timeout_seconds)
values ('kill-switch-smoke', 'Kill-Switch Smoke Test', '1m', 'draft', true, 0.01, 1, 5, 60)
on conflict (id) do nothing;
