import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

// Per-agent scaling physics. Keep in sync with reference_autoscale_scenarios.md
// and the scale-worker allowlist. This is the single source of truth the UI
// shows to the user before they click SCALE.
type Physics = {
  providers: string[]          // external APIs the agent hits
  partitionKey: string         // how work is split across shards
  blocker: string              // what caps throughput even with more shards
  scaleCeiling: 'horizontal' | 'vertical' | 'both'
  notes?: string
}

const AGENT_PHYSICS: Record<string, Physics> = {
  // OFA
  'ofa:scout-osm':             { providers: ['overpass'], partitionKey: 'city-bbox index i%shards', blocker: 'Overpass 504/429 par IP', scaleCeiling: 'horizontal', notes: 'Public OSM endpoints, pas de clé. Saturation = rotation des 3 endpoints.' },
  'ofa:hyperscale-scout':      { providers: ['gemini', 'groq'], partitionKey: 'country index i%shards', blocker: 'Gemini RPM 15/min/key + daily 1M tokens', scaleCeiling: 'horizontal', notes: 'Ajouter clés Gemini/Groq = +1× capacité par clé.' },
  'ofa:generate-for-leads':    { providers: ['gemini', 'groq', 'cloudflare', 'huggingface'], partitionKey: 'lead_id hash mod shards', blocker: 'Cloudflare neurones/jour ou Gemini RPM', scaleCeiling: 'horizontal' },
  'ofa:generate-for-reachable': { providers: ['gemini', 'groq', 'cloudflare', 'huggingface'], partitionKey: 'lead_id hash mod shards', blocker: 'Cloudflare neurones/jour', scaleCeiling: 'horizontal' },
  'ofa:enrich-contacts':       { providers: ['places'], partitionKey: 'lead_id hash', blocker: 'Google Places $200 crédits/mois', scaleCeiling: 'both', notes: 'Shard = PURE free (scrape HTTP), mais Places API consomme le quota.' },
  'ofa:outreach':              { providers: ['resend'], partitionKey: 'lead_id hash', blocker: 'Resend 3 000 emails/mois/clé', scaleCeiling: 'horizontal', notes: 'Ajouter clé Resend = +3K emails/mois.' },
  'ofa:classifier-auto':       { providers: ['gemini', 'groq'], partitionKey: 'site_id hash', blocker: 'Gemini RPM', scaleCeiling: 'horizontal' },
  'ofa:reviews-checker':       { providers: ['places'], partitionKey: 'place_id hash', blocker: 'Google Places quota', scaleCeiling: 'horizontal' },
  'ofa:fix-demos':             { providers: ['cloudflare', 'huggingface', 'gemini'], partitionKey: 'demo slug index', blocker: 'Idem generate', scaleCeiling: 'horizontal' },
  // FTG
  'ftg:entrepreneur-scout':    { providers: ['gemini', 'groq', 'serper'], partitionKey: 'country index', blocker: 'Serper 2 500 req/mois/clé + Gemini RPM', scaleCeiling: 'horizontal' },
  'ftg:commerce-pitcher':      { providers: ['gemini', 'groq', 'resend'], partitionKey: 'lead_id hash', blocker: 'Resend 3K emails/mois', scaleCeiling: 'horizontal' },
  'ftg:email-nurture':         { providers: ['gemini', 'groq', 'resend'], partitionKey: 'language', blocker: 'Resend ou Gemini RPM', scaleCeiling: 'horizontal', notes: '15 langues max = scaling utile jusqu\'à ×15 shards.' },
  'ftg:investors-scout':       { providers: ['serper'], partitionKey: 'investor type + name hash', blocker: 'Serper 2 500 req/mois/clé', scaleCeiling: 'horizontal' },
  'ftg:exporters-scout':       { providers: ['serper'], partitionKey: 'name hash', blocker: 'Serper quota', scaleCeiling: 'horizontal' },
  'ftg:local-buyers-scout':    { providers: ['serper'], partitionKey: 'buyer type + name hash', blocker: 'Serper quota', scaleCeiling: 'horizontal' },
  'ftg:web-scout':             { providers: ['gemini', 'groq', 'serper'], partitionKey: 'country index', blocker: 'Serper ou Gemini RPM', scaleCeiling: 'horizontal' },
  'ftg:deal-flow-generator':   { providers: ['gemini', 'groq'], partitionKey: 'sector index', blocker: 'Gemini RPM', scaleCeiling: 'horizontal' },
  'ftg:dossier-builder':       { providers: ['gemini', 'groq'], partitionKey: '(single dossier)', blocker: 'Pas de shard — 1 dossier/run', scaleCeiling: 'vertical', notes: 'Scaler = lancer en parallèle avec des args différents, pas via shard.' },
  'ftg:auto-optimizer':        { providers: ['gemini', 'groq'], partitionKey: '(single audit)', blocker: 'Pas de shard — cycle audit+fix', scaleCeiling: 'vertical' },
  'ftg:seo-factory':           { providers: ['gemini', 'groq'], partitionKey: 'country_code index', blocker: 'Gemini RPM', scaleCeiling: 'horizontal' },
}

