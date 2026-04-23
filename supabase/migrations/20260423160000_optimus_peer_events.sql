-- Optimus peer event bus — optional DB audit mirror.
-- The in-process PeerSignalBus remains the runtime source of truth. This
-- table is WRITE-ONLY from the bot side and exists for:
--   1. Post-mortem analysis (why did bot2 enter right after bot1 stop?)
--   2. Cross-restart visibility (a fresh process can replay recent history)
--   3. Admin UI (/admin/hisoka/optimus can show peer cascade timeline)
-- No delivery guarantees — if a write fails, the in-process decision stands.

create table if not exists optimus_peer_events (
  id bigserial primary key,
  bot_id text not null,
  kind text not null check (kind in (
    'entry','exit','stop_hit','drawdown_warn','pnl_delta','regime_vote'
  )),
  side smallint not null check (side in (-1, 0, 1)),
  ts timestamptz not null,
  pnl_bps numeric not null default 0,
  regime_at_event text,
  meta jsonb not null default '{}'::jsonb,
  ingested_at timestamptz not null default now()
);

create index if not exists optimus_peer_events_ts_idx
  on optimus_peer_events (ts desc);

create index if not exists optimus_peer_events_kind_idx
  on optimus_peer_events (kind, ts desc);

create index if not exists optimus_peer_events_bot_idx
  on optimus_peer_events (bot_id, ts desc);

-- Recent stop_hit + regime_vote view — consumed by /admin/hisoka/optimus.
create or replace view optimus_peer_events_recent as
select id, bot_id, kind, side, ts, pnl_bps, regime_at_event, meta
from optimus_peer_events
where ts >= now() - interval '24 hours'
  and kind in ('stop_hit', 'regime_vote', 'drawdown_warn')
order by ts desc
limit 500;

comment on table optimus_peer_events is
  'Audit mirror of the in-process PeerSignalBus. Write-only from bots; the runtime bus stays authoritative.';
