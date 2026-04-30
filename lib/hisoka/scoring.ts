// Hard gates + base score (spec §4). Pure functions, no I/O.

import type { ScoredIdea, GateResult } from './types';

// Default gates — calibrated for horizontal dev/SaaS where "AI handles everything"
// is realistic.
const MIN_AUTONOMY = 0.9;
const MAX_SETUP_HOURS = 40;
const MAX_ONGOING_HOURS_PER_MONTH = 1;

// Vertical-mode gates — relaxed because true verticals (healthcare/legal/agri)
// require realistic human supervision and longer setup. Ideas still ranked by
// baseScore which penalizes lower autonomy via aScore², so they naturally
// sort below horizontal SaaS but enter the DB instead of being silently
// rejected. Without this, vertical-mode runs return 0 upserts.
const VERTICAL_MIN_AUTONOMY = 0.75;
const VERTICAL_MAX_SETUP_HOURS = 80;
const VERTICAL_MAX_ONGOING_HOURS = 4;

const HOURLY_RATE_PROXY_EUR = 100;     // implicit user-time cost
const WORKER_COST_OVER_3Y_EUR = 7200;  // ~€200/mo × 36

export function autonomyScore(a: ScoredIdea['autonomy']): number {
  return Math.min(a.acquisition, a.content_ops, a.fulfillment, a.support, a.billing, a.compliance);
}

/**
 * Auto-fix self_funding_score=1.0 IF unit_economics actually show positive GM
 * at every breakpoint, AND coerce category to the allowed CHECK constraint.
 * The DB enforces category ∈ {middleware_api, data_platform, productized_service,
 * marketplace, content_platform, tool_utility, b2b_integration}; LLMs in
 * vertical mode often emit "fintech_solution" / "agri_tool" etc. which fail the
 * upsert silently. We map unknown categories to productized_service (safe default).
 */
const ALLOWED_CATEGORIES = new Set([
  'middleware_api', 'data_platform', 'productized_service', 'marketplace',
  'content_platform', 'tool_utility', 'b2b_integration',
]);
export function normalizeIdea(idea: ScoredIdea): ScoredIdea {
  let out = idea;

  // Coerce category to allowed enum
  if (!ALLOWED_CATEGORIES.has(out.category as string)) {
    out = { ...out, category: 'productized_service' as ScoredIdea['category'] };
  }

  // Auto-fix self_funding_score
  if (out.self_funding_score < 1.0 && out.unit_economics) {
    const ue = out.unit_economics;
    const allPositive =
      (ue.v10?.gm_pct ?? 0) > 0 &&
      (ue.v100?.gm_pct ?? 0) > 0 &&
      (ue.v1k?.gm_pct ?? 0) > 0 &&
      (ue.v10k?.gm_pct ?? 0) > 0;
    if (allPositive) {
      out = { ...out, self_funding_score: 1.0 };
    }
  }
  return out;
}

export function hardGates(idea: ScoredIdea, opts?: { vertical?: boolean }): GateResult {
  const reasons: string[] = [];
  const aScore = autonomyScore(idea.autonomy);
  const minAuto = opts?.vertical ? VERTICAL_MIN_AUTONOMY : MIN_AUTONOMY;
  const maxSetup = opts?.vertical ? VERTICAL_MAX_SETUP_HOURS : MAX_SETUP_HOURS;
  const maxOngoing = opts?.vertical ? VERTICAL_MAX_ONGOING_HOURS : MAX_ONGOING_HOURS_PER_MONTH;
  if (aScore < minAuto) reasons.push(`autonomy ${aScore.toFixed(2)} < ${minAuto}`);
  if (idea.setup_hours_user > maxSetup)
    reasons.push(`setup ${idea.setup_hours_user}h > ${maxSetup}h`);
  if (idea.ongoing_user_hours_per_month > maxOngoing)
    reasons.push(`ongoing ${idea.ongoing_user_hours_per_month}h/mo > ${maxOngoing}h/mo`);
  if (!idea.distribution_channels?.length) reasons.push('no distribution channel');
  if (idea.self_funding_score < 1.0) reasons.push(`self_funding_score ${idea.self_funding_score} < 1.0`);
  if (idea.llc_gate === 'blocked') reasons.push('llc_gate=blocked');
  return { passed: reasons.length === 0, reasons };
}

export function assetLeverageBonus(assetsLeveraged: string[]): number {
  // 1.0 base + 0.1 per reused brick, capped at 1.5
  return Math.min(1.5, 1.0 + 0.1 * (assetsLeveraged?.length ?? 0));
}

// Cumulative MRR over 36 months, linearly interpolated between anchor points.
export function mrrY3Cumulative(median: ScoredIdea['mrr_median']): number {
  const anchors: Array<[number, number]> = [
    [1, median.m1], [3, median.m3], [6, median.m6],
    [12, median.m12], [24, median.m24], [36, median.m36],
  ];
  let total = 0;
  for (let m = 1; m <= 36; m++) {
    let lo = anchors[0], hi = anchors[anchors.length - 1];
    for (let i = 0; i < anchors.length - 1; i++) {
      if (anchors[i][0] <= m && anchors[i + 1][0] >= m) { lo = anchors[i]; hi = anchors[i + 1]; break; }
    }
    const t = hi[0] === lo[0] ? 0 : (m - lo[0]) / (hi[0] - lo[0]);
    total += lo[1] + (hi[1] - lo[1]) * t;
  }
  return total;
}

export function baseScore(idea: ScoredIdea): number {
  const aScore = autonomyScore(idea.autonomy);
  const mrr = mrrY3Cumulative(idea.mrr_median);
  const launchEur = idea.leverage_configs[0]?.launch_eur ?? 0;
  const workers  = idea.leverage_configs[0]?.workers ?? 1;
  const denom =
    launchEur +
    workers * WORKER_COST_OVER_3Y_EUR +
    idea.setup_hours_user * HOURLY_RATE_PROXY_EUR;
  const leverage = denom > 0 ? (mrr * aScore * aScore) / denom : 0;
  const gmAt10k = (idea.unit_economics.v10k.gm_pct ?? 0) / 100;
  const llcPenalty = idea.llc_gate === 'none' ? 1.0 : 0.7;
  return leverage * assetLeverageBonus(idea.assets_leveraged) * gmAt10k * llcPenalty;
}
