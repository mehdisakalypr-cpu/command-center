import { NextResponse } from 'next/server';
import { createSupabaseAdmin, isAdmin } from '@/lib/supabase-server';
import { pushIdeaToMinato } from '@/lib/hisoka/push-to-minato';

export const runtime = 'nodejs';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const admin = createSupabaseAdmin();

  const { data: idea, error: loadErr } = await admin
    .from('business_ideas')
    .select('*')
    .eq('id', id)
    .single();

  if (loadErr || !idea) {
    return NextResponse.json({ ok: false, error: 'idea not found' }, { status: 404 });
  }

  const result = await pushIdeaToMinato(admin, idea as Record<string, unknown>);

  if (result.error) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    already_queued: result.already_queued ?? false,
    ticket_id: result.ticket_id,
    pushed_at: new Date().toISOString(),
    title: `[Hisoka] ${(idea as Record<string, unknown>).name}`,
  });
}
