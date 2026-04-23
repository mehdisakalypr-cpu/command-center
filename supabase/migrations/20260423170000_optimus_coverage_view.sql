-- Optimus coverage summary view — fraicheur par venue × symbol × timeframe.
-- Agréger max(ts), count(*), age_seconds depuis optimus_candles.
-- Vue normale (pas matérialisée) : index symbol_tf_ts_idx couvre le GROUP BY.

create or replace view optimus_coverage_summary as
select
  venue_id,
  symbol,
  timeframe,
  max(ts)                                                    as last_ts,
  count(*)::int                                              as row_count,
  extract(epoch from (now() - max(ts)))::int                 as age_seconds
from optimus_candles
group by venue_id, symbol, timeframe;
