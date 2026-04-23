import type { SupabaseClient } from '@supabase/supabase-js';

const SOURCE_LOCALE = 'en';

const TRANSLATABLE_SCALAR_FIELDS = ['name', 'tagline', 'rationale', 'compliance_notes', 'scalability_per_worker'] as const;

const TRANSLATABLE_STRING_ARRAY_FIELDS = ['distribution_channels', 'assets_leveraged'] as const;

export const SUPPORTED_LOCALES = [
  'en', 'fr', 'es', 'pt', 'ar', 'zh', 'de', 'tr', 'ja', 'ko', 'hi', 'ru', 'id', 'sw', 'it',
] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export function isSupportedLocale(x: string | null | undefined): x is SupportedLocale {
  return !!x && (SUPPORTED_LOCALES as readonly string[]).includes(x);
}

type Idea = Record<string, unknown>;

type CachedRow = { fields: Record<string, unknown>; translated_at: string };

type TranslatePayload = {
  scalars: Record<string, string>;
  arrays: Record<string, string[]>;
  agents: Array<{ name: string; role: string; covers_dim: string }>;
};

function pickPayload(idea: Idea): TranslatePayload {
  const scalars: Record<string, string> = {};
  for (const f of TRANSLATABLE_SCALAR_FIELDS) {
    const v = idea[f];
    if (typeof v === 'string' && v.trim().length > 0) scalars[f] = v;
  }

  const arrays: Record<string, string[]> = {};
  for (const f of TRANSLATABLE_STRING_ARRAY_FIELDS) {
    const v = idea[f];
    if (Array.isArray(v) && v.every((x) => typeof x === 'string')) {
      const clean = (v as string[]).filter((s) => s.trim().length > 0);
      if (clean.length > 0) arrays[f] = clean;
    }
  }

  const agentsRaw = idea.new_minato_agents_needed;
  const agents: Array<{ name: string; role: string; covers_dim: string }> = [];
  if (Array.isArray(agentsRaw)) {
    for (const a of agentsRaw as Array<Record<string, unknown>>) {
      const name = typeof a.name === 'string' ? a.name : '';
      const role = typeof a.role === 'string' ? a.role : '';
      const covers_dim = typeof a.covers_dim === 'string' ? a.covers_dim : '';
      if (name || role || covers_dim) agents.push({ name, role, covers_dim });
    }
  }

  return { scalars, arrays, agents };
}

function mergeTranslation(idea: Idea, translated: Record<string, unknown>): Idea {
  const out: Idea = { ...idea };
  for (const f of TRANSLATABLE_SCALAR_FIELDS) {
    const v = translated[f];
    if (typeof v === 'string' && v.trim().length > 0) out[f] = v;
  }
  for (const f of TRANSLATABLE_STRING_ARRAY_FIELDS) {
    const v = translated[f];
    if (Array.isArray(v) && v.every((x) => typeof x === 'string')) out[f] = v;
  }
  const agents = translated.new_minato_agents_needed;
  if (Array.isArray(agents) && Array.isArray(idea.new_minato_agents_needed)) {
    const orig = idea.new_minato_agents_needed as Array<Record<string, unknown>>;
    out.new_minato_agents_needed = orig.map((o, i) => {
      const t = (agents[i] ?? {}) as Record<string, unknown>;
      return {
        ...o,
        name: typeof t.name === 'string' ? t.name : o.name,
        role: typeof t.role === 'string' ? t.role : o.role,
        covers_dim: typeof t.covers_dim === 'string' ? t.covers_dim : o.covers_dim,
      };
    });
  }
  return out;
}

async function callAnthropicTranslate(
  payload: TranslatePayload,
  locale: SupportedLocale,
): Promise<Record<string, unknown> | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    console.error('[translate-idea] ANTHROPIC_API_KEY missing');
    return null;
  }

  const userPrompt = [
    `Translate the JSON below from English to ${locale} (ISO 639-1).`,
    'Preserve the exact JSON shape. Translate only human-readable text, not identifiers.',
    'Keep brand names, product names, acronyms, and technical terms (API, SaaS, LLM, SEO, GMV, etc.) untranslated.',
    'Do not add explanations. Return ONLY the JSON object, nothing else.',
    '',
    JSON.stringify(payload, null, 2),
  ].join('\n');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4000,
      system:
        'You are a professional translator. Output STRICT JSON matching the input shape. No preamble, no markdown fences.',
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.error('[translate-idea] anthropic error', res.status, body.slice(0, 300));
    return null;
  }

  const j = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
  const text = j.content?.find((c) => c.type === 'text')?.text ?? '';
  const clean = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '');
  try {
    const parsed = JSON.parse(clean) as { scalars?: Record<string, string>; arrays?: Record<string, string[]>; agents?: Array<Record<string, string>> };
    const flat: Record<string, unknown> = {};
    if (parsed.scalars) Object.assign(flat, parsed.scalars);
    if (parsed.arrays) Object.assign(flat, parsed.arrays);
    if (Array.isArray(parsed.agents)) flat.new_minato_agents_needed = parsed.agents;
    return flat;
  } catch (e) {
    console.error('[translate-idea] JSON parse failed', e, clean.slice(0, 300));
    return null;
  }
}

export async function translateIdea(
  admin: SupabaseClient,
  idea: Idea,
  locale: string,
): Promise<Idea> {
  if (!isSupportedLocale(locale) || locale === SOURCE_LOCALE) return idea;
  const ideaId = idea.id as string;
  if (!ideaId) return idea;

  const { data: cached } = await admin
    .from('business_idea_translations')
    .select('fields, translated_at')
    .eq('idea_id', ideaId)
    .eq('locale', locale)
    .maybeSingle();

  if (cached) {
    return mergeTranslation(idea, (cached as CachedRow).fields);
  }

  const payload = pickPayload(idea);
  if (Object.keys(payload.scalars).length === 0 && Object.keys(payload.arrays).length === 0 && payload.agents.length === 0) {
    return idea;
  }

  const translated = await callAnthropicTranslate(payload, locale);
  if (!translated) return idea;

  await admin
    .from('business_idea_translations')
    .upsert({ idea_id: ideaId, locale, fields: translated }, { onConflict: 'idea_id,locale' });

  return mergeTranslation(idea, translated);
}
