import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { createSupabaseAdmin } from '@/lib/supabase-server';

export const runtime = 'nodejs';

const VALID_REASONS = new Set(['improve', 'bug', 'question', 'partnership', 'press', 'other']);

function isEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) && s.length <= 254;
}
function ipHash(ip: string): string {
  const salt = new Date().toISOString().slice(0, 10);
  return createHash('sha256').update(`${ip}|${salt}`).digest('hex');
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const reason = typeof body.reason === 'string' ? body.reason : '';
  const subject = typeof body.subject === 'string' ? body.subject.slice(0, 120) : '';
  const message = typeof body.message === 'string' ? body.message.slice(0, 4000) : '';

  if (!isEmail(email)) return NextResponse.json({ ok: false, error: 'invalid email' }, { status: 400 });
  if (!VALID_REASONS.has(reason)) return NextResponse.json({ ok: false, error: 'invalid reason' }, { status: 400 });
  if (!message || message.length < 5) return NextResponse.json({ ok: false, error: 'message too short' }, { status: 400 });

  const admin = createSupabaseAdmin();

  const { data: idea } = await admin
    .from('business_ideas')
    .select('slug, landing_content')
    .eq('slug', slug)
    .maybeSingle();
  if (!idea || !idea.landing_content) {
    return NextResponse.json({ ok: false, error: 'not found' }, { status: 404 });
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const ua = req.headers.get('user-agent')?.slice(0, 300) ?? null;

  const { error } = await admin.from('saas_contact_messages').insert({
    idea_slug: slug,
    email,
    reason,
    subject: subject || null,
    message,
    user_agent: ua,
    ip_hash: ipHash(ip),
  });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  // Notify ops inbox via Resend — best-effort, don't fail the request on email hiccups.
  const resendKey = process.env.RESEND_API_KEY;
  const fromAddress = process.env.RESEND_FROM ?? 'hello@gapup.io';
  const opsInbox = process.env.CONTACT_NOTIFY_TO ?? 'hello@gapup.io';
  if (resendKey) {
    const safeSubject = subject ? ` · ${subject.slice(0, 80)}` : '';
    const html = [
      `<p><strong>Slug:</strong> ${slug}</p>`,
      `<p><strong>From:</strong> ${email}</p>`,
      `<p><strong>Reason:</strong> ${reason}</p>`,
      subject ? `<p><strong>Subject:</strong> ${subject}</p>` : '',
      `<p><strong>Message:</strong></p><pre style="white-space:pre-wrap">${message.replace(/</g, '&lt;')}</pre>`,
    ].filter(Boolean).join('\n');
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [opsInbox],
          reply_to: email,
          subject: `[${slug}] ${reason}${safeSubject}`,
          html,
        }),
      });
    } catch { /* non-fatal */ }
  }

  return NextResponse.json({ ok: true });
}
