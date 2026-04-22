// CC Fleet — throughput / effort / ROI registry.
// Maps worker capability → output per day per worker, worker cost, and revenue equivalence.
// Seed values are estimates; calibration feedback loop lives in `lib/cc-fleet/calibration.ts` (TODO).

import type { Capability } from './types'

/** USD/month cost of 1 Claude Code account by plan tier. */
export const WORKER_COST_USD_PER_MONTH: Record<string, number> = {
  max_5x:    100,   // Max 5× perso
  max_20x:   200,   // Max 20× perso (référence fleet)
  team:      150,   // Team Plan per seat (après LLC)
  api_direct: 0,    // Pay-as-you-go; calc différent, ne compte pas ici comme fixed
}

/** Output throughput per autonomous worker per day, by capability. */
export const OUTPUT_PER_WORKER_PER_DAY: Record<Capability, {
  unit: string
  typical: number       // moyenne réaliste
  upper: number         // pic jour performant
  note?: string
}> = {
  scout:       { unit: 'leads enrichis', typical: 200,  upper: 400,  note: 'OSM + Google Maps + enrich API' },
  content:     { unit: 'sections produites', typical: 60, upper: 120, note: 'section site OFA ou opp×country FTG' },
  cron:        { unit: 'jobs traités', typical: 100, upper: 300, note: 'maintenance + batch' },
  fix:         { unit: 'bugs résolus', typical: 6, upper: 12 },
  refactor:    { unit: 'PRs merged', typical: 3, upper: 8 },
  feature:     { unit: 'features shippées', typical: 1, upper: 3, note: 'UI/backend moyen' },
  ui:          { unit: 'composants', typical: 5, upper: 12 },
  architecture:{ unit: 'décisions + specs', typical: 1, upper: 2 },
  review:      { unit: 'PRs revues', typical: 20, upper: 50 },
  debug:       { unit: 'root-causes', typical: 4, upper: 8 },
}

/** Conversion funnel for revenue equivalence.
 *  Market-grounded baseline (à calibrer avec vraies données funnel via `calibrate-funnel-rates` cron):
 *   - Sources : HubSpot State of Marketing 2024, Cognism B2B Benchmarks 2024, Gartner CSO Survey 2025
 *   - Cold outbound B2B : reply rate médian 1-5%, meeting rate 0.5-2%, close-of-meeting 10-20%
 *   - Overall cold-email-to-paying-customer médian : 0.5-1.5% B2B mid-ACV, 1.5-3% SMB low-ACV
 *   - SMB local SaaS (OFA-style) : 2-3% (sale plus simple, moins de décideurs)
 *   - B2B enterprise (Estate 200€+, Shift 500€+) : 0.3-1% (cycle plus long, compensé par ACV)
 *
 *  Les valeurs ci-dessous sont le BASELINE médian marché, pas des promesses.
 *  Flag `market_calibrated: true` = basé sur benchmark, pas sur data projet réelle.
 */
export const FUNNEL_RATES: Record<string, {
  label: string
  leads_per_account_per_day: number       // scout-level output (volume, pas qualité)
  conversion_contacted_to_client: number  // 0..1 médiane marché cold→paying
  arpu_monthly_eur: number                // ARPU mensuel observé (si projet live) ou pricing (si pre-launch)
  market_calibrated: boolean              // true = benchmark marché, false = data réelle funnel
  source: string
}> = {
  ftg: {
    label: 'FTG', leads_per_account_per_day: 200, conversion_contacted_to_client: 0.010,
    arpu_monthly_eur: 49, market_calibrated: true,
    source: 'HubSpot B2B mid-ACV 2024 médian 0.8-1.2%',
  },
  ofa: {
    label: 'OFA', leads_per_account_per_day: 200, conversion_contacted_to_client: 0.020,
    arpu_monthly_eur: 19.99, market_calibrated: true,
    source: 'Cognism SMB local SaaS 2024 médian 1.5-2.5%',
  },
  estate: {
    label: 'Estate', leads_per_account_per_day: 100, conversion_contacted_to_client: 0.006,
    arpu_monthly_eur: 199, market_calibrated: true,
    source: 'Gartner hospitality enterprise 2024 médian 0.3-1%',
  },
  shift: {
    label: 'Shift', leads_per_account_per_day: 80, conversion_contacted_to_client: 0.025,
    arpu_monthly_eur: 450, market_calibrated: true,
    source: 'B2B consulting warm outbound 2024 médian 2-4%',
  },
  cc: {
    label: 'CC', leads_per_account_per_day: 0, conversion_contacted_to_client: 0,
    arpu_monthly_eur: 0, market_calibrated: false,
    source: 'internal, no revenue funnel',
  },
}

