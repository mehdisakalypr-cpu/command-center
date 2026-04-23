import { NextResponse } from 'next/server';
import { createSupabaseAdmin, isAdmin } from '@/lib/supabase-server';

export const runtime = 'nodejs';

type ProgressBody = {
  progress_pct?: number;
  event_type?: string;
  message?: string;
  commit_sha?: string;
  worker_id?: string;
  meta?: Record<string, unknown>;
};

const VALID_EVENTS = ['commit', 'checkpoint', 'blocked', 'unblocked', 'gate_hit', 'shipped', 'minato_scan', 'cron_tick', 'started', 'paused'];

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const cronSecret = req.headers.get('x-cron-secret');
  const authOk = cronSecret === process.env.CRON_SECRET || (await isAdmin());
  if (!authOk) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const { id } = await ctx.params;
  let body: ProgressBody;
  try {
    body = (await req.json()) as ProgressBody;
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }

  const event_type = body.event_type ?? 'checkpoint';
  if (!VALID_EVENTS.includes(event_type)) {
    return NextResponse.json({ error: `event_type must be one of ${VALID_EVENTS.join(',')}` }, { status: 400 });
  }
  const progress_pct = typeof body.progress_pct === 'number' ? Math.max(0, Math.min(100, body.progress_pct)) : null;

  const admin = createSupabaseAdmin();

  const { error: evErr } = await admin.from('hisoka_build_events').insert({
    idea_id: id,
    event_type,
    progress_pct,
    message: body.message ?? null,
    commit_sha: body.commit_sha ?? null,
    worker_id: body.worker_id ?? null,
    meta: body.meta ?? null,
  });
  if (evErr) return NextResponse.json({ error: evErr.message }, { status: 500 });

  const update: Record<string, unknown> = {};
  if (progress_pct !== null) update.progress_pct = progress_pct;
  if (event_type === 'commit' && body.commit_sha) {
    update.last_commit_sha = body.commit_sha;
    update.last_commit_at = new Date().toISOString();
  }
  if (event_type === 'started') update.started_at = new Date().toISOString();
  if (event_type === 'shipped') {
    update.shipped_at = new Date().toISOString();
    update.status = 'shipped';
    update.progress_pct = 100;
  }
  if (event_type === 'blocked') update.status = 'blocked';
  if (event_type === 'unblocked') update.status = 'in_progress';
  if (body.worker_id) update.worker_id = body.worker_id;

  if (Object.keys(update).length > 0) {
    const { error: upErr } = await admin.from('business_ideas').update(update).eq('id', id);
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