// Static free-tier quotas per provider (per single account/key).
const FREE_TIERS: Record<string, { label: string; per_key_per_day: number | null; per_key_per_min: number | null; unit: string; signup: string }> = {
  gemini:      { label: 'Google Gemini AI Studio',   per_key_per_day: 1_500_000, per_key_per_min: 15,   unit: 'tokens/jour (et 15 RPM)',        signup: 'https://aistudio.google.com/' },
  groq:        { label: 'Groq',                      per_key_per_day: 14_400,    per_key_per_min: 30,   unit: 'req/jour (30 RPM)',              signup: 'https://console.groq.com/' },
  cloudflare:  { label: 'Cloudflare Workers AI',     per_key_per_day: 10_000,    per_key_per_min: null, unit: 'neurones/jour (~500 img FLUX)',  signup: 'https://dash.cloudflare.com/sign-up' },
  huggingface: { label: 'HuggingFace Inference',     per_key_per_day: 7_200,     per_key_per_min: 120,  unit: 'req/jour (~300/h)',              signup: 'https://huggingface.co/join' },
  resend:      { label: 'Resend',                    per_key_per_day: 100,       per_key_per_min: null, unit: 'emails/jour (3K/mois)',          signup: 'https://resend.com/' },
  places:      { label: 'Google Places API',         per_key_per_day: 11_500,    per_key_per_min: null, unit: 'req/jour ($200 crédit/mois)',    signup: 'https://console.cloud.google.com/' },
  overpass:    { label: 'OSM Overpass API',          per_key_per_day: null,      per_key_per_min: null, unit: 'best-effort (429 sous charge)',  signup: '(public, pas de signup)' },
  serper:      { label: 'Serper.dev',                per_key_per_day: 83,        per_key_per_min: null, unit: 'req/jour (2 500/mois)',          signup: 'https://serper.dev/' },
}

// POST /api/minato/scale-readiness { agent, currentInstances? }
// Returns the scaling physics for one agent: required providers, known
// quotas, active-key count (from api_keys_registry when populated), and a
// verdict that the UI renders beside the SCALE button so users don't click
// blindly when scaling would be blocked by an external quota.
export async function POST(req: Request) {
  const { agent, currentInstances = 1 } = await req.json().catch(() => ({}))
  const phys = AGENT_PHYSICS[agent]
  if (!phys) return NextResponse.json({ ok: false, error: `unknown agent ${agent}` }, { status: 400 })

  const sb = createClient(
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY!,
  )

  // Try to read the registry. If absent (table not created yet), fall back
  // to "unknown" counts — UI will show the static quota only.
  const keyCounts: Record<string, number | null> = {}
  try {
    const { data } = await sb.from('api_keys_registry').select('provider, status')
    const map: Record<string, number> = {}
    for (const r of (data as any[]) ?? []) {
      if (r.status === 'active') map[r.provider] = (map[r.provider] ?? 0) + 1
    }
    for (const p of phys.providers) keyCounts[p] = map[p] ?? 0
  } catch {
    for (const p of phys.providers) keyCounts[p] = null
  }

  // Compute effective daily capacity per provider (keys × per-key quota).
  const providerDetails = phys.providers.map(p => {
    const ft = FREE_TIERS[p]
    const keys = keyCounts[p]
    const perKeyDay = ft?.per_key_per_day ?? null
    const effectiveDaily = (keys !== null && perKeyDay !== null) ? keys * perKeyDay : null
    const perKeyMin = ft?.per_key_per_min ?? null
    const effectiveRpm = (keys !== null && perKeyMin !== null) ? keys * perKeyMin : null
    return {
      provider: p,
      label: ft?.label ?? p,
      unit: ft?.unit ?? '?',
      signup: ft?.signup ?? null,
      keysActive: keys,
      perKeyPerDay: perKeyDay,
      perKeyPerMin: perKeyMin,
      effectiveDaily,
      effectiveRpm,
    }
  })

  // Verdict heuristic:
  //   - no provider requires a key → always OK (free public APIs)
  //   - keys unknown → "unknown, check .env"
  //   - any required provider has 0 keys → blocked
  //   - keys present → can_scale (quota cap stated, user knows the limit)
  let verdict: 'can_scale' | 'blocked' | 'unknown' = 'can_scale'
  let verdictReason = ''
  const noKeyNeeded = phys.providers.every(p => p === 'overpass')
  if (noKeyNeeded) {
    verdictReason = 'APIs publiques, pas de clé requise. Limite = best-effort.'
  } else {
    const unknown = phys.providers.some(p => keyCounts[p] === null)
    const blockers = phys.providers.filter(p => keyCounts[p] === 0)
    if (blockers.length) {
      verdict = 'blocked'
      verdictReason = `${blockers.join(', ')} : 0 clé active. Scaler ne changera rien tant que ces clés ne sont pas configurées.`
    } else if (unknown) {
      verdict = 'unknown'
      verdictReason = 'Registre de clés non synchronisé (api_keys_registry vide). Vérifier manuellement les .env.local.'
    } else {
      verdictReason = 'Clés détectées. Scale horizontal utile tant que le quota quotidien n\'est pas atteint.'
    }
  }

  // Vertical ceiling: if partition is "(single ...)" we warn upfront.
  if (phys.scaleCeiling === 'vertical' && currentInstances >= 1) {
    verdict = 'blocked'
    verdictReason = 'Agent non partitionnable horizontalement (' + phys.partitionKey + '). Spawner N instances = duplication. Scaler en variant les args (sector/country) plutôt.'
  }

  return NextResponse.json({
    ok: true,
    agent,
    physics: phys,
    providerDetails,
    verdict,
    verdictReason,
    minatoSets: 'Non — Minato ne fixe aucun RPM lui-même. Ce sont les providers externes (Gemini / Groq / Resend / etc.) qui plafonnent. Minato lit ces quotas et propose FREE (comptes supplémentaires) ou FIXED (abonnement) quand ils bloquent.',
  })
}
