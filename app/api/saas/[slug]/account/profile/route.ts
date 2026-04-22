import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseAdmin } from '@/lib/supabase-server';
import { readSession } from '../verify/route';

export const runtime = 'nodejs';

const COOKIE_NAME = 'saas_session';

async function requireSession(slug: string) {
  const jar = await cookies();
  const raw = jar.get(COOKIE_NAME)?.value;
  return readSession(raw, slug);
}

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const sess = await requireSession(slug);
  if (!sess) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  const admin = createSupabaseAdmin();
  const { data: client } = await admin
    .from('saas_clients')
    .select('id, email, profile, current_offer, created_at')
    .eq('id', sess.clientId)
    .maybeSingle();
  if (!client) return NextResponse.json({ ok: false, error: 'not found' }, { status: 404 });

  const { data: events } = await admin
    .from('saas_client_events')
    .select('id, kind, payload, created_at')
    .eq('client_id', sess.clientId)
    .order('created_at', { ascending: false })
    .limit(50);

  return NextResponse.json({ ok: true, client, events: events ?? [] });
}

const EDITABLE_FIELDS = [
  'first_name',
  'last_name',
  'company',
  'role',
  'country',
  'use_case',
  'newsletter_opt_in',
] as const;

export async function PATCH(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const sess = await requireSession(slug);
  if (!sess) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const profileUpdate: Record<string, unknown> = {};
  for (const k of EDITABLE_FIELDS) {
    if (k in body) {
      const v = body[k];
      if (typeof v === 'string') profileUpdate[k] = v.slice(0, 200);
      else if (typeof v === 'boolean') profileUpdate[k] = v;
      else if (v === null) profileUpdate[k] = null;
    }
  }

  const admin = createSupabaseAdmin();
  const { data: existing } = await admin
    .from('saas_clients')
    .select('profile')
    .eq('id', sess.clientId)
    .maybeSingle();
  if (!existing) return NextResponse.json({ ok: false, error: 'not found' }, { status: 404 });

  const merged = { ...(existing.profile as Record<string, unknown>), ...profileUpdate };
  const { error } = await admin
    .from('saas_clients')
    .update({ profile: merged, updated_at: new Date().toISOString() })
    .eq('id', sess.clientId);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  await admin.from('saas_client_events').insert({
    client_id: sess.clientId,
    idea_slug: slug,
    kind: 'profile_updated',
    payload: { fields: Object.keys(profileUpdate) },
  });

  return NextResponse.json({ ok: true, profile: merged });
}
