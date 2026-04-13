/**
 * POST /api/minato/strategy
 * Diagnostic + plan d'action quand SCALE échoue ou quand l'utilisateur clique
 * "find capacity". Minato analyse :
 *   - Le dernier scale_request en err pour cet agent (logs, error_msg)
 *   - Les comptes API actifs (api_keys_registry) vs besoin
 *   - Les tâches en cours (compute/status)
 *   - L'objectif MRR validé (agent_targets) vs ce qui est déjà en pipeline
 *
 * Retourne un diagnostic catégorisé + 3 options FREE / FIXED / HYBRID, chacune
 * avec coût, temps setup, débit ajouté, actions concrètes.
 *
 * Body: { agent: string, requestId?: number, gap?: number }
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const sb = () => createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY!,
)

// Mapping agent → providers nécessaires (from reference_autoscale_scenarios.md).
const AGENT_PROVIDERS: Record<string, string[]> = {
  'ofa:scout-osm':           ['overpass'],
  'ofa:hyperscale-scout':    ['gemini', 'groq'],
  'ofa:generate-for-leads':  ['gemini', 'groq', 'cloudflare', 'huggingface'],
  'ofa:generate-for-reachable': ['gemini', 'groq', 'cloudflare', 'huggingface'],
  'ofa:enrich-contacts':     ['places'],
  'ofa:outreach':            ['resend'],
  'ofa:classifier-auto':     ['gemini', 'groq'],
  'ofa:reviews-checker':     ['places'],
  'ofa:fix-demos':           ['cloudflare', 'huggingface', 'gemini'],
  'ftg:seo-factory':         ['gemini', 'groq'],
}

// === Catalogues ===
// 1. UI subscriptions (Claude/ChatGPT/Gemini Pro etc) — fixed monthly, no usage.
const UI_SUBSCRIPTIONS = [
  { name: 'Claude Code (2nd seat)',  provider: 'anthropic',  monthly_eur: 20, gain: '+1× Opus 4.6 1M ctx full sessions', signup: 'https://claude.ai/upgrade',          best_for: ['gemini','groq','cloudflare','huggingface'] },
  { name: 'Claude Pro',              provider: 'anthropic',  monthly_eur: 20, gain: '+5× usage Sonnet/Opus chat',         signup: 'https://claude.ai/upgrade',          best_for: ['gemini','groq'] },
  { name: 'ChatGPT Plus',            provider: 'openai',     monthly_eur: 20, gain: '+1× GPT-4o + DALL-E + GPTs',         signup: 'https://chatgpt.com/upgrade',        best_for: ['gemini','groq','cloudflare'] },
  { name: 'Gemini Advanced',         provider: 'google',     monthly_eur: 22, gain: '+1× Gemini 2.5 Pro + Workspace AI',  signup: 'https://gemini.google/advanced/',    best_for: ['gemini'] },
  { name: 'MidJourney Standard',     provider: 'midjourney', monthly_eur: 30, gain: '15h GPU/mo · qualité hero photoréaliste', signup: 'https://www.midjourney.com/account', best_for: ['cloudflare','huggingface'] },
  { name: 'Perplexity Pro',          provider: 'perplexity', monthly_eur: 20, gain: 'Recherche web premium + GPT-4',       signup: 'https://www.perplexity.ai/pro',      best_for: [] },
]

// 2. Fixed paid API plans (capped monthly, NOT usage-based).
const FIXED_PAID_APIS = [
  { name: 'Resend Pro',              provider: 'resend',     monthly_eur: 18, gain: '50K emails/mo, custom domain, analytics', signup: 'https://resend.com/pricing',      best_for: ['resend'] },
  { name: 'Cloudflare Workers Paid', provider: 'cloudflare', monthly_eur: 5,  gain: '10M requêtes/mo + AI plus large quota', signup: 'https://dash.cloudflare.com/?to=/:account/workers/plans', best_for: ['cloudflare'] },
  { name: 'HuggingFace Pro',         provider: 'huggingface',monthly_eur: 9,  gain: '20× quota Inference + private repos',   signup: 'https://huggingface.co/subscribe/pro', best_for: ['huggingface'] },
  { name: 'Vercel Pro (extra seat)', provider: 'vercel',     monthly_eur: 18, gain: 'Builds ×, fonctions 60s, monitoring',  signup: 'https://vercel.com/pricing',         best_for: [] },
  { name: 'GitHub Copilot Business', provider: 'github',     monthly_eur: 19, gain: '+ AI code review, fleet seat',         signup: 'https://github.com/features/copilot', best_for: [] },
]

// 3. Pure-AI automated path: AI itself creates the account via Playwright/MCP — no human click.
//    Note: many providers (CF, Resend) have anti-bot. Marked "feasibility" honestly.
const AUTO_AI_ACTIONS = {
  available_today: [
    { what: 'Lancer un nouveau scout OSM avec --shards=4 (sharding code-only)', risk: 'low',     cost: 0,  human_click: 0 },
    { what: 'Spawner une instance enrich-leads supplémentaire (queue scale-agent)', risk: 'low',  cost: 0,  human_click: 0 },
    { what: 'Réutiliser les comptes Cloudflare/HF/Gemini déjà en pool (rotation)', risk: 'low', cost: 0,  human_click: 0 },
    { what: 'Activer Pollinations + persist storage (qualité variable mais infinie)', risk: 'low', cost: 0, human_click: 0 },
  ],
  feasible_with_playwright: [
    { what: 'Créer un compte HuggingFace via Playwright + alias ofaops.xyz + récupérer token', risk: 'medium · captcha possible', cost: 0, human_click: 0, eta_min: 4 },
    { what: 'Créer un compte Groq via Playwright', risk: 'medium · captcha possible', cost: 0, human_click: 0, eta_min: 3 },
    { what: 'Créer un compte Gemini AI Studio (Google login requis)', risk: 'high · Google anti-bot', cost: 0, human_click: 0, eta_min: 6 },
  ],
  blocked_by_antibot: [
    { what: 'Cloudflare account creation', risk: 'high · CF Turnstile' },
    { what: 'Resend account creation', risk: 'medium · email verify' },
    { what: 'Stripe / financial accounts', risk: 'critical · KYC' },
  ],
}

// Free-tier catalog (mirror of /api/minato/find-capacity but slimmer).
const FREE_TIERS: Record<string, { signup: string; quota: string; alias: string; setup_min: number }> = {
  cloudflare:  { signup: 'https://dash.cloudflare.com/sign-up',     quota: '10K neurones/j (~500 img FLUX)',  alias: 'ai-cf-{n}@ofaops.xyz',  setup_min: 3 },
  huggingface: { signup: 'https://huggingface.co/join',             quota: '~300 img/h (FLUX)',                alias: 'ai-hf-{n}@ofaops.xyz',  setup_min: 2 },
  gemini:      { signup: 'https://aistudio.google.com/',            quota: '15 RPM · 1M tokens/jour',          alias: 'ai-gemini-{n}@ofaops.xyz', setup_min: 2 },
  groq:        { signup: 'https://console.groq.com/',               quota: '30 RPM · 14 400 req/jour',         alias: 'ai-groq-{n}@ofaops.xyz', setup_min: 2 },
  together:    { signup: 'https://api.together.xyz/',               quota: '~10 RPM FLUX',                     alias: 'ai-together-{n}@ofaops.xyz', setup_min: 2 },
  fal:         { signup: 'https://fal.ai/',                         quota: '$0.10 free credits',               alias: 'ai-fal-{n}@ofaops.xyz', setup_min: 2 },
  places:      { signup: 'https://console.cloud.google.com/',       quota: '$200 credits Maps Platform',       alias: 'ai-places-{n}@ofaops.xyz', setup_min: 4 },
  resend:      { signup: 'https://resend.com/',                     quota: '3 000 emails/mois',                alias: 'ai-resend-{n}@ofaops.xyz', setup_min: 5 },
  overpass:    { signup: '(no signup, public OSM)',                 quota: 'best-effort, 504/429 sous charge', alias: '—',                     setup_min: 0 },
}

const FREE_BLOCKERS: string[] = [
  'AiError', 'allocation', 'rate', '429', 'quota', '402', 'depleted', 'unauthorized', 'GOOGLE_PLACES_API_KEY missing', 'RESEND_API_KEY missing', 'HF_TOKEN', 'HUGGINGFACE',
]

async function getActiveByProvider(): Promise<Record<string, number>> {
  try {
    const { data } = await sb().from('api_keys_registry').select('provider, status')
    const out: Record<string, number> = {}
    for (const r of (data as any[]) ?? []) if (r.status === 'active') out[r.provider] = (out[r.provider] ?? 0) + 1
    return out
  } catch { return {} }
}

async function getMrrTarget(): Promise<{ product?: string; objectiveValue?: number; objectiveType?: string; horizonDays?: number } | null> {
  try {
    const { data } = await sb().from('agent_targets').select('product, target_json').order('updated_at', { ascending: false }).limit(1)
    if (!data?.length) return null
    const t = (data[0] as any).target_json
    return { product: (data[0] as any).product, objectiveValue: t.objectiveValue, objectiveType: t.objectiveType, horizonDays: t.horizonDays }
  } catch { return null }
}

async function getInProgressJobs(): Promise<{ name: string; status: string; project: string }[]> {
  // Reuse compute/status logic at a distance: tail known logs + count alive PIDs cheaply.
  const fs = await import('node:fs')
  const candidates = [
    ['/tmp/osm-scout-v4.log', 'osm-scout', 'ofa'],
    ['/tmp/gen-reachable-v2.log', 'gen-reachable', 'ofa'],
    ['/tmp/enrich-osm.log', 'enrich-contacts', 'ofa'],
    ['/tmp/ftg-seo.log', 'seo-factory', 'ftg'],
  ]
  const out: { name: string; status: string; project: string }[] = []
  for (const [p, name, project] of candidates) {
    try {
      const st = fs.statSync(p)
      const ageMin = (Date.now() - st.mtimeMs) / 60000
      out.push({ name, status: ageMin < 5 ? 'running' : ageMin < 30 ? 'idle' : 'stale', project })
    } catch { out.push({ name, status: 'absent', project }) }
  }
  return out
}

function categorizeError(errMsg: string | null, lastLogTail: string): { category: 'CAN_SCALE' | 'CANNOT_BECAUSE' | 'CAN_IF' | 'NEED_FREE_ACCOUNTS' | 'NEED_FIXED_SUB' | 'BUG'; reason: string; blocked_provider?: string } {
  const text = `${errMsg ?? ''}\n${lastLogTail}`.toLowerCase()
  // Known blockers → free accounts
  for (const provider of Object.keys(FREE_TIERS)) {
    if (text.includes(provider)) {
      // detect specific quota/key wording
      if (/missing|empty|null|undefined/.test(text)) return { category: 'NEED_FREE_ACCOUNTS', reason: `${provider} key missing or empty in env`, blocked_provider: provider }
      if (/quota|rate|429|402|allocation|depleted/.test(text)) return { category: 'NEED_FREE_ACCOUNTS', reason: `${provider} quota exhausted`, blocked_provider: provider }
    }
  }
  if (FREE_BLOCKERS.some(b => text.toLowerCase().includes(b.toLowerCase()))) return { category: 'NEED_FREE_ACCOUNTS', reason: 'API quota or missing key — solvable by adding more free-tier accounts' }
  if (/eaddrinuse|enoent|cannot find module|syntaxerror|typeerror/i.test(text)) return { category: 'BUG', reason: 'Code-level error — needs a fix, not more capacity' }
  if (/timeout|fetch failed|503|504|network/i.test(text)) return { category: 'CAN_IF', reason: 'Transient network/upstream issue — retry recommended' }
  if (!errMsg) return { category: 'CAN_SCALE', reason: 'No blocker detected, scale should succeed' }
  return { category: 'CANNOT_BECAUSE', reason: errMsg.slice(0, 200) }
}

function tailLog(path?: string, lines = 30): string {
  if (!path) return ''
  try {
    const fs = require('node:fs') as typeof import('node:fs')
    const buf = fs.readFileSync(path, 'utf8')
    return buf.split('\n').slice(-lines).join('\n')
  } catch { return '' }
}

export async function POST(req: NextRequest) {
  const { agent, requestId, gap } = await req.json().catch(() => ({} as any))
  if (!agent) return NextResponse.json({ ok: false, error: 'agent required' }, { status: 400 })

  // 1. Pull the last failed scale_request for this agent (or the requestId).
  let lastReq: any = null
  if (requestId) {
    const { data } = await sb().from('scale_requests').select('*').eq('id', requestId).single()
    lastReq = data
  } else {
    const { data } = await sb().from('scale_requests').select('*').eq('agent', agent).order('requested_at', { ascending: false }).limit(1)
    lastReq = data?.[0] ?? null
  }
  const logTail = tailLog(lastReq?.log_paths?.[0], 30)
  const diagnosis = categorizeError(lastReq?.error_msg ?? null, logTail)

  // 2. Active accounts vs needed providers.
  const active = await getActiveByProvider()
  const providers = AGENT_PROVIDERS[agent] ?? []
  const accountStatus = providers.map(p => ({ provider: p, active: active[p] ?? 0, free_tier: FREE_TIERS[p] ?? null }))

  // 3. Tasks in progress.
  const jobs = await getInProgressJobs()

  // 4. Target MRR + reste à faire.
  const target = await getMrrTarget()

  // 5. Build 5 options (priorité décroissante d'autonomie + croissante de coût).
  const targetGap = gap ?? 1

  // OPTION A — FULL AUTO IA (zéro humain, zéro coût) — uses what we already have.
  const auto_ai_option = {
    name: 'A · FULL AUTO IA (0 humain, 0 €)',
    monthly_eur: 0,
    human_clicks: 0,
    setup_min: 0,
    feasible: true,
    actions_now: AUTO_AI_ACTIONS.available_today,
    actions_with_playwright: AUTO_AI_ACTIONS.feasible_with_playwright,
    blocked: AUTO_AI_ACTIONS.blocked_by_antibot,
    pros: ['Zéro intervention humaine', 'Zéro coût', 'Activable immédiatement'],
    cons: ['Limité aux ressources déjà en place', 'Playwright signup = risque captcha', 'Plafonné par les quotas existants'],
    summary: 'Réutilise/multiplie ce qui existe + tente automation des signups simples (HF, Groq). Couvre 100% du gap si quota suffit.',
  }

  // OPTION B — FREE-TIER KEYS (humain crée comptes, 0 €).
  const free_option = {
    name: 'B · FREE-TIER (0 €, humain ~3 min/compte)',
    monthly_eur: 0,
    human_clicks: providers.length * targetGap,
    setup_min: providers.reduce((s, p) => s + ((FREE_TIERS[p]?.setup_min ?? 0) * targetGap), 0),
    actions: providers.flatMap(p => {
      const ft = FREE_TIERS[p]; if (!ft) return []
      const aliases = Array.from({ length: targetGap }, (_, i) => ft.alias.replace('{n}', String((active[p] ?? 0) + i + 1)))
      return [{
        provider: p, label: ft.signup === '(no signup, public OSM)' ? 'OSM Overpass (déjà actif)' : `Créer ${targetGap}× compte ${p}`,
        signup_url: ft.signup, quota_gain: ft.quota, aliases, setup_min: ft.setup_min,
      }]
    }),
    pros: ['Coût 0 €', 'Pas de carte bancaire (sauf Places)', 'Multipliable à l\'infini via aliases ofaops.xyz'],
    cons: ['Setup manuel humain par compte', 'Captcha possible', 'Quotas free souvent capés à la journée'],
  }

  // OPTION C — FIXED PAID API (plan mensuel API capé).
  const fixed_apis_match = FIXED_PAID_APIS.filter(s => providers.some(p => s.best_for.includes(p)))
  const fixed_api_option = {
    name: 'C · FIXED PAID API (plan mensuel capé)',
    monthly_eur: fixed_apis_match.slice(0, 2).reduce((s, x) => s + x.monthly_eur, 0),
    human_clicks: fixed_apis_match.slice(0, 2).length,
    setup_min: 8,
    subscriptions: fixed_apis_match.slice(0, 2),
    pros: ['Coût mensuel prédictible (jamais à l\'usage)', 'Quota beaucoup plus large', 'Qualité Pro (Resend custom domain etc)'],
    cons: ['Carte bancaire requise', 'Engagement mensuel'],
  }

  // OPTION D — UI SUBSCRIPTIONS (Claude Code 2nd seat, ChatGPT Plus, etc).
  const ui_subs_match = UI_SUBSCRIPTIONS.filter(s => providers.some(p => s.best_for.includes(p)))
  const ui_sub_option = {
    name: 'D · UI SUBSCRIPTIONS (Claude / ChatGPT / Gemini Pro)',
    monthly_eur: ui_subs_match.slice(0, 2).reduce((s, x) => s + x.monthly_eur, 0),
    human_clicks: ui_subs_match.slice(0, 2).length,
    setup_min: 10,
    subscriptions: ui_subs_match.slice(0, 2),
    pros: ['Plus de puissance cognitive (sessions Claude Code)', 'Meilleur ratio qualité/coût pour debug + analyses', 'Permet à l\'IA d\'aller plus loin sans usage-based'],
    cons: ['Nécessite usage UI (pas API directe)', 'Accès interactif, pas batch headless'],
  }

  // OPTION E — HYBRID (combinaisons recommandées).
  const hybrid_option = {
    name: 'E · HYBRID (Auto IA + 1-2 free + 1 abo clé)',
    monthly_eur: fixed_apis_match.slice(0, 1).reduce((s, x) => s + x.monthly_eur, 0),
    human_clicks: 1 + free_option.actions.slice(0, 1).length,
    setup_min: 12,
    composition: {
      auto_ai: AUTO_AI_ACTIONS.available_today.slice(0, 2),
      free: free_option.actions.slice(0, 2),
      fixed_api: fixed_apis_match.slice(0, 1),
      ui_sub: ui_subs_match.slice(0, 1),
    },
    pros: ['Couvre 99% du gap MRR avec 1 seul abo + setup minimum', 'Budget connu (max ~20-40 €/mo)', 'Zéro usage-based'],
    cons: ['Setup combiné requiert 10-15 min humain'],
    recommended: true,
  }

  return NextResponse.json({
    ok: true,
    agent,
    diagnosis,
    last_request: lastReq ? {
      id: lastReq.id, status: lastReq.status, instances: lastReq.instances, error_msg: lastReq.error_msg,
      log_tail: logTail.slice(-1500),
    } : null,
    accounts: accountStatus,
    in_progress: jobs,
    mrr_target: target,
    options: {
      auto_ai: auto_ai_option,
      free: free_option,
      fixed_api: fixed_api_option,
      ui_sub: ui_sub_option,
      hybrid: hybrid_option,
    },
    recommended: 'hybrid',
    summary: {
      message: diagnosis.category === 'CAN_SCALE'
        ? `Tu peux scaler ${agent} maintenant — aucun blocker détecté.`
        : diagnosis.category === 'NEED_FREE_ACCOUNTS'
        ? `${agent} ne peut pas scaler tant que ${diagnosis.blocked_provider ?? 'le provider en goulot'} n'a pas plus de capacité. Solution recommandée : créer ${targetGap}× compte gratuit (option FREE).`
        : diagnosis.category === 'CAN_IF'
        ? `${agent} peut scaler après un retry / fix transient.`
        : diagnosis.category === 'BUG'
        ? `${agent} a une erreur code, pas de capacité — pas la peine d'ajouter des comptes.`
        : `${agent} ne peut pas scaler : ${diagnosis.reason}`,
    },
  })
}
