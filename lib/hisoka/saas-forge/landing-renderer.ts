import { withFallback, extractJSON, stripPreamble, STRICT_JSON_DIRECTIVE } from '@/lib/ai-pool/cascade';
import type { LandingContent, LandingRenderResult } from './types';

const LANDING_SYSTEM = `You are a conversion copywriter for indie SaaS founders. Study the reference example before writing.

Reference (Feel The Gap style — emulate the tightness):
  hero_title: "Find where to sell before everyone else"
  hero_tagline: "From raw data to actionable opportunities"

Pattern:
  - hero_title = ACTION VERB + CONCRETE OUTCOME for the named audience. It must answer
    "what does the visitor GET in one line". No nouns-only titles. No AI jargon. No buzzwords
    ("revolutionary", "cutting-edge", "game-changing", "next-gen", "AI-powered", "unlock",
    "supercharge", "empower"). Under 70 chars ideal, max 90.
  - hero_tagline = HOW we deliver, process summary, 6-12 words. Under 100 chars.
  - audience is implicit but the hero must FEEL written for that person.

Rules:
- hero_cta: short verb phrase ("Join waitlist" / "Rejoindre la liste").
- features: 3 to 6 items. Each title <=50 chars, description <=180 chars. One relevant emoji icon.
  Each feature must name WHO benefits and HOW (not just WHAT).
- faq: 3 to 5 items answering real buyer objections: pricing, trust, fit vs alternatives, timeline,
  data/privacy, what happens after waitlist. Answers <=280 chars, concrete, no hedge.
- footer_note: one honest sentence (e.g. "Built by a solo founder. Early access — expect rough edges.").
- lang: ISO code matching target market ('en' default, 'fr' if clearly francophone, 'es' etc.).
  All text must be in that language — no mixed languages.
- No placeholders, no TODOs, no lorem ipsum. No passive voice.
${STRICT_JSON_DIRECTIVE}`;

export type RenderIdeaInput = {
  name: string;
  tagline: string;
  rationale?: string | null;
  category: string;
  monetization_model?: string | null;
  distribution_channels?: string[] | null;
  assets_leveraged?: string[] | null;
};

function buildPrompt(idea: RenderIdeaInput): string {
  const lines: string[] = [
    'Business idea brief:',
    `- Name: ${idea.name}`,
    `- One-liner: ${idea.tagline}`,
    `- Category: ${idea.category}`,
    `- Monetization: ${idea.monetization_model ?? 'waitlist first, monetization TBD'}`,
  ];
  if (idea.rationale) lines.push(`- Rationale: ${idea.rationale}`);
  if (idea.distribution_channels?.length) {
    lines.push(`- Channels: ${idea.distribution_channels.join(', ')}`);
  }
  if (idea.assets_leveraged?.length) {
    lines.push(`- Bricks leveraged: ${idea.assets_leveraged.join(', ')}`);
  }
  lines.push('');
  lines.push('Before writing, silently identify:');
  lines.push('  1. The specific visitor (role, context, pain)');
  lines.push('  2. The one outcome this product delivers that others miss');
  lines.push('  3. The process/how in 1 verb');
  lines.push('Then write the hero with those answers baked in. Do not output the reasoning.');
  lines.push('');
  lines.push('Return JSON matching:');
  lines.push(`{
  "hero_title": string,
  "hero_tagline": string,
  "hero_cta": string,
  "features": [{ "title": string, "description": string, "icon": string }],
  "faq": [{ "question": string, "answer": string }],
  "footer_note": string,
  "lang": string
}`);
  return lines.join('\n');
}

function validate(c: unknown): c is LandingContent {
  if (!c || typeof c !== 'object') return false;
  const x = c as Record<string, unknown>;
  if (typeof x.hero_title !== 'string' || x.hero_title.length === 0 || x.hero_title.length > 120) return false;
  if (typeof x.hero_tagline !== 'string' || x.hero_tagline.length === 0 || x.hero_tagline.length > 240) return false;
  if (typeof x.hero_cta !== 'string' || x.hero_cta.length === 0) return false;
  if (!Array.isArray(x.features) || x.features.length < 2 || x.features.length > 8) return false;
  for (const f of x.features) {
    if (!f || typeof f !== 'object') return false;
    const ff = f as Record<string, unknown>;
    if (typeof ff.title !== 'string' || typeof ff.description !== 'string') return false;
    // Icon is optional — pad with default if missing (Gemini sometimes drops it)
    if (typeof ff.icon !== 'string' || !ff.icon) ff.icon = '✨';
  }
  if (!Array.isArray(x.faq) || x.faq.length < 2 || x.faq.length > 8) return false;
  for (const q of x.faq) {
    if (!q || typeof q !== 'object') return false;
    const qq = q as Record<string, unknown>;
    if (typeof qq.question !== 'string' || typeof qq.answer !== 'string') return false;
  }
  if (typeof x.footer_note !== 'string') return false;
  if (typeof x.lang !== 'string' || x.lang.length < 2) return false;
  return true;
}

export async function renderLanding(idea: RenderIdeaInput): Promise<LandingRenderResult> {
  const prompt = buildPrompt(idea);
  try {
    const out = await withFallback(
      {
        system: LANDING_SYSTEM,
        prompt,
        maxTokens: 4000,
        temperature: 0.5,
      },
      {
        project: 'cc',
        order: ['gemini', 'mistral', 'groq', 'openrouter', 'anthropic', 'openai'],
      },
    );
    const cleaned = stripPreamble(out.text);
    const parsed = extractJSON<LandingContent>(cleaned);
    if (!validate(parsed)) {
      return { ok: false, error: 'validation failed: shape mismatch' };
    }
    return {
      ok: true,
      content: { ...parsed, generated_with: out.provider },
      cost_usd: out.costUsd ?? 0,
      provider: out.provider,
    };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
