import { NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase-server';

export const runtime = 'nodejs';

export async function GET() {
  const admin = createSupabaseAdmin();
  const [ideasR, modeR, eventsR] = await Promise.all([
    admin
      .from('business_ideas')
      .select(
        'id, rank, name, tagline, score, status, progress_pct, estimate_days_min, estimate_days_max, estimate_confidence, started_at, shipped_at, blocked_reason, worker_id, last_commit_sha, last_commit_at, hours_reuse, days_new_code, critical_path, human_gates, reuse_bricks, mrr_median, deployed_url',
      )
      .not('rank', 'is', null)
      .order('rank')
      .limit(20),
    admin.from('cc_power_mode').select('*').eq('id', 1).maybeSingle(),
    admin
      .from('hisoka_build_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200),
  ]);

  return NextResponse.json({
    ideas: ideasR.data ?? [],
    power_mode: modeR.data ?? null,
    events: eventsR.data ?? [],
  });
}
