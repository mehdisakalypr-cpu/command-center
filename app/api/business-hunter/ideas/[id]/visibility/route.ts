import { NextResponse } from 'next/server';
import { createSupabaseAdmin, isAdmin } from '@/lib/supabase-server';

export const runtime = 'nodejs';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  }
  const { id } = await params;
  let body: { visibility?: string };
  try {
    body = await req.json() as { visibility?: string };
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid JSON' }, { status: 400 });
  }
  if (body.visibility !== 'public' && body.visibility !== 'private') {
    return NextResponse.json({ ok: false, error: 'visibility must be public|private' }, { status: 400 });
  }
  const admin = createSupabaseAdmin();
  const { error } = await admin
    .from('business_ideas')
    .update({ visibility: body.visibility, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, visibility: body.visibility });
}
