import { NextResponse } from 'next/server';
import { createSupabaseAdmin, isAdmin } from '@/lib/supabase-server';
import { forgeOne } from '@/lib/hisoka/aam/run';
import { promises as fs } from 'node:fs';

export const runtime = 'nodejs';
export const maxDuration = 300;

const PAUSE_FILE = '/srv/shared/PAUSE_AAM';

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  try { await fs.access(PAUSE_FILE); return NextResponse.json({ ok: false, error: 'paused' }, { status: 423 }); } catch { /* not paused, continue */ }

  const body = await req.json().catch(() => ({}));
  const { ideaId } = body as { ideaId?: string };
  const admin = createSupabaseAdmin();

  if (ideaId) {
    const r = await forgeOne({ ideaId, admin });
    return NextResponse.json({ ok: true, result: r });
  }
  const { data } = await admin.from('business_ideas')
    .select('id, autonomy_score').eq('forge_status', 'idle')
    .gte('autonomy_score', 0.75).lte('autonomy_score', 0.89)
    .lt('forge_attempts', 3).order('autonomy_score', { ascending: true }).limit(1);
  if (!data?.length) return NextResponse.json({ ok: false, error: 'empty queue' }, { status: 404 });
  const r = await forgeOne({ ideaId: (data[0] as { id: string }).id, admin });
  return NextResponse.json({ ok: true, result: r });
}
