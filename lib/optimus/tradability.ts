/**
 * Optimus — scoring tradabilité pré-trade.
 *
 * Entrée : série de bougies OHLCV récentes + params marché/bot.
 * Sortie : { score 0-100, verdict, breakdown par métrique }.
 *
 * Pure function — pas de DB. Le cron recompute appelle celle-ci puis upsert.
 */

export type Candle = {
  ts: string | Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type TradabilityParams = {
  /** Round-trip cost estimé en bps (spread + 2*fee + slippage). */
  roundTripCostBps: number;
  /** Taille d'ordre typique en USD pour tester la capacité volume. */
  botOrderSizeUsd: number;
  /** Latence tick-to-fill du bot en secondes. */
  botTickToFillSec: number;
  /** Durée de la bougie en secondes (1m=60, 15m=900, 1h=3600). */
  barDurationSec: number;
  /** Seuils de verdict (defaults : tradable>=60, marginal>=40). */
  tradableThreshold?: number;
  marginalThreshold?: number;
};

export type Breakdown = {
  avg_range_bps: number;
  median_range_bps: number;
  round_trip_cost_bps: number;
  errc: number;
  car_pct: number;
  persistence_pct: number | null;
  volume_capacity_ratio: number;
  latency_headroom_x: number;
};

export type TradabilityResult = {
  score: number;
  verdict: 'tradable' | 'marginal' | 'untradable';
  lookbackBars: number;
  breakdown: Breakdown;
  subscores: {
    errc: number;
    car: number;
    persistence: number;
    volume: number;
    latency: number;
  };
};

function mean(xs: number[]): number {
  if (xs.length === 0) return 0;
  let sum = 0;
  for (const x of xs) sum += x;
  return sum / xs.length;
}

function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

/**
 * Ramène une métrique [threshold_bad .. threshold_good] à un score 0-100.
 */
function toSubscore(value: number, bad: number, good: number): number {
  if (good === bad) return 50;
  const t = (value - bad) / (good - bad);
  return clamp(t * 100, 0, 100);
}

export function computeTradability(candles: Candle[], params: TradabilityParams): TradabilityResult {
  const {
    roundTripCostBps,
    botOrderSizeUsd,
    botTickToFillSec,
    barDurationSec,
    tradableThreshold = 60,
    marginalThreshold = 40,
  } = params;

  if (candles.length < 30) {
    return degenerate(candles.length, roundTripCostBps, botTickToFillSec, barDurationSec);
  }

  // Ranges en bps (high-low)/close * 10000.
  const ranges: number[] = [];
  const volumesUsd: number[] = [];
  for (const c of candles) {
    if (c.close > 0) ranges.push(((c.high - c.low) / c.close) * 10000);
    volumesUsd.push(c.volume * c.close);
  }

  const avg_range_bps = mean(ranges);
  const median_range_bps = median(ranges);
  const errc = roundTripCostBps > 0 ? avg_range_bps / roundTripCostBps : 0;

  // CAR : % bougies où range >= 2 × cost.
  const actionableCount = ranges.filter((r) => r >= 2 * roundTripCostBps).length;
  const car_pct = (actionableCount / ranges.length) * 100;

  // Persistence : P(direction bar_{n+1} = direction bar_n) sur bougies "signal-quality" (range > median).
  const sigBars = candles.filter((c) => c.close !== c.open).slice(0, -1);
  let sameDir = 0;
  let totalPairs = 0;
  for (let i = 0; i < candles.length - 1; i++) {
    const a = candles[i];
    const b = candles[i + 1];
    if (a.close === a.open) continue;
    totalPairs++;
    const dirA = a.close > a.open ? 1 : -1;
    const dirB = b.close > b.open ? 1 : -1;
    if (dirA === dirB) sameDir++;
  }
  const persistence_pct = totalPairs > 0 ? (sameDir / totalPairs) * 100 : null;

  // Volume capacity : median volume USD / bot order size.
  const medVolUsd = median(volumesUsd);
  const volume_capacity_ratio = botOrderSizeUsd > 0 ? medVolUsd / botOrderSizeUsd : 0;

  // Latency headroom : bar duration / bot tick-to-fill.
  const latency_headroom_x = botTickToFillSec > 0 ? barDurationSec / botTickToFillSec : 9999;

  // Subscores (0-100).
  const subscores = {
    errc: toSubscore(errc, 1, 5),
    car: toSubscore(car_pct, 30, 80),
    persistence: persistence_pct == null ? 50 : toSubscore(persistence_pct, 48, 62),
    volume: toSubscore(volume_capacity_ratio, 10, 200),
    latency: toSubscore(Math.log10(Math.max(latency_headroom_x, 1)), 0.5, 2.5), // log scale : 3x → 0, 300x → 100
  };

  // Score composite pondéré.
  const score =
    0.3 * subscores.errc +
    0.2 * subscores.car +
    0.15 * subscores.persistence +
    0.2 * subscores.volume +
    0.15 * subscores.latency;

  const verdict: 'tradable' | 'marginal' | 'untradable' =
    score >= tradableThreshold ? 'tradable' : score >= marginalThreshold ? 'marginal' : 'untradable';

  return {
    score: Math.round(score * 100) / 100,
    verdict,
    lookbackBars: candles.length,
    breakdown: {
      avg_range_bps: Math.round(avg_range_bps * 100) / 100,
      median_range_bps: Math.round(median_range_bps * 100) / 100,
      round_trip_cost_bps: roundTripCostBps,
      errc: Math.round(errc * 100) / 100,
      car_pct: Math.round(car_pct * 100) / 100,
      persistence_pct: persistence_pct == null ? null : Math.round(persistence_pct * 100) / 100,
      volume_capacity_ratio: Math.round(volume_capacity_ratio * 100) / 100,
      latency_headroom_x: Math.round(latency_headroom_x * 100) / 100,
    },
    subscores: Object.fromEntries(
      Object.entries(subscores).map(([k, v]) => [k, Math.round(v * 100) / 100]),
    ) as TradabilityResult['subscores'],
  };
  void sigBars;
}

function degenerate(
  bars: number,
  rtCost: number,
  botLatency: number,
  barDur: number,
): TradabilityResult {
  return {
    score: 0,
    verdict: 'untradable',
    lookbackBars: bars,
    breakdown: {
      avg_range_bps: 0,
      median_range_bps: 0,
      round_trip_cost_bps: rtCost,
      errc: 0,
      car_pct: 0,
      persistence_pct: null,
      volume_capacity_ratio: 0,
      latency_headroom_x: botLatency > 0 ? barDur / botLatency : 0,
    },
    subscores: { errc: 0, car: 0, persistence: 0, volume: 0, latency: 0 },
  };
}
