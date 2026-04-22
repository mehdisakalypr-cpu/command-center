import { NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase-server';
import { claimHisokaTicket } from '@/lib/hisoka/saas-forge/claim';
import { renderLanding, type RenderIdeaInput } from '@/lib/hisoka/saas-forge/landing-renderer';
import { publishLanding, failTicket } from '@/lib/hisoka/saas-forge/publish';

export const runtime = 'nodejs';
export const maxDuration = 300;

const DEFAULT_BATCH = 3;
const MAX_BATCH = 10;

function extractSlugFromTarget(target: string | null): string | null {
  if (!target) return null;
  const m = /^hisoka\.(.+)$/.exec(target);
  return m ? m[1] : null;
}

type ForgeResult = {
  ticket_id: string;
  slug?: string;
  ok: boolean;
  deployed_url?: string;
  provider?: string;
  cost_usd?: number;
  error?: string;
};

async function forgeOne(admin: ReturnType<typeof createSupabaseAdmin>): Promise<ForgeResult | null> {
  const ticket = await claimHisokaTicket(admin);
  if (!ticket) return null;

  const slug = extractSlugFromTarget(ticket.mrr_target_id);
  if (!slug) {
    await failTicket(admin, ticket.id, 'cannot extract slug from mrr_target_id');
    return { ticket_id: ticket.id, ok: false, error: 'slug missing' };
  }

  const { data: idea, error: ideaErr } = await admin
    .from('business_ideas')
    .select('name, tagline, rationale, category, monetization_model, distribution_channels, assets_leveraged')
    .eq('slug', slug)
    .maybeSingle();

  if (ideaErr || !idea) {
    await failTicket(admin, ticket.id, `idea ${slug} not found: ${ideaErr?.message ?? 'null'}`);
    return { ticket_id: ticket.id, slug, ok: false, error: 'idea not found' };
  }

  const rendered = await renderLanding(idea as RenderIdeaInput);
  if (!rendered.ok) {
    await failTicket(admin, ticket.id, `render failed: ${rendered.error}`);
    return { ticket_id: ticket.id, slug, ok: false, error: rendered.error };
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
    return { ticket_id: ticket.id, slug, ok: false, error: publish.error };
  }

  return {
    ticket_id: ticket.id,
    slug,
    ok: true,
    deployed_url: publish.deployed_url,
    provider: rendered.provider,
    cost_usd: rendered.cost_usd,
  };
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

  const url = new URL(req.url);
  const countParam = url.searchParams.get('count');
  const count = Math.min(
    MAX_BATCH,
    Math.max(1, countParam ? Number.parseInt(countParam, 10) || DEFAULT_BATCH : DEFAULT_BATCH),
  );

  const results: ForgeResult[] = [];
  for (let i = 0; i < count; i++) {
    const r = await forgeOne(admin);
    if (!r) break;
    results.push(r);
  }

  const successes = results.filter((r) => r.ok).length;
  return NextResponse.json({
    ok: true,
    claimed: results.length,
    succeeded: successes,
    failed: results.length - successes,
    results,
  });
}

export const GET = POST;
