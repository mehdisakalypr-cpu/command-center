import { NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase-server';
import { pushIdeaToMinato } from '@/lib/hisoka/push-to-minato';

export const runtime = 'nodejs';
export const maxDuration = 60;

const READY_THRESHOLD = 0.92;
const MAX_PER_RUN = 10;

export async function POST(req: Request) {
  const token = req.headers.get('x-cron-secret') ?? req.headers.get('x-cron-token') ?? req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const vercelCron = req.headers.get('x-vercel-cron');
  if (!vercelCron && token !== process.env.CRON_SECRET) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  const admin = createSupabaseAdmin();

  const { data: ideas, error } = await admin
    .from('business_ideas')
    .select('*')
    .gte('autonomy_score', READY_THRESHOLD)
    .is('pushed_to_minato_at', null)
    .order('autonomy_score', { ascending: false })
    .limit(MAX_PER_RUN);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  if (!ideas || ideas.length === 0) {
    return NextResponse.json({ ok: true, pushed: 0, results: [] });
  }

  const results = [];
  for (const idea of ideas) {
    const r = await pushIdeaToMinato(admin, idea as Record<string, unknown>);
    results.push(r);
  }

  return NextResponse.json({
    ok: true,
    pushed: results.filter(r => r.ticket_id && !r.already_queued).length,
    results,
  });
}

export const GET = POST;
