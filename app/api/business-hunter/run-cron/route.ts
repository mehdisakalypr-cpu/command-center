import { NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase-server';
import { runDiscovery } from '@/lib/hisoka/pipeline';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(req: Request) {
  const token = req.headers.get('x-cron-secret') ?? req.headers.get('x-cron-token') ?? req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const vercelCron = req.headers.get('x-vercel-cron');
  if (!vercelCron && token !== process.env.CRON_SECRET) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  try {
    const admin = createSupabaseAdmin();
    const result = await runDiscovery(admin, { trigger: 'cron' });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e).slice(0, 500) }, { status: 500 });
  }
}

export const GET = POST;
