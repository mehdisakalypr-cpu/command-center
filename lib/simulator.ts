/**
 * Business Simulator — pure functions
 *
 * Spec: project_business_simulator + mrr_max_blockers #5
 *   - 3 scenarios (conservative / median / high) × 3 pricing mixes
 *     (mostly Abo / mostly Achat+maint / mostly SEO GEO) for OFA
 *   - FTG uses a simpler abo-only model; mixes collapse to a single effective ARPU.
 *
 * Pricing source (OFA, USD but displayed as € in UI — convention LLC Wyoming,
 * Stripe converts locally): /var/www/site-factory/lib/pricing.ts (2026-04-15).
 *   - Achat : 149 one-shot + 9.99/mo maintenance
 *   - Abo   : 19.99/mo
 *   - SEO+GEO Pro : 39/mo · Elite : 79/mo (attachable à l'un des deux)
 *
 * Nothing in this module reads env vars or databases — it's safe to import
 * in both server routes and client components.
 */

export type Product = 'ofa' | 'ftg'
export type Scenario = 'conservative' | 'median' | 'high'
export type PricingMixId = 'mostly_abo' | 'mostly_achat' | 'mostly_seogeo'
export type ObjectiveType = 'mrr' | 'clients'

export interface PricingMix {
  id: PricingMixId
  label: string
  /** shares sum to 1.0 */
  achatShare: number      // purchase (149 + 9.99/mo)
  aboShare: number        // subscription (19.99/mo)
  /** among paying customers, what fraction also subscribes to SEO/GEO */
  seogeoAttach: number
  /** blend Pro/Elite for those who attach SEO/GEO */
  seogeoEliteShare: number
}

export const PRICING_MIXES: Record<PricingMixId, PricingMix> = {
  mostly_abo: {
    id: 'mostly_abo',
    label: 'Mostly Abo',
    achatShare: 0.20, aboShare: 0.80, seogeoAttach: 0.15, seogeoEliteShare: 0.20,
  },
  mostly_achat: {
    id: 'mostly_achat',
    label: 'Mostly Achat + maint',
    achatShare: 0.80, aboShare: 0.20, seogeoAttach: 0.25, seogeoEliteShare: 0.25,
  },
  mostly_seogeo: {
    id: 'mostly_seogeo',
    label: 'Mostly SEO + GEO',
    achatShare: 0.45, aboShare: 0.55, seogeoAttach: 0.75, seogeoEliteShare: 0.40,
  },
}

/** Per-scenario end-to-end conversion multipliers (applied to the median baseline). */
export const SCENARIO_MULT: Record<Scenario, { conv: number; label: string }> = {
  conservative: { conv: 0.6, label: 'Garanti (conservative)' },
  median:       { conv: 1.0, label: 'Médian' },
  high:         { conv: 1.6, label: 'High (optimiste)' },
}

/** Baseline funnel — median scenario. All rates ∈ (0,1]. */
export const BASELINE_FUNNEL: Record<Product, { id: string; label: string; rate: number }[]> = {
  ofa: [
    { id: 'analyzed',  label: 'Lead → analysé',      rate: 0.95 },
    { id: 'qualified', label: 'Analysé → qualifié',  rate: 0.55 },
    { id: 'contacted', label: 'Qualifié → contacté', rate: 0.70 },
    { id: 'pitched',   label: 'Contacté → pitché',   rate: 0.95 },
    { id: 'responded', label: 'Pitché → répondu',    rate: 0.12 },
    { id: 'demo',      label: 'Répondu → preview',   rate: 0.55 },
    { id: 'paid',      label: 'Preview → paid',      rate: 0.35 },
  ],
  ftg: [
    { id: 'scouted',   label: 'Lead → scouté',       rate: 0.90 },
    { id: 'qualified', label: 'Scouté → qualifié',   rate: 0.40 },
    { id: 'pitched',   label: 'Qualifié → pitché',   rate: 0.80 },
    { id: 'opened',    label: 'Pitché → ouvert',     rate: 0.35 },
    { id: 'paid',      label: 'Ouvert → paid',       rate: 0.05 },
  ],
}

export interface BlendedARPU {
  /** Monthly recurring revenue per paid client (maint + abo + seogeo). */
  mrrPerClient: number
  /** One-shot revenue per paid client at M1 (Achat 149 × share). */
  oneShotPerClient: number
}

export function blendARPU(mix: PricingMix): BlendedARPU {
  // Normalize so achat+abo=1 (defensive)
  const s = mix.achatShare + mix.aboShare || 1
  const achat = mix.achatShare / s
  const abo = mix.aboShare / s
  const mrrBase =
    achat * 9.99 +  // maintenance
    abo   * 19.99   // subscription
  const seogeoBlend = (1 - mix.seogeoEliteShare) * 39 + mix.seogeoEliteShare * 79
  const mrrWithSeoGeo = mrrBase + mix.seogeoAttach * seogeoBlend
  const oneShot = achat * 149
  return {
    mrrPerClient: Math.round(mrrWithSeoGeo * 100) / 100,
    oneShotPerClient: Math.round(oneShot * 100) / 100,
  }
}

