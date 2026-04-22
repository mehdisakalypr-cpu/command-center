import { NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { createSupabaseAdmin } from '@/lib/supabase-server';

export const runtime = 'nodejs';

const COOKIE_NAME = 'saas_session';
const COOKIE_TTL_DAYS = 30;

function sign(payload: string): string {
  const secret = process.env.SESSION_SECRET ?? process.env.CRON_SECRET ?? 'dev-secret-change-me';
  return createHmac('sha256', secret).update(payload).digest('hex');
}

export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const token = typeof body.token === 'string' ? body.token : '';
  if (!token || token.length < 32) {
    return NextResponse.json({ ok: false, error: 'invalid token' }, { status: 400 });
  }

  const admin = createSupabaseAdmin();

  const { data: row } = await admin
    .from('saas_magic_tokens')
    .select('token, idea_slug, email, expires_at, consumed_at')
    .eq('token', token)
    .maybeSingle();

  if (!row || row.idea_slug !== slug) {
    return NextResponse.json({ ok: false, error: 'not found' }, { status: 404 });
  }
  if (row.consumed_at) return NextResponse.json({ ok: false, error: 'already used' }, { status: 410 });
  if (new Date(row.expires_at as string).getTime() < Date.now()) {
    return NextResponse.json({ ok: false, error: 'expired' }, { status: 410 });
  }

  await admin
    .from('saas_magic_tokens')
    .update({ consumed_at: new Date().toISOString() })
    .eq('token', token);

  const email = row.email as string;

  // upsert saas_clients
  const { data: existing } = await admin
    .from('saas_clients')
    .select('id')
    .eq('idea_slug', slug)
    .eq('email', email)
    .maybeSingle();

  let clientId: string;
  let created = false;
  if (existing) {
    clientId = existing.id as string;
    await admin.from('saas_clients').update({ updated_at: new Date().toISOString() }).eq('id', clientId);
  } else {
    const { data: inserted, error } = await admin
      .from('saas_clients')
      .insert({ idea_slug: slug, email, profile: {}, current_offer: 'early_access' })
      .select('id')
      .single();
    if (error || !inserted) {
      return NextResponse.json({ ok: false, error: error?.message ?? 'insert failed' }, { status: 500 });
    }
    clientId = inserted.id as string;
    created = true;
  }

  await admin.from('saas_client_events').insert({
    client_id: clientId,
    idea_slug: slug,
    kind: created ? 'signup' : 'login',
    payload: { email, via: 'magic_link' },
  });

  // Signed cookie value: slug|email|clientId|issuedAt|sig
  const issued = Date.now().toString();
  const payload = `${slug}|${email}|${clientId}|${issued}`;
  const sig = sign(payload);
  const cookieValue = `${payload}|${sig}`;

  const res = NextResponse.json({ ok: true, email, created });
  res.cookies.set({
    name: COOKIE_NAME,
    value: cookieValue,
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    path: '/',
    maxAge: COOKIE_TTL_DAYS * 24 * 60 * 60,
  });
  return res;
}

export function readSession(cookieValue: string | undefined, slug: string): { email: string; clientId: string } | null {
  if (!cookieValue) return null;
  const parts = cookieValue.split('|');
  if (parts.length !== 5) return null;
  const [cSlug, email, clientId, issued, sig] = parts;
  if (cSlug !== slug) return null;
  const expected = sign(`${cSlug}|${email}|${clientId}|${issued}`);
  try {
    const a = Buffer.from(expected, 'hex');
    const b = Buffer.from(sig, 'hex');
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch { return null; }
  const issuedMs = Number.parseInt(issued, 10);
  if (!Number.isFinite(issuedMs) || Date.now() - issuedMs > 45 * 24 * 60 * 60 * 1000) return null;
  return { email, clientId };
}
