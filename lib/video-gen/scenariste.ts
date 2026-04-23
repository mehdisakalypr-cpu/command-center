/**
 * Video Gen scénariste — convertit un brief en 3-8 scènes cohérentes via
 * la cascade ai-pool (OpenRouter/Gemini/Groq). Respecte la structure d'un
 * template `video_templates` si `template_slug` fourni.
 */

import { createSupabaseAdmin } from '@/lib/supabase-server'
import { withFallbackJSON, STRICT_JSON_DIRECTIVE } from '@/lib/ai-pool/cascade'
import type { Scene, ScenariseOutput, Template, TemplateSceneSlot } from './types'

type ScenariseInput = {
  brief: string
  tone?: string
  duration_s: number
  language: string
  template_slug?: string
}

type LLMResponse = {
  scenes: Array<{
    seq?: number
    prompt: string
    voiceover_text: string
    duration_s: number
  }>
}

const MIN_SCENES = 3
const MAX_SCENES = 8

async function loadTemplate(slug: string): Promise<Template | null> {
  const admin = createSupabaseAdmin()
  const { data } = await admin
    .from('video_templates')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()
  return (data as Template | null) ?? null
}

function buildStructureHint(slots: TemplateSceneSlot[]): string {
  return slots
    .map((s, i) => `${i + 1}. ${s.type} (~${s.duration}s)`)
    .join('\n')
}

function buildSystemPrompt(language: string, tone: string | undefined): string {
  const toneLine = tone ? `Ton demandé: ${tone}.` : ''
  return (
    `Tu es un scénariste vidéo expert qui produit des découpages shot-by-shot pour une génération IA (Seedance 2). ` +
    `Langue cible du voiceover: ${language}. ${toneLine} ` +
    `Chaque scène contient un prompt visuel riche (sujet, ambiance, mouvement caméra, lumière) et un voiceover court et naturel. ` +
    `Évite les textes à l'écran. Respecte la cohérence narrative (accroche → problème → solution → preuve → CTA).` +
    STRICT_JSON_DIRECTIVE
  )
}

function buildUserPrompt(input: ScenariseInput, template: Template | null): string {
  const structureBlock = template
    ? `\n\nStructure imposée (${template.name}):\n${buildStructureHint(template.structure.scenes)}\n` +
      `Génère exactement ${template.structure.scenes.length} scènes dans cet ordre, en respectant les durées indiquées (somme = ${input.duration_s}s).`
    : `\n\nPas de template imposé: choisis un nombre de scènes entre ${MIN_SCENES} et ${MAX_SCENES} pour un total de ${input.duration_s}s.`

  return (
    `Brief: ${input.brief}\n` +
    `Durée totale: ${input.duration_s}s.${structureBlock}\n\n` +
    `Retourne UNIQUEMENT ce JSON:\n` +
    `{"scenes":[{"seq":1,"prompt":"...","voiceover_text":"...","duration_s":5}, ...]}`
  )
}

function normaliseScenes(raw: LLMResponse['scenes'], totalDuration: number): Scene[] {
  const cleaned = raw
    .filter(s => typeof s.prompt === 'string' && typeof s.voiceover_text === 'string')
    .slice(0, MAX_SCENES)
    .map((s, i) => ({
      seq: typeof s.seq === 'number' ? s.seq : i + 1,
      prompt: s.prompt.trim(),
      voiceover_text: s.voiceover_text.trim(),
      duration_s: Math.max(1, Number(s.duration_s) || 0),
    }))

  if (cleaned.length < MIN_SCENES) {
    throw new Error(`scenariste: only ${cleaned.length} valid scenes (min ${MIN_SCENES})`)
  }

  const sum = cleaned.reduce((acc, s) => acc + s.duration_s, 0)
  if (sum !== totalDuration && sum > 0) {
    const ratio = totalDuration / sum
    for (const s of cleaned) s.duration_s = Math.round(s.duration_s * ratio * 10) / 10
  }

  cleaned.sort((a, b) => a.seq - b.seq)
  cleaned.forEach((s, i) => { s.seq = i + 1 })

  return cleaned
}

export async function scenarise(input: ScenariseInput): Promise<ScenariseOutput> {
  const template = input.template_slug ? await loadTemplate(input.template_slug) : null

  const system = buildSystemPrompt(input.language, input.tone)
  const prompt = buildUserPrompt(input, template)

  const { data, out } = await withFallbackJSON<LLMResponse>({
    system,
    prompt,
    temperature: 0.6,
    maxTokens: 2500,
  }, { project: 'cc' })

  if (!data || !Array.isArray(data.scenes)) {
    throw new Error('scenariste: invalid LLM response (missing scenes array)')
  }

  const scenes = normaliseScenes(data.scenes, input.duration_s)

  return {
    scenes,
    provider: out.provider,
    cost_usd: out.costUsd,
  }
}
