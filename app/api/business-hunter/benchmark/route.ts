import { NextResponse } from 'next/server';
import { createSupabaseAdmin, isAdmin } from '@/lib/supabase-server';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, error: 'admin only' }, { status: 403 });
  }
  const { text } = await req.json() as { text?: string };
  if (!text || text.length < 10 || text.length > 500) {
    return NextResponse.json({ ok: false, error: 'text must be 10-500 chars' }, { status: 400 });
  }
  const admin = createSupabaseAdmin();
  const { data, error } = await admin.from('business_idea_benchmarks')
    .insert({ user_input: text, verdict: 'pending (Phase 2 feature)', cost_eur: 0 })
    .select().single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, benchmark: data, note: 'scoring deferred to Phase 2' });
}
