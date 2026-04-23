import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { createSupabaseAdmin } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const maxDuration = 30;
export const dynamic = 'force-dynamic';

const VALID_SOURCES = [
  'heartbeat_timeout',
  'drawdown_cap',
  'manual',
  'startup_safety',
  'circuit_breaker',
  'chaos_test',
] as const;

type Source = (typeof VALID_SOURCES)[number];

type Payload = {
  source: Source;
  strategy_id?: string;
  venues?: string[];
  notes?: string;
  dry_run?: boolean;
};

function timingSafeEqualStr(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

function verifyHmac(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  return timingSafeEqualStr(signature, expected);
}

/**
 * POST /api/optimus/kill-switch
 *
 * Body: { source, strategy_id?, venues?, notes?, dry_run? }
 * Header: x-optimus-signature = HMAC-SHA256(secret, rawBody) hex
 *
 * Appelé par :
 *  - Vercel Cron externe (dead-man switch si VPS heartbeat absent)
 *  - Worker VPS lui-même (startup safety, drawdown cap)
 *  - Button UI manuel
 *
 * Effet :
 *  1. Crée une ligne dans optimus_kill_switch_triggers
 *  2. Met les stratégies concernées en status='killed'
 *  3. Si !dry_run : enverra l'ordre cancel_all aux venues (TODO phase exec)
 */
export async function POST(req: Request) {
  const secret = process.env.OPTIMUS_KILL_SWITCH_SECRET;
  if (!secret) {
    return NextResponse.json({ ok: false, error: 'OPTIMUS_KILL_SWITCH_SECRET missing in env' }, { status: 500 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get('x-optimus-signature');
  if (!verifyHmac(rawBody, signature, secret)) {
    return NextResponse.json({ ok: false, error: 'invalid signature' }, { status: 401 });
  }

  let payload: Payload;
  try {
    payload = JSON.parse(rawBody) as Payload;
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid json body' }, { status: 400 });
  }

  if (!VALID_SOURCES.includes(payload.source)) {
    return NextResponse.json({ ok: false, error: `source must be one of: ${VALID_SOURCES.join(', ')}` }, { status: 400 });
  }

  const admin = createSupabaseAdmin();

  // Snapshot avant kill (positions + ordres ouverts).
  const { data: openOrders } = await admin
    .from('optimus_orders')
    .select('id, strategy_id, venue_id, symbol, side, qty, price, status, venue_order_id, filled_qty')
    .in('status', ['pending', 'open', 'partial']);

  const venuesAffected = payload.venues ?? Array.from(new Set((openOrders ?? []).map((o) => o.venue_id)));

  const { data: trigger, error: triggerErr } = await admin
    .from('optimus_kill_switch_triggers')
    .insert({
      source: payload.source,
      strategy_id: payload.strategy_id ?? null,
      venues_affected: venuesAffected,
      positions_before: null,
      orders_before: openOrders ?? [],
      notes: payload.notes ?? null,
    })
    .select('id, triggered_at')
    .single();

  if (triggerErr || !trigger) {
    return NextResponse.json({ ok: false, error: triggerErr?.message ?? 'insert failed' }, { status: 500 });
  }

  if (payload.dry_run) {
    return NextResponse.json({
      ok: true,
      dry_run: true,
      trigger_id: trigger.id,
      would_cancel_orders: openOrders?.length ?? 0,
      would_affect_venues: venuesAffected,
    });
  }

  // Kill les stratégies concernées (ou toutes si strategy_id absent).
  const killQuery = admin
    .from('optimus_strategies')
    .update({ status: 'killed', killed_at: new Date().toISOString(), killed_reason: payload.source })
    .in('status', ['paper', 'live']);

  if (payload.strategy_id) killQuery.eq('id', payload.strategy_id);

  const { data: killed, error: killErr } = await killQuery.select('id');

  if (killErr) {
    return NextResponse.json({ ok: false, error: killErr.message, trigger_id: trigger.id }, { status: 500 });
  }

  // TODO (phase exec) : appeler ici les API exchange cancel_all + flatten positions.
  // Pour l'instant on marque juste la trigger côté DB — le worker VPS verra le flag au prochain poll et exécutera.
  // Cette approche "DB-as-signal" évite de stocker des secrets exchange dans Vercel.

  return NextResponse.json({
    ok: true,
    trigger_id: trigger.id,
    killed_strategy_ids: (killed ?? []).map((k) => k.id),
    venues_affected: venuesAffected,
    orders_snapshotted: openOrders?.length ?? 0,
    next_step: 'worker VPS doit poller optimus_kill_switch_triggers et exécuter cancel_all + flatten',
  });
}

// Optionnel : GET pour healthcheck + liste des triggers récents (admin only side via middleware).
export async function GET() {
  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from('optimus_kill_switch_triggers')
    .select('id, triggered_at, source, strategy_id, venues_affected, resolved_at, notes')
    .order('triggered_at', { ascending: false })
    .limit(20);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, triggers: data ?? [] });
}
