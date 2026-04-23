import { extractJSON, withFallback } from '@/lib/ai-pool/cascade'
import type { Article } from './types'

export interface JudgeResult {
  quality_score: number
  details: { clarte: number; structure: number; veracite: number; reasoning: string }
  cost_eur: number
}

const JUDGE_SYSTEM = `Tu es un évaluateur d'articles encyclopédiques neutre et rigoureux.
Tu notes un article selon 3 critères sur une échelle de 0.0 à 1.0 :
- clarte : lisibilité, fluidité, vocabulaire adapté, transitions naturelles.
- structure : intro claire, sections thématiques cohérentes, FAQ informative, key facts utiles.
- veracite : citations de sources fiables, absence d'affirmations invérifiables, neutralité encyclopédique.
Retourne EXCLUSIVEMENT un JSON valide : {"clarte": float, "structure": float, "veracite": float, "reasoning": string}`

export async function judgeArticleQuality(
  article: Pick<Article, 'title' | 'content' | 'sources' | 'structure'>,
): Promise<JudgeResult> {
  const faqSample = (article.structure?.faq ?? [])
    .slice(0, 3)
    .map((f, i) => `Q${i + 1}: ${f.q}\nA${i + 1}: ${f.a.slice(0, 120)}`)
    .join('\n')
  const sourcesSample = (article.sources ?? [])
    .slice(0, 5)
    .map((s) => `- ${s.title} (${s.provider}): ${s.url}`)
    .join('\n')

  const prompt = [
    `Évalue cet article encyclopédique :`,
    `Titre : ${article.title}`,
    `Contenu (3000 chars) :\n${(article.content ?? '').slice(0, 3000)}`,
    `FAQ :\n${faqSample || '(aucun)'}`,
    `Sources :\n${sourcesSample || '(aucune)'}`,
    `Note chaque critère 0.0-1.0. Retourne EXCLUSIVEMENT le JSON.`,
  ].join('\n\n')

  const out = await withFallback({
    system: JUDGE_SYSTEM,
    prompt,
    maxTokens: 512,
    temperature: 0.1,
  })
  const cost_eur = (out.costUsd ?? 0) * 0.92

  try {
    const raw = extractJSON<{
      clarte: number
      structure: number
      veracite: number
      reasoning: string
    }>(out.text)
    const clamp = (v: unknown) => Math.min(1, Math.max(0, Number(v) || 0))
    const clarte = clamp(raw.clarte)
    const structure = clamp(raw.structure)
    const veracite = clamp(raw.veracite)
    return {
      quality_score: Math.round(((clarte + structure + veracite) / 3) * 100) / 100,
      details: {
        clarte,
        structure,
        veracite,
        reasoning: String(raw.reasoning ?? '').slice(0, 300),
      },
      cost_eur,
    }
  } catch {
    return {
      quality_score: 0,
      details: { clarte: 0, structure: 0, veracite: 0, reasoning: 'parse error' },
      cost_eur,
    }
  }
}
