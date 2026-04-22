import type { Brick, MinatoAgent } from './registries';

// Stable across runs → prompt-cacheable.
export const IDEATOR_SYSTEM = `You are Hisoka, Minato's apex Business Hunter.
You generate business ideas that can be operated 24/7 by AI with near-zero ongoing human involvement.

Hard constraints on every idea:
- ALL 6 autonomy dimensions (acquisition, content_ops, fulfillment, support, billing, compliance) ≥ 0.9 plausible
- Setup user time ≤ 40 hours total
- Ongoing user time ≤ 1 hour per month
- Self-funding at every volume tier (v10, v100, v1k, v10k users): GM positive
- At least 1 validated distribution channel (SEO, outbound email, PH launch, community, partnerships)
- Prefer ideas that reuse 2+ existing bricks
- Penalize ideas that require a US LLC if the user is still EU-resident (llc_gate: "needs_llc" or "blocked")

Output strict JSON matching the schema you are given. No prose. No markdown.
Each idea includes: slug, name, tagline, category, autonomy (6 dims), setup_hours_user,
ongoing_user_hours_per_month, distribution_channels, monetization_model, pricing_tiers,
assets_leveraged (brick ids), unit_economics (v10/v100/v1k/v10k with rev_eur_mo + cost_eur_mo + gm_pct),
self_funding_score, llc_gate, effort_weeks, monthly_ops_cost_eur, scalability_per_worker,
mrr_conservative/median/optimistic (m1,m3,m6,m12,m24,m36), leverage_configs
(bootstrap/accelerated/turbo/overkill with launch_eur, workers, mrr_curve, irr_y3_pct,
sp500_delta_pct, risk_score), rationale.

Baseline comparisons: HYSA 2%/yr, bonds 4%/yr, S&P 500 10%/yr. An idea is only worth surfacing
if its median IRR_y3 clearly beats S&P 500 at its optimal leverage config.`;

export function buildIdeatorUserPrompt(opts: {
  bricks: Brick[];
  agents: MinatoAgent[];
  previousTop20?: Array<{ slug: string; name: string; score: number }>;
  countTarget?: number;
}): string {
  const bricksList = opts.bricks.map(b =>
    `- ${b.id}: ${b.name} [saves ~${b.saves_dev_weeks}w] (used in: ${b.projects_using.join(',')})`
  ).join('\n');
  const agentsList = opts.agents.map(a =>
    `- ${a.id} ${a.icon} — covers: ${a.covers_autonomy_dims.join(',')}`
  ).join('\n');
  const prev = (opts.previousTop20 ?? []).slice(0, 20).map(p =>
    `- ${p.slug}: ${p.name} (score ${p.score.toFixed(1)})`
  ).join('\n') || '(none — first run)';
  const n = opts.countTarget ?? 30;

  return `AVAILABLE BRICKS (rewardable via assets_leveraged):
${bricksList}

AVAILABLE MINATO AGENTS (map autonomy dims to these where possible):
${agentsList}

PREVIOUS TOP 20 (avoid duplicates; generate distinct ideas):
${prev}

TASK: generate ${n} distinct business idea candidates meeting the hard constraints above.
Diversify across categories (middleware_api, data_platform, productized_service, marketplace,
content_platform, tool_utility, b2b_integration). Return strict JSON: { "ideas": [ ... ${n} items ... ] }.`;
}

// Scorer runs per candidate in parallel; prompt is short + structured.
export function buildScorerPrompt(candidateSummary: string): string {
  return `Refine and complete the following business-idea candidate with rigorous numbers:
${candidateSummary}

Output strict JSON matching the ScoredIdea schema. No prose. If any hard constraint fails,
set the offending field to its true value anyway — filtering happens in code, not here.`;
}
