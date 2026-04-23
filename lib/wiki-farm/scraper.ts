/**
 * Wiki Farm — scraper multi-source (Wikipedia REST + Reddit JSON public).
 * Pattern inspiré de `lib/hisoka/harvester.ts` : fetchWithTimeout +
 * Promise.allSettled + dedup URL + cache Supabase (wiki_scrape_cache) TTL 30j.
 */

import { createSupabaseAdmin } from '@/lib/supabase-server'
import type { ArticleSource, ScrapeResult } from './types'

const DEFAULT_TIMEOUT_MS = 15_000
const CACHE_TTL_DAYS = 30
const UA = 'CC-Wiki-Farm/1.0 (+https://cc-dashboard.vercel.app)'

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...options, signal: controller.signal, headers: { 'User-Agent': UA, ...(options.headers ?? {}) } })
  } finally {
    clearTimeout(timer)
  }
}

// --- Wikipedia REST summary ------------------------------------------------
// https://{lang}.wikipedia.org/api/rest_v1/page/summary/{title}
async function fetchWikipedia(title: string, lang: string, timeoutMs: number): Promise<ArticleSource[]> {
  try {
    const encoded = encodeURIComponent(title.replace(/\s+/g, '_'))
    const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encoded}`
    const res = await fetchWithTimeout(url, {}, timeoutMs)
    if (!res.ok) throw new Error(`wikipedia ${res.status}`)
    const json = await res.json() as {
      title?: string
      extract?: string
      content_urls?: { desktop?: { page?: string } }
    }
    if (!json.title || !json.extract) return []
    return [{
      title: json.title,
      url: json.content_urls?.desktop?.page ?? `https://${lang}.wikipedia.org/wiki/${encoded}`,
      provider: 'wikipedia',
      excerpt: json.extract,
    }]
  } catch (err) {
    console.warn('[wiki-farm/scraper] wikipedia fetch failed:', String(err))
    return []
  }
}

// --- Reddit search JSON ----------------------------------------------------
// https://www.reddit.com/r/{sub}/search.json?q={query}&restrict_sr=1
async function fetchReddit(sub: string, query: string, timeoutMs: number, limit = 10): Promise<ArticleSource[]> {
  try {
    const url = `https://www.reddit.com/r/${encodeURIComponent(sub)}/search.json?q=${encodeURIComponent(query)}&restrict_sr=1&limit=${limit}&sort=top&t=year`
    const res = await fetchWithTimeout(url, {}, timeoutMs)
    if (!res.ok) throw new Error(`reddit ${res.status}`)
    const json = await res.json() as {
      data?: { children?: Array<{ data?: { title?: string; url?: string; selftext?: string; permalink?: string; over_18?: boolean } }> }
    }
    const out: ArticleSource[] = []
    for (const c of json.data?.children ?? []) {
      const d = c.data
      if (!d?.title || d.over_18) continue
      const permalink = d.permalink ? `https://www.reddit.com${d.permalink}` : undefined
      const url = permalink ?? d.url
      if (!url) continue
      out.push({
        title: d.title,
        url,
        provider: 'reddit',
        excerpt: (d.selftext ?? '').slice(0, 500) || undefined,
      })
    }
    return out
  } catch (err) {
    console.warn('[wiki-farm/scraper] reddit fetch failed:', String(err))
    return []
  }
}

// --- Niche → requêtes candidates ------------------------------------------
// Heuristique: slug → mots-clés (séparateur "-"), + sous-reddits probables.
function queriesFromSlug(slug: string): { wikiTitles: string[]; redditSubs: string[]; query: string } {
  const parts = slug.split('-').filter(Boolean)
  const query = parts.join(' ')
  const wikiTitles = Array.from(new Set([
    query,
    parts[0] ?? '',
    parts.slice(0, 2).join(' '),
  ].filter(t => t.length > 2)))
  const redditSubs = Array.from(new Set([
    parts.join(''),
    parts[0] ?? '',
    ...(parts.length >= 2 ? [parts.slice(-2).join('')] : []),
  ].filter(s => s.length > 2)))
  return { wikiTitles, redditSubs, query }
}

// --- Cache Supabase --------------------------------------------------------
async function readCache(key: string): Promise<ArticleSource[] | null> {
  try {
    const sb = createSupabaseAdmin()
    const { data } = await sb
      .from('wiki_scrape_cache')
      .select('payload, expires_at')
      .eq('source', 'multi')
      .eq('key', key)
      .maybeSingle()
    if (!data) return null
    if (new Date(data.expires_at).getTime() < Date.now()) return null
    return Array.isArray(data.payload) ? data.payload as ArticleSource[] : null
  } catch (err) {
    console.warn('[wiki-farm/scraper] cache read failed:', String(err))
    return null
  }
}

async function writeCache(key: string, payload: ArticleSource[]): Promise<void> {
  try {
    const sb = createSupabaseAdmin()
    const expires = new Date(Date.now() + CACHE_TTL_DAYS * 24 * 3600 * 1000).toISOString()
    await sb.from('wiki_scrape_cache').upsert({
      source: 'multi',
      key,
      payload,
      expires_at: expires,
      fetched_at: new Date().toISOString(),
    }, { onConflict: 'source,key' })
  } catch (err) {
    console.warn('[wiki-farm/scraper] cache write failed:', String(err))
  }
}

// --- Dedup par URL ---------------------------------------------------------
function dedupByUrl(sources: ArticleSource[]): ArticleSource[] {
  const seen = new Set<string>()
  const out: ArticleSource[] = []
  for (const s of sources) {
    const key = s.url.toLowerCase().replace(/\/+$/, '')
    if (seen.has(key)) continue
    seen.add(key)
    out.push(s)
  }
  return out
}

// --- Main ------------------------------------------------------------------
export async function scrapeNiche(input: {
  niche_slug: string
  lang: string
  max_sources?: number
}): Promise<ScrapeResult> {
  const { niche_slug, lang } = input
  const max = input.max_sources ?? 12
  const cacheKey = `${niche_slug}:${lang}`

  const cached = await readCache(cacheKey)
  if (cached && cached.length > 0) {
    return {
      niche_slug,
      lang,
      sources: cached.slice(0, max),
      cached: true,
      fetched_at: new Date().toISOString(),
    }
  }

  const { wikiTitles, redditSubs, query } = queriesFromSlug(niche_slug)

  const tasks: Promise<ArticleSource[]>[] = []
  for (const t of wikiTitles) tasks.push(fetchWikipedia(t, lang, DEFAULT_TIMEOUT_MS))
  for (const s of redditSubs) tasks.push(fetchReddit(s, query, DEFAULT_TIMEOUT_MS, 8))

  const results = await Promise.allSettled(tasks)
  const merged: ArticleSource[] = []
  for (const r of results) {
    if (r.status === 'fulfilled') merged.push(...r.value)
  }

  const deduped = dedupByUrl(merged).slice(0, max)
  if (deduped.length > 0) await writeCache(cacheKey, deduped)

  return {
    niche_slug,
    lang,
    sources: deduped,
    cached: false,
    fetched_at: new Date().toISOString(),
  }
}
