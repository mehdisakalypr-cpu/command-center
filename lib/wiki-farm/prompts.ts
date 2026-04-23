/**
 * Wiki Farm — prompts LLM pour génération d'articles structurés.
 * Output JSON strict: {title, intro, sections, faq, key_facts, sources_used}.
 * Gates: min 1800 mots, min 5 FAQ, >=3 sources citées.
 */

import { STRICT_JSON_DIRECTIVE } from '@/lib/ai-pool/cascade'
import type { ArticleSource, WikiLang } from './types'

export const MIN_WORDS = 1800
export const MIN_FAQ = 5
export const MIN_SOURCES = 3

const LANG_NAMES: Record<WikiLang, string> = {
  fr: 'français', en: 'English', es: 'español', de: 'Deutsch', it: 'italiano',
  pt: 'português', nl: 'Nederlands', pl: 'polski', tr: 'Türkçe', ar: 'العربية',
}

export function systemPrompt(lang: WikiLang): string {
  const langName = LANG_NAMES[lang] ?? lang
  return (
    `Tu es un rédacteur encyclopédique expert qui produit des articles longs, ` +
    `sourcés, structurés, neutres et faciles à lire. Tu écris exclusivement en ${langName}. ` +
    `Tu cites tes sources factuelles avec leur URL. Tu n'inventes pas de faits. ` +
    `Tu respectes strictement le schéma JSON demandé.` +
    STRICT_JSON_DIRECTIVE
  )
}

export function articlePrompt(input: {
  niche_slug: string
  niche_title: string
  article_topic: string
  lang: WikiLang
  sources: ArticleSource[]
}): string {
  const { niche_slug, niche_title, article_topic, sources } = input
  const sourceBlock = sources.map((s, i) => {
    const excerpt = (s.excerpt ?? '').slice(0, 400).replace(/\s+/g, ' ').trim()
    return `[${i + 1}] ${s.title} — ${s.url}\n    ${excerpt}`
  }).join('\n\n')

  return [
    `Rédige un article encyclopédique long sur le sujet suivant :`,
    ``,
    `Niche : ${niche_title} (slug: ${niche_slug})`,
    `Sujet de l'article : ${article_topic}`,
    ``,
    `Sources à utiliser (cite au moins ${MIN_SOURCES} d'entre elles par leur URL) :`,
    sourceBlock || '(aucune source externe, base-toi sur tes connaissances générales)',
    ``,
    `Exigences strictes :`,
    `- Longueur totale du contenu (intro + sections) : au moins ${MIN_WORDS} mots.`,
    `- Au moins 5 sections h2, chacune >= 250 mots.`,
    `- Au moins ${MIN_FAQ} questions/réponses dans la FAQ.`,
    `- Liste de 5 à 10 "key_facts" (phrases courtes factuelles).`,
    `- "sources_used" : liste des URL effectivement citées dans le texte.`,
    ``,
    `Retourne EXCLUSIVEMENT un JSON valide avec la forme suivante :`,
    `{`,
    `  "title": string,`,
    `  "intro": string,`,
    `  "sections": [{ "h2": string, "content": string }, ...],`,
    `  "faq": [{ "q": string, "a": string }, ...],`,
    `  "key_facts": [string, ...],`,
    `  "sources_used": [string, ...]`,
    `}`,
  ].join('\n')
}
