import type { Brick, MinatoAgent } from './registries';

// Stable across runs → prompt-cacheable.
export const IDEATOR_SYSTEM = `You are Hisoka, Minato's apex Business Hunter.
You generate business ideas that can be operated 24/7 by AI with near-zero ongoing human involvement.

HARD CONSTRAINTS — every field below MUST meet these thresholds or the idea is discarded:
- autonomy.acquisition >= 0.9 (AI handles lead generation + distribution fully)
- autonomy.content_ops >= 0.9 (AI generates all content)
- autonomy.fulfillment >= 0.9 (AI fulfills the core service)
- autonomy.support >= 0.9 (AI handles customer support)
- autonomy.billing >= 0.9 (Stripe/automated billing, no human invoicing)
- autonomy.compliance >= 0.9 (automated compliance checks)
- setup_hours_user <= 40 (one-time setup by the founder)
- ongoing_user_hours_per_month <= 1 (ongoing maintenance is minimal)
- self_funding_score = 1.0 EXACTLY — this means GM > 0 at EVERY tier (v10, v100, v1k, v10k). Set this to 1.0 always if your unit_economics show positive gross margins at v10+.
- llc_gate MUST be one of exactly: "none", "needs_llc", "post_expat", "blocked" — never any other value. Prefer "none".
- distribution_channels: at least 1 item (e.g. "seo", "ph_launch", "outbound_email", "community")
- leverage_configs MUST be a JSON ARRAY (not an object), containing 1-4 items with label, launch_eur, workers, leverage, mrr_curve (object with m1/m3/m6/m12/m24/m36), irr_y3_pct, sp500_delta_pct, risk_score.
- mrr_conservative, mrr_median, mrr_optimistic MUST each be an object with keys: m1, m3, m6, m12, m24, m36 (all numbers).
- scalability_per_worker MUST be one of: "linear", "step", "capped" (string, not a number).

CRITICAL OUTPUT FORMAT: Respond ONLY with a single JSON object. Your response MUST start with { and end with }. No preamble, no trailing text, no code fences, no markdown. Do not write any explanation before or after the JSON.
Each idea includes: slug (kebab-case), name, tagline, category, autonomy (object with 6 dims), setup_hours_user,
ongoing_user_hours_per_month, distribution_channels (array), monetization_model, pricing_tiers (optional),
assets_leveraged (array of brick ids), unit_economics (object with v10/v100/v1k/v10k, each with rev_eur_mo + cost_eur_mo + gm_pct),
self_funding_score (set to 1.0), llc_gate (one of: "none"/"needs_llc"/"post_expat"/"blocked"), effort_weeks, monthly_ops_cost_eur,
scalability_per_worker (one of: "linear"/"step"/"capped"), mrr_conservative/mrr_median/mrr_optimistic (each: {m1,m3,m6,m12,m24,m36}),
leverage_configs (ARRAY of configs, each with: label, launch_eur, workers, leverage, mrr_curve, irr_y3_pct, sp500_delta_pct, risk_score),
rationale.

Baseline comparisons: HYSA 2%/yr, bonds 4%/yr, S&P 500 10%/yr. Only surface ideas whose IRR_y3 clearly beats S&P 500.`;

export function buildIdeatorUserPrompt(opts: {
  bricks: Brick[];
  agents: MinatoAgent[];
  signals?: Array<{ source: string; title: string; url?: string; score?: number; tag?: string }>;
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

  // Build signals section: top 20 from the pre-sorted/deduped harvester output
  const signalsSection = (opts.signals && opts.signals.length > 0)
    ? `\nCURRENT MARKET SIGNALS (use as inspiration, not prescriptive):\n${
        opts.signals.slice(0, 20).map(s =>
          `- [${s.source}] ${s.title}${s.score !== undefined ? ` (score: ${s.score})` : ''}`
        ).join('\n')
      }\n`
    : '';

  return `AVAILABLE BRICKS (rewardable via assets_leveraged):
${bricksList}

AVAILABLE MINATO AGENTS (map autonomy dims to these where possible):
${agentsList}
${signalsSection}
PREVIOUS TOP 20 (avoid duplicates; generate distinct ideas):
${prev}

TASK: generate ${n} distinct business idea candidates meeting ALL hard constraints above.
Diversify across categories (middleware_api, data_platform, productized_service, marketplace,
content_platform, tool_utility, b2b_integration).
IMPORTANT: set self_funding_score=1.0 for every idea (all your ideas have positive GM at v10+).
IMPORTANT: leverage_configs must be a JSON array, not an object.
IMPORTANT: scalability_per_worker must be a string: "linear", "step", or "capped".
Return strict JSON: { "ideas": [ ... ${n} items ... ] }.`;
}

// Scorer runs per candidate in parallel; prompt is short + structured.
export function buildScorerPrompt(candidateSummary: string): string {
  return `Refine and complete the following business-idea candidate with rigorous numbers:
${candidateSummary}

Output strict JSON matching the ScoredIdea schema. No prose. If any hard constraint fails,
set the offending field to its true value anyway — filtering happens in code, not here.`;
}
