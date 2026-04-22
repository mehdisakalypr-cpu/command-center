import { NextResponse } from 'next/server';
import { createSupabaseAdmin, isAdmin } from '@/lib/supabase-server';

export const runtime = 'nodejs';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, error: 'admin only' }, { status: 403 });
  }
  const { id } = await params;
  const admin = createSupabaseAdmin();
  const [{ data: idea, error: e1 }, { data: deep, error: e2 }] = await Promise.all([
    admin.from('business_ideas').select('*').eq('id', id).single(),
    admin.from('business_idea_deep').select('*').eq('idea_id', id).order('version', { ascending: false }).limit(1),
  ]);
  if (e1) return NextResponse.json({ ok: false, error: e1.message }, { status: 404 });
  return NextResponse.json({ ok: true, idea, deep: (deep?.[0]) ?? null, deep_err: e2?.message ?? null });
}
