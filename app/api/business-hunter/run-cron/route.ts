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
    const url = new URL(req.url);
    const countParam = Number(url.searchParams.get('count'));
    const countTarget = Number.isFinite(countParam) && countParam > 0 ? Math.min(countParam, 30) : 5;
    const vertical = url.searchParams.get('vertical') ?? undefined;
    const admin = createSupabaseAdmin();
    const result = await runDiscovery(admin, { trigger: 'cron', countTarget, vertical });
    return NextResponse.json({ ok: true, countTarget, vertical: vertical ?? null, ...result });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e).slice(0, 500) }, { status: 500 });
  }
}

export const GET = POST;
