import { NextResponse } from 'next/server';
import { createHash, randomBytes } from 'node:crypto';
import { createSupabaseAdmin } from '@/lib/supabase-server';

export const runtime = 'nodejs';

function isEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) && s.length <= 254;
}
function ipHash(ip: string): string {
  return createHash('sha256').update(`${ip}|${new Date().toISOString().slice(0, 10)}`).digest('hex');
}

export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';

  if (!isEmail(email)) {
    return NextResponse.json({ ok: false, error: 'invalid email' }, { status: 400 });
  }

  const admin = createSupabaseAdmin();
  const { data: idea } = await admin
    .from('business_ideas')
    .select('slug, name, landing_content')
    .eq('slug', slug)
    .maybeSingle();
  if (!idea || !idea.landing_content) {
    return NextResponse.json({ ok: false, error: 'not found' }, { status: 404 });
  }

  const token = randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30min

  const { error } = await admin.from('saas_magic_tokens').insert({
    token,
    idea_slug: slug,
    email,
    expires_at: expires,
  });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://cc-dashboard.vercel.app';
  const magicUrl = `${baseUrl}/saas/${slug}/account?token=${token}`;

  const resendKey = process.env.RESEND_API_KEY;
  const fromAddress = process.env.RESEND_FROM ?? 'hello@gapup.io';
  if (resendKey) {
    const ideaName = (idea as { name?: string }).name ?? slug;
    const subject = `Your ${ideaName} sign-in link`;
    const html = `<p>Click the link below to access your account on <strong>${ideaName}</strong>. It expires in 30 minutes.</p><p><a href="${magicUrl}">${magicUrl}</a></p><p>If you did not request this, ignore this email.</p>`;
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ from: fromAddress, to: [email], subject, html }),
      });
    } catch { /* non-fatal */ }
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  // best-effort audit trail (ignore errors)
  await admin.from('saas_client_events').insert({
    client_id: null as unknown as string, // event without client yet — intentional
    idea_slug: slug,
    kind: 'magic_link_requested',
    payload: { email, ip_hash: ipHash(ip) },
  }).then(() => {}, () => {});

  // Dev fallback: if no RESEND_API_KEY, return the URL so you can copy/paste
  return NextResponse.json({
    ok: true,
    sent: Boolean(resendKey),
    dev_magic_url: resendKey ? undefined : magicUrl,
  });
}
