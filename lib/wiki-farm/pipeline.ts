/**
 * Wiki Farm — orchestrateur génération article.
 * scrapeNiche → ai-pool cascade (withFallback) → extractJSON → gates → insert.
 * Retry x2 si gates failed.
 */

import { extractJSON, withFallback } from '@/lib/ai-pool/cascade'
import { createSupabaseAdmin } from '@/lib/supabase-server'
import { scrapeNiche } from './scraper'
import { articlePrompt, MIN_FAQ, MIN_SOURCES, MIN_WORDS, systemPrompt } from './prompts'
import type {
  ArticleFAQ,
  ArticleSection,
  ArticleSource,
  ArticleStructure,
  GenPipelineResult,
  WikiLang,
} from './types'

const MAX_RETRIES = 2

interface RawArticle {
  title?: string
  intro?: string
  sections?: ArticleSection[]
  faq?: ArticleFAQ[]
  key_facts?: string[]
  sources_used?: string[]
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

function countWords(raw: RawArticle): number {
  const parts: string[] = []
  if (raw.intro) parts.push(raw.intro)
  for (const s of raw.sections ?? []) parts.push(s.content ?? '')
  return parts.join(' ').split(/\s+/).filter(Boolean).length
}

function runGates(raw: RawArticle, allSources: ArticleSource[]): { ok: boolean; failures: string[]; wordCount: number; sourcesCount: number } {
  const failures: string[] = []
  const wordCount = countWords(raw)
  if (wordCount < MIN_WORDS) failures.push(`word_count<${MIN_WORDS} (got ${wordCount})`)
  const faqCount = raw.faq?.length ?? 0
  if (faqCount < MIN_FAQ) failures.push(`faq<${MIN_FAQ} (got ${faqCount})`)

  const knownUrls = new Set(allSources.map(s => s.url.toLowerCase()))
  const usedUrls = (raw.sources_used ?? []).filter(u => knownUrls.has(u.toLowerCase()))
  const sourcesCount = usedUrls.length
  if (sourcesCount < MIN_SOURCES) failures.push(`sources<${MIN_SOURCES} (got ${sourcesCount})`)

  if (!raw.title || raw.title.length < 5) failures.push('title missing/too short')
  if (!raw.intro || raw.intro.length < 100) failures.push('intro missing/too short')
  if (!raw.sections || raw.sections.length < 3) failures.push('sections<3')

  return { ok: failures.length === 0, failures, wordCount, sourcesCount }
}

function buildContent(raw: RawArticle): string {
  const parts: string[] = []
  if (raw.intro) parts.push(raw.intro.trim())
  for (const s of raw.sections ?? []) {
    if (s.h2) parts.push(`\n## ${s.h2}\n`)
    if (s.content) parts.push(s.content.trim())
  }
  return parts.join('\n\n')
}

export async function runGenPipeline(input: {
  niche_slug: string
  lang: WikiLang
  article_topic?: string
}): Promise<GenPipelineResult> {
  const { niche_slug, lang } = input
  const sb = createSupabaseAdmin()

  const { data: niche, error: nicheErr } = await sb
    .from('wiki_niches')
    .select('id, slug, title, description')
    .eq('slug', niche_slug)
    .maybeSingle()
  if (nicheErr || !niche) {
    return { ok: false, error: `niche '${niche_slug}' introuvable` }
  }

  const nicheTitleMap = (niche.title ?? {}) as Record<string, string>
  const nicheTitle = nicheTitleMap[lang] ?? nicheTitleMap.fr ?? nicheTitleMap.en ?? niche_slug
  const topic = input.article_topic ?? `Introduction à ${nicheTitle}`

  const scrape = await scrapeNiche({ niche_slug, lang, max_sources: 12 })
  if (scrape.sources.length < MIN_SOURCES) {
    return { ok: false, error: `sources insuffisantes (${scrape.sources.length}<${MIN_SOURCES})` }
  }

  let lastFailures: string[] = []
  let totalCost = 0
  let retries = 0

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    retries = attempt
    try {
      const out = await withFallback({
        system: systemPrompt(lang),
        prompt: articlePrompt({
          niche_slug,
          niche_title: nicheTitle,
          article_topic: topic,
          lang,
          sources: scrape.sources,
        }),
        maxTokens: 8000,
        temperature: 0.4,
      }, { project: 'cc' })
      totalCost += (out.costUsd ?? 0) * 0.92 // USD→EUR approx

      const raw = extractJSON<RawArticle>(out.text)
      const gates = runGates(raw, scrape.sources)
      if (!gates.ok) {
        lastFailures = gates.failures
        continue
      }

      const slug = slugify(raw.title!)
      const structure: ArticleStructure = {
        intro: raw.intro ?? '',
        sections: raw.sections ?? [],
        faq: raw.faq ?? [],
        key_facts: raw.key_facts ?? [],
      }
      const content = buildContent(raw)
      const usedUrls = new Set((raw.sources_used ?? []).map(u => u.toLowerCase()))
      const sourcesList: ArticleSource[] = scrape.sources.filter(s => usedUrls.has(s.url.toLowerCase()))

      const { data: inserted, error: insErr } = await sb
        .from('wiki_articles')
        .insert({
          niche_id: niche.id,
          slug,
          lang,
          title: raw.title,
          content,
          structure,
          sources: sourcesList,
          quality_score: null,
          word_count: gates.wordCount,
          cost_eur: totalCost,
          published_at: null,
        })
        .select('id')
        .single()
      if (insErr) {
        return { ok: false, error: `insert failed: ${insErr.message}`, cost_eur: totalCost, retries }
      }

      return {
        ok: true,
        article_id: inserted.id,
        niche_id: niche.id,
        word_count: gates.wordCount,
        faq_count: raw.faq?.length ?? 0,
        sources_count: gates.sourcesCount,
        cost_eur: totalCost,
        retries,
      }
    } catch (err) {
      lastFailures = [String((err as Error)?.message ?? err).slice(0, 200)]
    }
  }

  return {
    ok: false,
    gate_failures: lastFailures,
    retries,
    cost_eur: totalCost,
    error: `gates failed after ${retries + 1} attempts`,
  }
}
