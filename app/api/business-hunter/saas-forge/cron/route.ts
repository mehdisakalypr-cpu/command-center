import { NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase-server';
import { claimHisokaTicket } from '@/lib/hisoka/saas-forge/claim';
import { renderLanding, type RenderIdeaInput } from '@/lib/hisoka/saas-forge/landing-renderer';
import { publishLanding, failTicket } from '@/lib/hisoka/saas-forge/publish';

export const runtime = 'nodejs';
export const maxDuration = 120;

function extractSlugFromTarget(target: string | null): string | null {
  if (!target) return null;
  const m = /^hisoka\.(.+)$/.exec(target);
  return m ? m[1] : null;
}

export async function POST(req: Request) {
  const token =
    req.headers.get('x-cron-secret') ??
    req.headers.get('x-cron-token') ??
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const vercelCron = req.headers.get('x-vercel-cron');
  if (!vercelCron && token !== process.env.CRON_SECRET) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  const admin = createSupabaseAdmin();

  const ticket = await claimHisokaTicket(admin);
  if (!ticket) {
    return NextResponse.json({ ok: true, claimed: 0, reason: 'no queued hisoka tickets' });
  }

  const slug = extractSlugFromTarget(ticket.mrr_target_id);
  if (!slug) {
    await failTicket(admin, ticket.id, 'cannot extract slug from mrr_target_id');
    return NextResponse.json({ ok: false, error: 'slug missing', ticket_id: ticket.id }, { status: 500 });
  }

  const { data: idea, error: ideaErr } = await admin
    .from('business_ideas')
    .select('name, tagline, rationale, category, monetization_model, distribution_channels, assets_leveraged')
    .eq('slug', slug)
    .maybeSingle();

  if (ideaErr || !idea) {
    await failTicket(admin, ticket.id, `idea ${slug} not found: ${ideaErr?.message ?? 'null'}`);
    return NextResponse.json({ ok: false, error: 'idea not found' }, { status: 500 });
  }

  const rendered = await renderLanding(idea as RenderIdeaInput);
  if (!rendered.ok) {
    await failTicket(admin, ticket.id, `render failed: ${rendered.error}`);
    return NextResponse.json({ ok: false, error: rendered.error, ticket_id: ticket.id }, { status: 500 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://cc-dashboard.vercel.app';
  const publish = await publishLanding(admin, {
    ticketId: ticket.id,
    ideaSlug: slug,
    content: rendered.content,
    baseUrl,
  });

  if (!publish.ok) {
    await failTicket(admin, ticket.id, publish.error);
    return NextResponse.json({ ok: false, error: publish.error, ticket_id: ticket.id }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    claimed: 1,
    ticket_id: ticket.id,
    slug,
    deployed_url: publish.deployed_url,
    provider: rendered.provider,
    cost_usd: rendered.cost_usd,
  });
}

export const GET = POST;
