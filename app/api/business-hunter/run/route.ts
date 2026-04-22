import { NextResponse } from 'next/server';
import { createSupabaseAdmin, isAdmin } from '@/lib/supabase-server';
import { runDiscovery } from '@/lib/hisoka/pipeline';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 min max for LLM call

export async function POST() {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, error: 'admin only' }, { status: 403 });
  }
  try {
    const admin = createSupabaseAdmin();
    const result = await runDiscovery(admin, { trigger: 'manual' });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e).slice(0, 500) }, { status: 500 });
  }
}
