import { NextResponse } from 'next/server';
import { createSupabaseAdmin, isAdmin } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const maxDuration = 10;

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  }
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as { priority?: number | null } | null;
  if (!body || (body.priority !== null && typeof body.priority !== 'number')) {
    return NextResponse.json({ ok: false, error: 'priority must be number or null' }, { status: 400 });
  }
  const priority =
    body.priority === null
      ? null
      : Math.max(1, Math.min(9999, Math.round(body.priority)));

  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from('business_ideas')
    .update({ build_priority: priority })
    .eq('id', id)
    .select('id, build_priority')
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, id: data.id, build_priority: data.build_priority });
}
