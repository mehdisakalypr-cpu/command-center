import { NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase-server';
import { renderLanding, type RenderIdeaInput } from '@/lib/hisoka/saas-forge/landing-renderer';

export const runtime = 'nodejs';
export const maxDuration = 300;

const MAX_BATCH = 10;

export async function POST(req: Request) {
  const token =
    req.headers.get('x-cron-secret') ??
    req.headers.get('x-cron-token') ??
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (token !== process.env.CRON_SECRET) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const admin = createSupabaseAdmin();
  const url = new URL(req.url);
  const slug = url.searchParams.get('slug');
  const count = Math.min(
    MAX_BATCH,
    Math.max(1, Number.parseInt(url.searchParams.get('count') ?? '1', 10) || 1),
  );

  let query = admin
    .from('business_ideas')
    .select('id, slug, name, tagline, rationale, category, monetization_model, distribution_channels, assets_leveraged, landing_content')
    .not('deployed_url', 'is', null);

  if (slug) {
    query = query.eq('slug', slug);
  } else {
    query = query.order('landing_rendered_at', { ascending: true }).limit(count);
  }

  const { data: ideas, error } = await query;
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  if (!ideas || ideas.length === 0) {
    return NextResponse.json({ ok: true, rerendered: 0, results: [] });
  }

  const results: Array<{ slug: string; ok: boolean; provider?: string; cost_usd?: number; error?: string }> = [];
  for (const idea of ideas) {
    const rendered = await renderLanding(idea as RenderIdeaInput);
    if (!rendered.ok) {
      results.push({ slug: idea.slug as string, ok: false, error: rendered.error });
      continue;
    }
    const { error: updErr } = await admin
      .from('business_ideas')
      .update({
        landing_content: rendered.content,
        landing_rendered_at: new Date().toISOString(),
      })
      .eq('id', idea.id as string);

    if (updErr) {
      results.push({ slug: idea.slug as string, ok: false, error: updErr.message });
    } else {
      results.push({
        slug: idea.slug as string,
        ok: true,
        provider: rendered.provider,
        cost_usd: rendered.cost_usd,
      });
    }
  }

  return NextResponse.json({
    ok: true,
    rerendered: results.filter((r) => r.ok).length,
    total: results.length,
    results,
  });
}

export const GET = POST;
