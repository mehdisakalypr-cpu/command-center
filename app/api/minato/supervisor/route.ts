/**
 * GET /api/minato/supervisor
 * Orchestrateur Minato 3 couches (Infinite Tsukuyomi architecture) :
 *   C1 — Exécution normale      (queue pleine → agents bossent)
 *   C2 — Amplification NEJI     (queue vide + cible non atteinte → scout/regen/outreach/LP supp)
 *   C3 — Infinite Tsukuyomi 🌑  (queue vide + cible atteinte → ELEVER le potentiel : TAM, conv, pricing, data, infra, qualité)
 *
 * Décide la couche active à partir de :
 *   queue_depth       (jobs C1 restants, depuis /api/compute/status bg_jobs)
 *   target_gap_pct    (écart cible MRR → via /api/minato/capacity: max remaining/target)
 *   provider_slack    (capacité libre → 1 - utilization du /api/compute/status)
 *
 * Budget plafonné 150€/mo (cf feedback_cost_tiers). POST = force cycle.
 */
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Layer = 'C1' | 'C2' | 'C3'
type Action = { layer: Layer; kind: string; icon: string; rationale: string }

const C2_ACTIONS: Action[] = [
  { layer: 'C2', kind: 'scout_amplify',      icon: '⚓', rationale: 'Scout NAMI supp — territoires/typologies en sous-couverture' },
  { layer: 'C2', kind: 'regen_quality',      icon: '🦊', rationale: 'KURAMA regen images sur sites déjà publiés' },
  { layer: 'C2', kind: 'outreach_multi',     icon: '⚓', rationale: 'Outreach multi-canal (email+WhatsApp+SMS) sur cohortes tièdes' },
  { layer: 'C2', kind: 'lp_geo_extra',       icon: '🩵', rationale: 'LP GEO supplémentaires au-delà des 3/mois Pro' },
  { layer: 'C2', kind: 'competitor_watch',   icon: '🐈‍⬛', rationale: 'BEERUS bench concurrents → pattern distillation' },
]

const C3_ACTIONS: Action[] = [
  { layer: 'C3', kind: 'tam_expand',         icon: '📈', rationale: 'TAM+ : nouveaux pays/régions/verticales/archétypes' },
  { layer: 'C3', kind: 'conv_upstream',      icon: '🎯', rationale: 'Conv+ : copy/design/offer A/B, affinage ciblage' },
  { layer: 'C3', kind: 'pricing_options',    icon: '💰', rationale: 'Pricing+ : tiers SEO/GEO étendus, add-ons, bundles' },
  { layer: 'C3', kind: 'data_moat',          icon: '🧬', rationale: 'Data moat : signaux rares (propension, saisonnalité, stack)' },
  { layer: 'C3', kind: 'infra_scale_ready',  icon: '🏗️', rationale: 'Infra proactive : cache, CDN, DB tuning' },
  { layer: 'C3', kind: 'quality_top1',       icon: '🎨', rationale: 'Qualité : templates premium, personas+, photos uniques' },
  { layer: 'C3', kind: 'partnerships',       icon: '🤝', rationale: 'Intégrations (Zapier, Make) + listings marketplaces' },
  { layer: 'C3', kind: 'organic_content',    icon: '📚', rationale: 'Contenu organique : blog, YouTube, Reddit, TikTok' },
]

async function j<T = unknown>(origin: string, path: string): Promise<T | null> {
  try {
    const r = await fetch(`${origin}${path}`, { cache: 'no-store' })
    if (!r.ok) return null
    return await r.json() as T
  } catch { return null }
}

export async function GET(req: NextRequest) {
  const origin = new URL(req.url).origin

  type StatusResp = { ok: boolean; utilization: number; active_bg: number; bg_jobs: Array<{ status: string }> }
  type CapacityResp = { rows: Array<{ label: string; actual: number; target: number; remaining: number }> }

  const [status, capacity] = await Promise.all([
    j<StatusResp>(origin, '/api/compute/status'),
    j<CapacityResp>(origin, '/api/minato/capacity'),
  ])

  const utilization = status?.utilization ?? 0
  const running = (status?.bg_jobs ?? []).filter(x => x.status === 'running').length
  const queueDepth = running

  const rows = capacity?.rows ?? []
  const targetGapPct = rows.length
    ? Math.max(...rows.map(r => r.target > 0 ? (r.remaining / r.target) : 0))
    : 1

  const providerSlack = Math.max(0, 1 - utilization)

  let layer: Layer
  let reason: string
  if (queueDepth >= 3) {
    layer = 'C1'
    reason = `queue_depth=${queueDepth} ≥ 3 → exécution normale`
  } else if (targetGapPct > 0.02) {
    layer = 'C2'
    reason = `queue_depth=${queueDepth} < 3 · gap=${(targetGapPct * 100).toFixed(1)}% · NEJI amplifie l'existant`
  } else {
    layer = 'C3'
    reason = `cibles atteintes (gap=${(targetGapPct * 100).toFixed(2)}%) · Infinite Tsukuyomi : élever le potentiel`
  }

  const actions = layer === 'C1' ? [] : layer === 'C2' ? C2_ACTIONS : C3_ACTIONS

  const budget = {
    monthly_cap_eur: 150,
    usage_based: false,
    circuit_breaker: 'T0 only si quota payant sature',
  }

  return NextResponse.json({
    ok: true,
    ts: new Date().toISOString(),
    layer,
    reason,
    signals: {
      queue_depth: queueDepth,
      target_gap_pct: Math.round(targetGapPct * 10000) / 100,
      provider_slack_pct: Math.round(providerSlack * 100),
      utilization_pct: Math.round(utilization * 100),
    },
    actions,
    budget,
    capacity_rows: rows,
    hint: layer === 'C3'
      ? 'Chaque action C3 DOIT être mesurable (delta TAM, delta conv, delta pricing_options) et loggée.'
      : layer === 'C2'
      ? 'NEJI cycle : pas de retry bloquant. Si action échoue → suivant immédiat.'
      : 'Agents en exécution normale, laisser tourner.',
  })
}

export async function POST(req: NextRequest) {
  // Force un cycle → identique au GET pour l'instant. Les scripts cron / UI peuvent POST.
  return GET(req)
}