/** Capacity of current fleet for a given capability, per day. */
export function fleetCapacityPerDay(
  workers: Array<{ capabilities: string[]; state: string; max_concurrent_tickets: number }>,
  cap: Capability,
): number {
  return workers
    .filter(w => w.state === 'active' && (w.capabilities as string[]).includes(cap))
    .reduce((acc, w) => acc + OUTPUT_PER_WORKER_PER_DAY[cap].typical * Math.max(1, w.max_concurrent_tickets), 0)
}

/** Compute the gap to hit a target output volume by a given date.
 *  Returns how many additional accounts are needed (assuming autonomous Max 20×).
 */
export function estimateEffortGap(args: {
  target_output: number                // e.g. leads à scouter
  target_date_iso: string              // date limite
  capability: Capability
  current_capacity_per_day: number     // fleetCapacityPerDay() result
  quota_plan?: keyof typeof WORKER_COST_USD_PER_MONTH
}): {
  days_remaining: number
  required_per_day: number
  deficit_per_day: number              // négatif si capacité déjà suffisante
  gap_accounts: number                 // nombre de comptes à ajouter (ceil, min 0)
  monthly_cost_usd: number
  hit_possible_without_scale: boolean
} {
  const now = Date.now()
  const target = new Date(args.target_date_iso).getTime()
  const daysRemaining = Math.max(1, Math.ceil((target - now) / (24 * 3600 * 1000)))
  const requiredPerDay = args.target_output / daysRemaining
  const deficitPerDay = requiredPerDay - args.current_capacity_per_day
  const perWorker = OUTPUT_PER_WORKER_PER_DAY[args.capability].typical
  const gapAccounts = deficitPerDay > 0 ? Math.ceil(deficitPerDay / perWorker) : 0
  const cost = gapAccounts * (WORKER_COST_USD_PER_MONTH[args.quota_plan ?? 'max_20x'] ?? 200)
  return {
    days_remaining: daysRemaining,
    required_per_day: Math.round(requiredPerDay),
    deficit_per_day: Math.round(deficitPerDay),
    gap_accounts: gapAccounts,
    monthly_cost_usd: cost,
    hit_possible_without_scale: gapAccounts === 0,
  }
}

/** Revenue equivalence : given +N accounts on a project's scout capacity, estimate +€MRR unlocked. */
export function revenueFromAdditionalAccounts(args: {
  project: keyof typeof FUNNEL_RATES
  additional_accounts: number
  days_of_contribution: number         // pendant combien de jours ces comptes tournent avant le target
}): {
  additional_leads: number
  additional_clients: number
  additional_mrr_eur: number
  roi_ratio: number                    // MRR/mo ÷ coût/mo
} {
  const f = FUNNEL_RATES[args.project]
  if (!f) return { additional_leads: 0, additional_clients: 0, additional_mrr_eur: 0, roi_ratio: 0 }
  const leads = args.additional_accounts * f.leads_per_account_per_day * args.days_of_contribution
  const clients = leads * f.conversion_contacted_to_client
  const mrr = clients * f.arpu_monthly_eur
  const cost = args.additional_accounts * WORKER_COST_USD_PER_MONTH.max_20x
  const roi = cost > 0 ? (mrr / cost) : Infinity
  return {
    additional_leads: Math.round(leads),
    additional_clients: Math.round(clients),
    additional_mrr_eur: Math.round(mrr),
    roi_ratio: Number(roi.toFixed(2)),
  }
}
