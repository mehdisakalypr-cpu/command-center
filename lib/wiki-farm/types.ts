/**
 * Wiki Farm — types partagés (scraper, pipeline, DB rows).
 * Voir `docs/superpowers/specs/2026-04-23-wiki-farm.md`.
 */

export type WikiTierAccess = 'free' | 'premium'
export type WikiStatus = 'draft' | 'live' | 'paused'
export type WikiLang = 'fr' | 'en' | 'es' | 'de' | 'it' | 'pt' | 'nl' | 'pl' | 'tr' | 'ar'

export interface Niche {
  id: string
  slug: string
  title: Record<string, string>
  description: Record<string, string>
  meta_keywords: string[]
  tier_access: WikiTierAccess
  status: WikiStatus
  article_count: number
  created_at: string
  updated_at: string
}

export interface ArticleSection {
  h2: string
  content: string
}

export interface ArticleFAQ {
  q: string
  a: string
}

export interface ArticleStructure {
  intro: string
  sections: ArticleSection[]
  faq: ArticleFAQ[]
  key_facts: string[]
}

export interface ArticleSource {
  title: string
  url: string
  provider: 'wikipedia' | 'reddit' | 'other'
  excerpt?: string
}

export interface Article {
  id: string
  niche_id: string
  slug: string
  lang: WikiLang
  title: string
  content: string
  structure: ArticleStructure
  sources: ArticleSource[]
  quality_score: number | null
  word_count: number | null
  cost_eur: number
  generated_at: string
  published_at: string | null
}

export interface Cluster {
  id: string
  niche_id: string
  topic: string
  authority_score: number
  article_ids: string[]
  created_at: string
}

export interface ScrapeResult {
  niche_slug: string
  lang: string
  sources: ArticleSource[]
  cached: boolean
  fetched_at: string
}

export interface GenPipelineResult {
  ok: boolean
  article_id?: string
  niche_id?: string
  word_count?: number
  faq_count?: number
  sources_count?: number
  quality_score?: number
  cost_eur?: number
  gate_failures?: string[]
  retries?: number
  error?: string
}
