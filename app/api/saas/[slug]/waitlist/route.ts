import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { createSupabaseAdmin } from '@/lib/supabase-server';

export const runtime = 'nodejs';

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
  const source = typeof body.source === 'string' ? body.source.slice(0, 40) : 'landing';

  if (!isEmail(email)) {
    return NextResponse.json({ ok: false, error: 'invalid email' }, { status: 400 });
  }

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

  const { error } = await admin.from('saas_waitlist').insert({
    idea_slug: slug,
    email,
    source,
    user_agent: ua,
    ip_hash: ipHash(ip),
  });

  if (error && !error.message.includes('duplicate')) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