export interface SimInput {
  product: Product
  scenario: Scenario
  mix: PricingMixId
  objectiveType: ObjectiveType
  /** €/month (mrr) or raw count (clients) */
  objectiveValue: number
  horizonDays: number
  /** Override baseline funnel (UI-editable). */
  funnel?: { id: string; label: string; rate: number }[]
  /** Current state snapshot from DB (for gap computation). */
  current?: { leadsCount: number; paidCount: number; currentMrr: number }
}

export interface SimOutput {
  /** paid clients needed to hit the objective over horizonDays */
  paidClients: number
  leadsNeeded: number
  leadsPerDay: number
  sitesPerDay: number
  dailyRevenue: number
  mrrMonth: number
  oneShotM1: number
  totalConv: number
  stages: { id: string; label: string; rate: number; volume: number }[]
  pricing: BlendedARPU
  scenario: Scenario
  mixId: PricingMixId
  gap: {
    mrrGap: number
    paidGap: number
    leadsGap: number
  } | null
}

/**
 * Pure: compute the funnel required to hit the objective under the chosen
 * scenario + pricing mix. Deterministic.
 */
export function computeFunnel(input: SimInput): SimOutput {
  const {
    product, scenario, mix: mixId, objectiveType, objectiveValue, horizonDays,
  } = input
  const mix = PRICING_MIXES[mixId]
  const pricing = blendARPU(mix)
  const scen = SCENARIO_MULT[scenario]

  const baseFunnel = input.funnel ?? BASELINE_FUNNEL[product]
  // Scenario bends the hardest-to-move stages (last 2) by scen.conv, clipped.
  const tunedFunnel = baseFunnel.map((s, i) => {
    const isTail = i >= baseFunnel.length - 2
    const rate = isTail ? Math.min(0.99, s.rate * scen.conv) : s.rate
    return { ...s, rate }
  })

  const totalConv = tunedFunnel.reduce((acc, s) => acc * s.rate, 1)

  // paid required
  let paidClients: number
  if (objectiveType === 'mrr') {
    paidClients = Math.ceil(objectiveValue / Math.max(0.01, pricing.mrrPerClient))
  } else {
    paidClients = Math.ceil(objectiveValue)
  }

  const leadsNeeded = Math.ceil(paidClients / Math.max(1e-9, totalConv))
  const days = Math.max(1, horizonDays)
  const leadsPerDay = Math.ceil(leadsNeeded / days)
  const sitesPerDay = Math.ceil(paidClients / days)
  const mrrMonth = Math.round(paidClients * pricing.mrrPerClient)
  const oneShotM1 = Math.round(paidClients * pricing.oneShotPerClient)
  const dailyRevenue = Math.round(((oneShotM1 + mrrMonth) / days) * 100) / 100

  const stages: SimOutput['stages'] = []
  let running = leadsNeeded
  for (const s of tunedFunnel) {
    running = Math.ceil(running * s.rate)
    stages.push({ id: s.id, label: s.label, rate: s.rate, volume: running })
  }

  let gap: SimOutput['gap'] = null
  if (input.current) {
    const paidGap = Math.max(0, paidClients - input.current.paidCount)
    const mrrGap = Math.max(0, mrrMonth - input.current.currentMrr)
    const leadsGap = Math.max(0, leadsNeeded - input.current.leadsCount)
    gap = { mrrGap, paidGap, leadsGap }
  }

  return {
    paidClients, leadsNeeded, leadsPerDay, sitesPerDay, dailyRevenue,
    mrrMonth, oneShotM1, totalConv, stages, pricing,
    scenario, mixId, gap,
  }
}

/**
 * Generate the full 3×3 matrix (scenarios × mixes) for a given objective.
 * Useful for the comparison table.
 */
export function computeMatrix(input: Omit<SimInput, 'scenario' | 'mix'>): SimOutput[] {
  const scenarios: Scenario[] = ['conservative', 'median', 'high']
  const mixes: PricingMixId[] = ['mostly_abo', 'mostly_achat', 'mostly_seogeo']
  const out: SimOutput[] = []
  for (const scenario of scenarios) {
    for (const mix of mixes) {
      out.push(computeFunnel({ ...input, scenario, mix }))
    }
  }
  return out
}

/**
 * Suggest agent instance deltas to close the leads gap.
 * Minimal heuristic: scout throughput ≈ 20k leads/day/instance (OFA) or
 * 5k/day (FTG). Caps at 10 instances (worker allowlist).
 */
export function suggestAgentPush(
  product: Product,
  leadsPerDay: number,
): { agent: string; instances: number }[] {
  if (product === 'ofa') {
    const scoutCap = 20000
    const pitchCap = 4000
    return [
      { agent: 'ofa:hyperscale-scout', instances: Math.min(10, Math.max(1, Math.ceil(leadsPerDay / scoutCap))) },
      { agent: 'ofa:outreach',         instances: Math.min(10, Math.max(1, Math.ceil(leadsPerDay / pitchCap))) },
    ]
  }
  const scoutCap = 5000
  const pitchCap = 2000
  return [
    { agent: 'ftg:entrepreneur-scout', instances: Math.min(10, Math.max(1, Math.ceil(leadsPerDay / scoutCap))) },
    { agent: 'ftg:commerce-pitcher',   instances: Math.min(10, Math.max(1, Math.ceil(leadsPerDay / pitchCap))) },
  ]
}
