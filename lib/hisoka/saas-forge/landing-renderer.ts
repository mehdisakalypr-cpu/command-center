import { withFallback, extractJSON, stripPreamble, STRICT_JSON_DIRECTIVE } from '@/lib/ai-pool/cascade';
import type { LandingContent, LandingRenderResult } from './types';

const LANDING_SYSTEM = `You are a senior conversion copywriter who has written landings for Stripe, Linear, Vercel, Figma.
Before writing, silently research the market around the given idea: who buys similar tools today, what they pay,
what pains drain their week, what ROI a well-executed solution should produce. Then write the landing so every
sentence echoes that context — no generic SaaS filler.

Reference (Feel The Gap style — emulate the tightness):
  hero_title: "Find where to sell before everyone else"
  hero_tagline: "From raw data to actionable opportunities"

Hero pattern:
  - hero_title = ACTION VERB + CONCRETE OUTCOME for the specific visitor you identified.
    Must answer "what does the visitor GET in one line". Under 70 chars ideal, max 90.
    No nouns-only titles. No passive voice. No AI jargon. Banned words:
    "revolutionary", "cutting-edge", "game-changing", "next-gen", "unlock", "supercharge",
    "empower", "seamlessly", "leverage" (verb).
    "AI" is allowed only if the product IS AI — never as ornament.
  - hero_tagline = HOW we deliver, 6-12 words, process summary. Under 100 chars.

Feature rules (3-6 items):
  - title <=50 chars, starts with an action verb OR a metric.
  - description <=180 chars. State WHO it is for, WHAT they do today that breaks, HOW we fix it.
    Quantify when possible ("save 4h/week", "3x reply rate", "cut CAC by 30%").
  - icon: one relevant emoji.

FAQ rules (3-5 items):
  - Address REAL buyer objections: how it compares to [named competitor or status quo],
    pricing concern, data/privacy, timeline, onboarding effort.
  - Answers <=280 chars, concrete, no hedge words ("might", "could", "may").
  - At least one FAQ must compare to an existing alternative by name or category
    ("vs building it in-house", "vs [Competitor] — we focus on X").

footer_note: one honest sentence (e.g. "Built by a solo founder. Early access — expect rough edges.").

hero_image_prompt rule (CRITICAL):
  Describe a CONCRETE use-case scene that illustrates the product's benefit for its specific user.
  Think: who is in the scene, what are they doing, what is the product showing them, what does the
  outcome look like. Example inputs → prompts:
    - "AI Personal Coach" → "A young professional woman in a bright modern apartment looking at a
       holographic tablet showing a progression chart and weekly goals with a friendly AI assistant
       avatar guiding her, soft morning light, editorial photography, warm color grade"
    - "Market Trends Dashboard" → "An analyst at a clean desk studying a large monitor with
       real-time stock trend waves and heatmaps, notes scattered with key insights highlighted,
       daylight window behind, shallow depth of field, editorial"
    - "B2B Matching" → "Two founders meeting in a sunny co-working space, laptops side by side
       showing a matched partnership dashboard with green approval signals, handshake moment,
       candid photography"
  Rules:
    - 20-60 words. Specific scene. Real people or objects, not abstract shapes.
    - Must convey the OUTCOME the product creates, visualized.
    - End with "editorial photography, cinematic, soft natural light, rich detail".
    - No logos, no text overlays, no brand names in the scene.

Language rules:
  - lang: ISO code matching target market ('en' default, 'fr' if clearly francophone, 'es' etc.).
  - All text in that language. No mixed languages. No placeholders, no TODOs, no lorem ipsum.

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
  "lang": string,
  "hero_image_prompt": string
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
  // hero_image_prompt is optional (older landings don't have it); when present, must be non-empty.
  if (x.hero_image_prompt !== undefined && (typeof x.hero_image_prompt !== 'string' || x.hero_image_prompt.length < 20)) return false;
  return true;
}

/** Pollinations free image gen (URL-based, no API key). Use for hero use-case illustration. */
export function pollinationsHeroUrl(prompt: string, seed: number): string {
  const width = 1920;
  const height = 1080;
  const q = encodeURIComponent(prompt);
  return `https://image.pollinations.ai/prompt/${q}?width=${width}&height=${height}&seed=${seed}&nologo=true&enhance=true&model=flux`;
}

function stableSeed(text: string): number {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash) % 99_999;
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
    // Compute hero_image_url (Pollinations) if prompt was produced.
    const heroPrompt = parsed.hero_image_prompt;
    const hero_image_url = heroPrompt
      ? pollinationsHeroUrl(heroPrompt, stableSeed(idea.name + ':' + heroPrompt))
      : undefined;
    return {
      ok: true,
      content: { ...parsed, hero_image_url, generated_with: out.provider },
      cost_usd: out.costUsd ?? 0,
      provider: out.provider,
    };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
