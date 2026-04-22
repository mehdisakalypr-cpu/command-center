import { NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase-server';
import { forgeOne } from '@/lib/hisoka/aam/run';
import { promises as fs } from 'node:fs';

export const runtime = 'nodejs';
export const maxDuration = 300;

const PAUSE_FILE = '/srv/shared/PAUSE_AAM';
const MAX_PER_RUN = 5;
const DAILY_BUDGET_EUR = 0.50;

export async function POST(req: Request) {
  const token = req.headers.get('x-cron-token');
  if (token !== process.env.CRON_SECRET) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  try { await fs.access(PAUSE_FILE); return NextResponse.json({ ok: false, paused: true }); } catch { /* not paused */ }

  const admin = createSupabaseAdmin();
  const { data: costRows } = await admin.from('automation_upgrades').select('cost_eur').gte('started_at', new Date(Date.now()-86400_000).toISOString());
  const costToday = (costRows ?? []).reduce((s, r) => s + Number((r as { cost_eur?: number }).cost_eur ?? 0), 0);
  if (costToday >= DAILY_BUDGET_EUR) return NextResponse.json({ ok: false, reason: 'daily budget reached', cost_today: costToday });

  const { data: queue } = await admin.from('business_ideas').select('id').eq('forge_status','idle').gte('autonomy_score',0.75).lte('autonomy_score',0.89).lt('forge_attempts',3).order('autonomy_score',{ascending:true}).limit(MAX_PER_RUN);
  const results: Array<{ idea_id: string; verdict: string; cost: number }> = [];
  for (const row of (queue ?? [])) {
    const r = await forgeOne({ ideaId: (row as { id: string }).id, admin });
    results.push({ idea_id: r.idea_id, verdict: r.verdict, cost: r.cost_eur });
    const sum = results.reduce((s, x) => s + Number(x.cost ?? 0), 0);
    if (costToday + sum >= DAILY_BUDGET_EUR) break;
  }
  return NextResponse.json({ ok: true, processed: results.length, results });
}
