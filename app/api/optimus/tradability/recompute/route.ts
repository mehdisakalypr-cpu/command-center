import { NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase-server';
import { computeTradability, type Candle, type TradabilityParams } from '@/lib/optimus/tradability';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const TF_TO_SECONDS: Record<string, number> = {
  '1s': 1, '5s': 5, '15s': 15,
  '1m': 60, '5m': 300, '15m': 900,
  '1h': 3600, '4h': 14400, '1d': 86400,
};

type VenueRow = { id: string };
type SymbolRow = { venue_id: string; symbol: string };

type Body = {
  timeframes?: string[];
  lookback?: number;
  /** override coûts par venue (bps) — sinon defaults raisonnables. */
  round_trip_cost_bps_by_venue?: Record<string, number>;
  /** taille d'ordre typique en USD — pour volume capacity. */
  bot_order_size_usd?: number;
  /** latence tick-to-fill du bot en secondes. */
  bot_tick_to_fill_sec?: number;
};

const DEFAULT_COSTS_BPS: Record<string, number> = {
  binance: 10,       // 2bps spread + 4bps fee×2 = 10bps ~
  bybit: 12,
  hyperliquid: 8,    // fees 0.015%+0.045% = 6bps + spread ~2bps
  alpaca: 5,         // pas de fee sur stocks US
};

export async function POST(req: Request) {
  const secret = process.env.OPTIMUS_CRON_SECRET;
  const provided = req.headers.get('x-cron-secret');
  if (!secret || provided !== secret) {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  }

  const body = ((await req.json().catch(() => ({}))) || {}) as Body;
  const timeframes = body.timeframes ?? ['1m', '5m', '15m', '1h'];
  const lookback = Math.max(30, Math.min(5000, body.lookback ?? 1000));
  const botOrderSizeUsd = body.bot_order_size_usd ?? 500;
  const botTickToFillSec = body.bot_tick_to_fill_sec ?? 2.5;
  const costOverrides = body.round_trip_cost_bps_by_venue ?? {};

  const admin = createSupabaseAdmin();

  const [{ data: venues }, { data: symbols }] = await Promise.all([
    admin.from('optimus_venues').select('id').eq('active', true) as unknown as Promise<{ data: VenueRow[] | null }>,
    admin.from('optimus_symbols').select('venue_id, symbol').eq('active', true) as unknown as Promise<{ data: SymbolRow[] | null }>,
  ]);

  if (!venues?.length || !symbols?.length) {
    return NextResponse.json({ ok: true, scanned: 0, note: 'no active venues or symbols yet' });
  }

  let scanned = 0;
  let upserted = 0;
  const errors: Array<{ venue: string; symbol: string; tf: string; error: string }> = [];

  for (const { venue_id, symbol } of symbols) {
    const venueCost = costOverrides[venue_id] ?? DEFAULT_COSTS_BPS[venue_id] ?? 15;

    for (const tf of timeframes) {
      scanned++;
      const { data: rows, error } = await admin
        .from('optimus_candles')
        .select('ts, open, high, low, close, volume')
        .eq('venue_id', venue_id)
        .eq('symbol', symbol)
        .eq('timeframe', tf)
        .order('ts', { ascending: false })
        .limit(lookback);

      if (error) {
        errors.push({ venue: venue_id, symbol, tf, error: error.message });
        continue;
      }

      const candles: Candle[] = (rows ?? [])
        .map((r) => ({ ts: r.ts, open: Number(r.open), high: Number(r.high), low: Number(r.low), close: Number(r.close), volume: Number(r.volume) }))
        .reverse();

      if (candles.length < 30) continue;

      const params: TradabilityParams = {
        roundTripCostBps: venueCost,
        botOrderSizeUsd,
        botTickToFillSec,
        barDurationSec: TF_TO_SECONDS[tf] ?? 60,
      };

      const result = computeTradability(candles, params);

      const { error: upsertErr } = await admin.from('optimus_market_tradability').upsert(
        {
          venue_id,
          symbol,
          timeframe: tf,
          computed_at: new Date().toISOString(),
          lookback_bars: result.lookbackBars,
          avg_range_bps: result.breakdown.avg_range_bps,
          median_range_bps: result.breakdown.median_range_bps,
          round_trip_cost_bps: result.breakdown.round_trip_cost_bps,
          errc: result.breakdown.errc,
          car_pct: result.breakdown.car_pct,
          persistence_pct: result.breakdown.persistence_pct,
          volume_capacity_ratio: result.breakdown.volume_capacity_ratio,
          latency_headroom_x: result.breakdown.latency_headroom_x,
          tradability_score: result.score,
          verdict: result.verdict,
          params: { subscores: result.subscores, bot_order_size_usd: botOrderSizeUsd, bot_tick_to_fill_sec: botTickToFillSec },
        },
        { onConflict: 'venue_id,symbol,timeframe,computed_at' },
      );

      if (upsertErr) {
        errors.push({ venue: venue_id, symbol, tf, error: upsertErr.message });
      } else {
        upserted++;
      }
    }
  }

  return NextResponse.json({
    ok: true,
    scanned,
    upserted,
    errors: errors.slice(0, 20),
    timeframes,
    lookback,
  });
}

export async function GET() {
  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from('optimus_market_tradability_latest')
    .select('venue_id, symbol, timeframe, tradability_score, verdict, car_pct, errc, computed_at')
    .order('tradability_score', { ascending: false })
    .limit(50);
  return NextResponse.json({ ok: true, rows: data ?? [] });
}
