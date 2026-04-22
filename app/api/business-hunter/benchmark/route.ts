import { NextResponse } from 'next/server';
import { createSupabaseAdmin, isAdmin } from '@/lib/supabase-server';
import { benchmarkIdea } from '@/lib/hisoka/benchmark';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  }
  let payload: { text?: string };
  try {
    payload = await req.json() as { text?: string };
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid JSON' }, { status: 400 });
  }
  const text = (payload.text ?? '').trim();
  if (text.length < 10 || text.length > 500) {
    return NextResponse.json({ ok: false, error: 'text must be 10-500 chars' }, { status: 400 });
  }
  try {
    const admin = createSupabaseAdmin();
    const result = await benchmarkIdea(admin, text);
    return NextResponse.json({ ok: true, result });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e).slice(0, 500) }, { status: 500 });
  }
}
