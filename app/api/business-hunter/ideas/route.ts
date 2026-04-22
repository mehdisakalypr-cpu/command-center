import { NextResponse } from 'next/server';
import { createSupabaseAdmin, isAdmin } from '@/lib/supabase-server';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, error: 'admin only' }, { status: 403 });
  }
  const url = new URL(req.url);
  const top = url.searchParams.get('top') === 'true';
  const admin = createSupabaseAdmin();
  let q = admin.from('business_ideas').select('*').order('score', { ascending: false }).limit(50);
  if (top) q = q.not('rank', 'is', null).order('rank').limit(20);
  const { data, error } = await q;
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, ideas: data ?? [] });
}
