/**
 * Cron — wiki-farm article batch generator.
 *
 * Conservative default: picks N live niches with fewest articles and
 * generates 1 article per tick (daily by default). Tuning volume upward
 * = user decision (bump BATCH_PER_TICK or switch Vercel to Pro for 5min cron).
 *
 * Called daily from vercel.json. For higher frequency, run from VPS cron
 * with `Authorization: Bearer $CRON_SECRET`.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase-server'
import { runGenPipeline } from '@/lib/wiki-farm/pipeline'
import type { WikiLang } from '@/lib/wiki-farm/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

const BATCH_PER_TICK = 3
const DEFAULT_LANG: WikiLang = 'fr'

export async function GET(req: NextRequest) {
  const authorized =
    req.headers.get('x-vercel-cron') ||
    req.headers.get('authorization') === `Bearer ${process.env.CRON_SECRET}`
  if (!authorized) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const admin = createSupabaseAdmin()
  const t0 = Date.now()

  const { data: niches, error } = await admin
    .from('wiki_niches')
    .select('slug, article_count')
    .eq('status', 'live')
    .order('article_count', { ascending: true })
    .limit(BATCH_PER_TICK)

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  if (!niches?.length) return NextResponse.json({ ok: true, generated: [], note: 'no live niches' })

  const results: Array<{ niche: string; ok: boolean; article?: string; error?: string }> = []
  for (const n of niches) {
    try {
      const r = await runGenPipeline({ niche_slug: n.slug, lang: DEFAULT_LANG })
      results.push({
        niche: n.slug,
        ok: r.ok,
        article: r.ok ? (r as { article_slug?: string }).article_slug : undefined,
        error: r.ok ? undefined : JSON.stringify(r).slice(0, 200),
      })
    } catch (e) {
      results.push({ niche: n.slug, ok: false, error: (e as Error).message.slice(0, 300) })
    }
  }

  return NextResponse.json({
    ok: true,
    generated: results,
    duration_ms: Date.now() - t0,
  })
}
