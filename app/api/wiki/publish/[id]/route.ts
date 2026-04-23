import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin, requireAdmin } from '@/lib/supabase-server'
import { judgeArticleQuality } from '@/lib/wiki-farm/quality-judge'
import type { Article } from '@/lib/wiki-farm/types'

export const runtime = 'nodejs'
export const maxDuration = 60

function trigrams(text: string): Set<string> {
  const s = text.toLowerCase().replace(/\s+/g, ' ')
  const out = new Set<string>()
  for (let i = 0; i < s.length - 2; i++) out.add(s.slice(i, i + 3))
  return out
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1
  let inter = 0
  for (const t of a) if (b.has(t)) inter++
  return inter / (a.size + b.size - inter)
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await requireAdmin()
  if (denied) return denied

  const { id } = await params
  const sb = createSupabaseAdmin()

  const { data: article, error: fetchErr } = await sb
    .from('wiki_articles')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (fetchErr || !article) {
    return NextResponse.json({ error: 'article introuvable' }, { status: 404 })
  }

  const art = article as Article
  const failures: string[] = []

  const wc = art.word_count ?? 0
  if (wc < 1800) failures.push(`word_count insuffisant: ${wc} < 1800`)

  const faqLen = (art.structure?.faq ?? []).length
  if (faqLen < 5) failures.push(`faq insuffisante: ${faqLen} < 5`)

  const sources = art.sources ?? []
  let sourcesOk = 0
  await Promise.allSettled(
    sources.slice(0, 10).map(async (s) => {
      try {
        const r = await fetch(s.url, {
          method: 'HEAD',
          signal: AbortSignal.timeout(8000),
        })
        if (r.ok) sourcesOk++
      } catch {
        /* ignore */
      }
    }),
  )
  if (sourcesOk < 3)
    failures.push(`sources HTTP 200 insuffisantes: ${sourcesOk} < 3`)

  const { data: peers } = await sb
    .from('wiki_articles')
    .select('id, content')
    .eq('niche_id', art.niche_id)
    .neq('id', id)
    .not('published_at', 'is', null)
    .limit(50)

  const artTrigrams = trigrams((art.content ?? '').slice(0, 5000))
  for (const peer of peers ?? []) {
    const content = (peer as { content?: string }).content ?? ''
    const score = jaccard(artTrigrams, trigrams(content.slice(0, 5000)))
    if (score >= 0.4) {
      failures.push(
        `contenu trop similaire à l'article ${peer.id} (Jaccard=${score.toFixed(2)})`,
      )
      break
    }
  }

  let quality_score = art.quality_score
  let judgeCost = 0
  if (quality_score === null || quality_score === undefined) {
    const judge = await judgeArticleQuality(art)
    quality_score = judge.quality_score
    judgeCost = judge.cost_eur
    await sb
      .from('wiki_articles')
      .update({
        quality_score,
        cost_eur: (art.cost_eur ?? 0) + judgeCost,
      })
      .eq('id', id)
  }
  if ((quality_score ?? 0) < 0.7) {
    failures.push(`quality_score insuffisant: ${quality_score} < 0.7`)
  }

  if (failures.length > 0) {
    return NextResponse.json({ ok: false, failures }, { status: 422 })
  }

  const { error: updateErr } = await sb
    .from('wiki_articles')
    .update({ published_at: new Date().toISOString() })
    .eq('id', id)

  if (updateErr)
    return NextResponse.json({ error: updateErr.message }, { status: 500 })

  return NextResponse.json({ ok: true, article_id: id, quality_score })
}
