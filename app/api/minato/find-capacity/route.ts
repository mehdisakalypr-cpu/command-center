/**
 * POST /api/minato/find-capacity
 * Given a provider gap (or auto-detected from api_keys_registry vs need),
 * returns a concrete FREE-TIER acquisition plan: accounts to create,
 * URLs, email aliases (catch-all ofaops.xyz), env vars, quotas gained.
 *
 * Body: { provider?: string; gap?: number; productGoal?: string }
 *   - If provider+gap omitted, reads active api_keys_registry counts vs a
 *     recommended baseline and returns the biggest gap.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const sb = () => createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY!,
)

type ProviderPlan = {
  provider: string
  label: string
  signup_url: string
  quota_per_account: string
  env_vars: string[]                 // env var names to add per account
  steps: string[]                    // user-facing checklist
  alias_pattern: string              // email alias to use (ofaops.xyz catch-all)
  time_per_account_min: number
  cost_eur_per_account: number
}

const PROVIDER_CATALOG: Record<string, ProviderPlan> = {
  cloudflare: {
    provider: 'cloudflare', label: 'Cloudflare Workers AI (FLUX-1-schnell)',
    signup_url: 'https://dash.cloudflare.com/sign-up',
    quota_per_account: '10 000 neurones/jour (~500 images FLUX schnell)',
    env_vars: ['CF_ACCOUNT_ID_N', 'CF_API_TOKEN_N'],
    steps: [
      'Créer un compte Cloudflare avec l\'alias email',
      'Activer Workers AI (gratuit) dans le dashboard',
      'Copier Account ID (URL du dashboard) + créer un API Token (permissions: Workers AI: Read + Edit)',
      'Ajouter CF_ACCOUNT_ID_N et CF_API_TOKEN_N dans /var/www/site-factory/.env.local (incrémenter N)',
      'Redémarrer les agents pour prendre en compte la nouvelle clé',
    ],
    alias_pattern: 'ai-cf-{n}@ofaops.xyz',
    time_per_account_min: 3,
    cost_eur_per_account: 0,
  },
  huggingface: {
    provider: 'huggingface', label: 'HuggingFace Inference API (FLUX, LLMs)',
    signup_url: 'https://huggingface.co/join',
    quota_per_account: '~300 images/h · crédits mensuels gratuits (qty variable)',
    env_vars: ['HUGGINGFACE_API_KEY_N'],
    steps: [
      'Créer un compte HuggingFace avec l\'alias',
      'Settings → Access Tokens → New token (role: read)',
      'Ajouter HUGGINGFACE_API_KEY_N à .env.local (N = prochain index libre)',
    ],
    alias_pattern: 'ai-hf-{n}@ofaops.xyz',
    time_per_account_min: 2,
    cost_eur_per_account: 0,
  },
  gemini: {
    provider: 'gemini', label: 'Google AI Studio (Gemini 2.0/2.5 Flash)',
    signup_url: 'https://aistudio.google.com/',
    quota_per_account: '15 RPM + 1M tokens/day par modèle (Flash)',
    env_vars: ['GOOGLE_API_KEY_N', 'GEMINI_API_KEY_N'],
    steps: [
      'Créer un compte Google avec l\'alias (ou utiliser existant)',
      'AI Studio → Get API Key → Create in new project',
      'Ajouter GOOGLE_API_KEY_N (ou GEMINI_API_KEY_N) à .env.local',
    ],
    alias_pattern: 'ai-gemini-{n}@ofaops.xyz',
    time_per_account_min: 2,
    cost_eur_per_account: 0,
  },
  groq: {
    provider: 'groq', label: 'Groq LPU (Llama 3.3 70B ultra-fast)',
    signup_url: 'https://console.groq.com/',
    quota_per_account: '30 RPM · 14 400 req/day (Llama 3.3 70B)',
    env_vars: ['GROQ_API_KEY_N'],
    steps: [
      'S\'inscrire sur console.groq.com avec l\'alias',
      'API Keys → Create API Key',
      'Ajouter GROQ_API_KEY_N à .env.local',
    ],
    alias_pattern: 'ai-groq-{n}@ofaops.xyz',
    time_per_account_min: 2,
    cost_eur_per_account: 0,
  },
  together: {
    provider: 'together', label: 'Together AI (FLUX, Llama, Mixtral)',
    signup_url: 'https://api.together.xyz/',
    quota_per_account: '~10 RPM FLUX · crédits free trial',
    env_vars: ['TOGETHER_API_KEY_N'],
    steps: [
      'S\'inscrire sur api.together.xyz avec l\'alias',
      'Settings → API Keys → Create',
      'Ajouter TOGETHER_API_KEY_N à .env.local',
    ],
    alias_pattern: 'ai-together-{n}@ofaops.xyz',
    time_per_account_min: 2,
    cost_eur_per_account: 0,
  },
  fal: {
    provider: 'fal', label: 'fal.ai (FLUX schnell, Stable Video)',
    signup_url: 'https://fal.ai/',
    quota_per_account: '~$0.10 crédits d\'inscription (variable)',
    env_vars: ['FAL_KEY_N'],
    steps: [
      'S\'inscrire sur fal.ai avec l\'alias',
      'Dashboard → API Keys → Create',
      'Ajouter FAL_KEY_N à .env.local',
    ],
    alias_pattern: 'ai-fal-{n}@ofaops.xyz',
    time_per_account_min: 2,
    cost_eur_per_account: 0,
  },
  places: {
    provider: 'places', label: 'Google Places API (validation + photos)',
    signup_url: 'https://console.cloud.google.com/',
    quota_per_account: '$200 de crédit gratuit/mois pour Maps Platform',
    env_vars: ['GOOGLE_PLACES_API_KEY_N'],
    steps: [
      'Créer projet GCP avec l\'alias',
      'Enable APIs: Places API (New), Geocoding',
      'Credentials → Create API Key, restrict to the enabled APIs',
      'Ajouter GOOGLE_PLACES_API_KEY_N à .env.local',
    ],
    alias_pattern: 'ai-places-{n}@ofaops.xyz',
    time_per_account_min: 4,
    cost_eur_per_account: 0,
  },
  resend: {
    provider: 'resend', label: 'Resend (outreach email)',
    signup_url: 'https://resend.com/',
    quota_per_account: '3 000 emails/mois free tier',
    env_vars: ['RESEND_API_KEY_N'],
    steps: [
      'Créer compte resend.com avec l\'alias',
      'Domains → Add Domain (ofaops.xyz) + setup DNS',
      'API Keys → Create',
      'Ajouter RESEND_API_KEY_N à .env.local',
    ],
    alias_pattern: 'ai-resend-{n}@ofaops.xyz',
    time_per_account_min: 5,
    cost_eur_per_account: 0,
  },
}

async function countActiveByProvider(): Promise<Record<string, number>> {
  try {
    const { data } = await sb().from('api_keys_registry').select('provider, status')
    const out: Record<string, number> = {}
    for (const r of (data as any[]) ?? []) {
      if (r.status === 'active') out[r.provider] = (out[r.provider] ?? 0) + 1
    }
    return out
  } catch { return {} }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({} as any))
  const provider: string | undefined = body.provider
  const gap: number | undefined = body.gap
  const counts = await countActiveByProvider()

  let plans: Array<ProviderPlan & { accounts_to_create: number; active_now: number; aliases: string[]; quota_gained: string }> = []

  const providerKeys = provider ? [provider] : Object.keys(PROVIDER_CATALOG)
  for (const key of providerKeys) {
    const p = PROVIDER_CATALOG[key]
    if (!p) continue
    const nNow = counts[key] ?? 0
    const n = Math.max(1, Number(gap || (provider ? 1 : 2)))
    const aliases: string[] = []
    for (let i = 0; i < n; i++) aliases.push(p.alias_pattern.replace('{n}', String(nNow + i + 1)))
    plans.push({
      ...p,
      active_now: nNow,
      accounts_to_create: n,
      aliases,
      quota_gained: `${n} × ${p.quota_per_account}`,
    })
  }

  // Sort: biggest gap / lowest active first (most urgent).
  plans.sort((a, b) => a.active_now - b.active_now)

  const totalTimeMin = plans.reduce((s, p) => s + p.accounts_to_create * p.time_per_account_min, 0)
  const totalCost = plans.reduce((s, p) => s + p.accounts_to_create * p.cost_eur_per_account, 0)

  return NextResponse.json({
    ok: true,
    generated_at: new Date().toISOString(),
    plans,
    summary: {
      total_accounts_to_create: plans.reduce((s, p) => s + p.accounts_to_create, 0),
      total_time_min: totalTimeMin,
      total_cost_eur: totalCost,
      note: 'Toutes les inscriptions utilisent le catch-all ofaops.xyz (aliases uniques), quota gratuit, zéro carte bancaire sauf Places (gratuit jusqu\'à 200$/mo).',
    },
  })
}

export async function GET() {
  return NextResponse.json({ ok: true, catalog: Object.keys(PROVIDER_CATALOG) })
}
