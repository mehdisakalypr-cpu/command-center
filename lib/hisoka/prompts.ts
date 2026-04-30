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

// Vertical packs — when a vertical is requested via API, the prompt foregrounds
// real end-user ICPs in that domain instead of letting the LLM anchor on the
// existing bricks registry (which is heavily tech/SaaS-flavored).
const VERTICAL_BRIEFS: Record<string, string> = {
  agriculture: `TARGET VERTICAL: AGRICULTURE & FARMING.
End-users: farmers, agronomists, cooperatives, agri-input distributors, food processors, crop insurers.
Real pain points to solve: yield prediction, irrigation optimization, livestock health monitoring, pesticide compliance, farm-to-fork traceability, commodity price hedging, subsidy/grant discovery, weather-driven decision support, crop disease detection from images, field-level carbon accounting.
DO NOT propose dev tools, code reviewers, or generic SaaS — propose products a farmer or agronomist would actually pay for.`,
  healthcare: `TARGET VERTICAL: HEALTHCARE.
End-users: clinics, private practices, dentists, physiotherapists, telemedicine providers, medical billing companies, pharma reps, clinical trial managers.
Real pain points: appointment no-show prediction, prior-authorization automation, ICD-10 coding, patient intake AI, HIPAA-compliant secure messaging, medical record summarization, drug interaction checks, clinical trial recruitment, dental insurance claim adjudication, telehealth note generation.
DO NOT propose dev tools or generic SaaS — propose products a clinic or physician would buy.`,
  fintech: `TARGET VERTICAL: FINTECH.
End-users: SMB CFOs, accountants, financial advisors, retail investors, fintech founders, lending fintechs, treasury managers.
Real pain points: cash flow forecasting, AP/AR automation, expense categorization, reconciliation, compliance (KYC/AML/SOC2), fraud detection on payments, credit scoring on alternative data, automated investor reporting, tax loss harvesting, multi-entity consolidation.
DO NOT propose dev tools — propose products a CFO or accountant would buy.`,
  realestate: `TARGET VERTICAL: REAL ESTATE.
End-users: real-estate agents, brokerages, property managers, landlords, real estate investors, mortgage brokers, commercial RE analysts, homebuilders.
Real pain points: listing description generation, comparable market analysis, lead nurturing, virtual staging, tenant screening, rent collection, maintenance ticket triage, lease abstraction, off-market deal sourcing, ARV (after-repair value) prediction, vacancy forecasting.
DO NOT propose dev tools — propose products a realtor or property manager would buy.`,
  esg: `TARGET VERTICAL: ESG / SUSTAINABILITY.
End-users: ESG officers, corporate sustainability teams, fund managers (impact investing), CSR consultants, supply chain managers, regulatory compliance officers.
Real pain points: scope 1/2/3 emissions calculation, supplier ESG scoring, CSRD/SFDR/TCFD report drafting, greenwashing detection, ESG data verification, carbon offset marketplace fraud detection, biodiversity impact assessment, modern slavery audits, packaging recyclability scoring.
DO NOT propose dev tools — propose products an ESG officer would buy.`,
  trade: `TARGET VERTICAL: INTERNATIONAL TRADE & LOGISTICS.
End-users: import/export companies, customs brokers, freight forwarders, supply chain managers, sourcing agents, trade finance officers.
Real pain points: HS code classification, customs documentation auto-generation, sanctions screening, freight rate forecasting, container tracking, supplier discovery (sourcing), letter of credit automation, incoterm advice, anti-dumping monitoring, carbon tariff (CBAM) compliance.
DO NOT propose dev tools — propose products an import/export manager would buy.`,
  legal: `TARGET VERTICAL: LEGAL SERVICES (law firms + legal departments).
End-users: solo lawyers, small/mid law firms, in-house counsel, paralegals, legal ops managers, contract managers, IP attorneys, litigation support firms.
Real pain points: contract review, deposition summarization, discovery review (e-disco), legal research, billing time tracking, client intake automation, conflict checks, motion drafting, deposition transcript analysis, IP portfolio management.
DO NOT propose dev tools — propose products a lawyer or legal ops manager would buy.`,
  ecommerce: `TARGET VERTICAL: E-COMMERCE & DTC BRANDS.
End-users: Shopify/Amazon sellers, DTC brand operators, marketplace operators, dropshippers, FBA sellers, e-com agencies.
Real pain points: product description generation, dynamic pricing, inventory forecasting, return rate prediction, fake review detection, ad creative testing, abandoned cart recovery, customer segmentation, supplier reliability scoring, marketplace policy compliance.
DO NOT propose dev tools — propose products an e-commerce operator would buy.`,
  hr: `TARGET VERTICAL: HUMAN RESOURCES.
End-users: HR managers, recruiters, talent ops, people analytics, learning & development, EOR/PEO operators.
Real pain points: candidate sourcing automation, AI screening (bias-audited), interview scheduling, employee onboarding, payroll variance detection, compensation benchmarking, engagement surveys, exit interview analysis, training content generation, retention prediction.
DO NOT propose dev tools — propose products an HR manager would buy.`,
  education: `TARGET VERTICAL: EDUCATION & EDTECH.
End-users: K-12 teachers, university faculty, corporate trainers, online course creators, tutoring services, school administrators, edtech operators.
Real pain points: lesson plan generation, automated grading, plagiarism detection, individualized learning paths, parent communication automation, course content updates, learning analytics, accessibility compliance, certification verification.
DO NOT propose dev tools — propose products a teacher or course creator would buy.`,
};

export function buildIdeatorUserPrompt(opts: {
  bricks: Brick[];
  agents: MinatoAgent[];
  signals?: Array<{ source: string; title: string; url?: string; score?: number; tag?: string }>;
  previousTop20?: Array<{ slug: string; name: string; score: number }>;
  countTarget?: number;
  vertical?: string;
}): string {
  const bricksList = opts.bricks.map(b =>
    `- ${b.id}: ${b.name} [saves ~${b.saves_dev_weeks}w] (used in: ${b.projects_using.join(',')})`
  ).join('\n');
  const agentsList = opts.agents.map(a =>
    `- ${a.id} ${a.icon} — covers: ${a.covers_autonomy_dims.join(',')}`
  ).join('\n');
  const prev = (opts.previousTop20 ?? []).slice(0, 20).map(p =>
    `- ${p.slug}: ${p.name} (score ${Number(p.score ?? 0).toFixed(1)})`
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

  const verticalBrief = opts.vertical && VERTICAL_BRIEFS[opts.vertical]
    ? `\n${VERTICAL_BRIEFS[opts.vertical]}\n`
    : '';

  return `${verticalBrief}AVAILABLE BRICKS (rewardable via assets_leveraged — only when applicable to the target vertical):
${bricksList}

AVAILABLE MINATO AGENTS (map autonomy dims to these where possible):
${agentsList}
${signalsSection}
PREVIOUS TOP 20 (avoid duplicates; generate distinct ideas):
${prev}

TASK: generate ${n} distinct business idea candidates meeting ALL hard constraints above.
${opts.vertical ? `EVERY idea must serve the TARGET VERTICAL described above. If a candidate is a horizontal dev tool (code review, API docs, devops, OSS monitoring), DROP IT and propose a vertical-native alternative. The end-user persona (e.g. "farmer", "real estate agent") must appear naturally in the tagline.` : 'Diversify across categories (middleware_api, data_platform, productized_service, marketplace, content_platform, tool_utility, b2b_integration).'}
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

// Benchmark prompt: score ONE user-supplied idea against Hisoka's framework.
export function buildBenchmarkPrompt(opts: {
  userText: string;
  bricks: Brick[];
  agents: MinatoAgent[];
}): string {
  const bricksList = opts.bricks.map(b =>
    `- ${b.id}: ${b.name}`
  ).join('\n');
  const agentsList = opts.agents.map(a =>
    `- ${a.id} ${a.icon}`
  ).join('\n');

  return `A user proposes this business idea:
"""
${opts.userText}
"""

Score it using the same rigorous framework Hisoka applies to the top 20.
Available bricks to reference in assets_leveraged:
${bricksList}

Available Minato agents (inform operability):
${agentsList}

Return strict JSON matching the ScoredIdea schema (ONE idea, not an array).
Your response MUST start with { and end with }. No preamble, no trailing text, no code fences, no markdown.
{
  "slug": "<kebab-case-from-title>",
  "name": "<short name>",
  "tagline": "<one-line pitch>",
  "category": "<one of: middleware_api, data_platform, productized_service, marketplace, content_platform, tool_utility, b2b_integration>",
  "autonomy": { "acquisition": 0.xx, "content_ops": 0.xx, "fulfillment": 0.xx, "support": 0.xx, "billing": 0.xx, "compliance": 0.xx },
  "setup_hours_user": <number>,
  "ongoing_user_hours_per_month": <number>,
  "distribution_channels": ["<channel>", ...],
  "monetization_model": "<subscription|usage|hybrid|commission>",
  "assets_leveraged": ["<brick_id>", ...],
  "unit_economics": {
    "v10":  { "rev_eur_mo": <n>, "cost_eur_mo": <n>, "gm_pct": <n> },
    "v100": { "rev_eur_mo": <n>, "cost_eur_mo": <n>, "gm_pct": <n> },
    "v1k":  { "rev_eur_mo": <n>, "cost_eur_mo": <n>, "gm_pct": <n> },
    "v10k": { "rev_eur_mo": <n>, "cost_eur_mo": <n>, "gm_pct": <n> }
  },
  "self_funding_score": 1.0,
  "llc_gate": "<none|needs_llc|post_expat|blocked>",
  "effort_weeks": <number>,
  "monthly_ops_cost_eur": <number>,
  "scalability_per_worker": "<linear|step|capped>",
  "mrr_conservative": {"m1":<n>,"m3":<n>,"m6":<n>,"m12":<n>,"m24":<n>,"m36":<n>},
  "mrr_median":       {"m1":<n>,"m3":<n>,"m6":<n>,"m12":<n>,"m24":<n>,"m36":<n>},
  "mrr_optimistic":   {"m1":<n>,"m3":<n>,"m6":<n>,"m12":<n>,"m24":<n>,"m36":<n>},
  "leverage_configs": [
    { "label": "bootstrap", "launch_eur": 0, "workers": 1, "leverage": <n>, "mrr_curve": {"m1":<n>,"m3":<n>,"m6":<n>,"m12":<n>,"m24":<n>,"m36":<n>}, "irr_y3_pct": <n>, "sp500_delta_pct": <n>, "risk_score": 0.<n> }
  ],
  "rationale": "<short justification>"
}

Do not filter: if the idea has obvious autonomy gaps, reflect them honestly. Code applies gates.`;
}

// Portfolio Optimizer — given capital + workers + risk, pick 3-5 ideas from current top 20.
export function buildPortfolioPrompt(opts: {
  ideas: Array<{
    slug: string; name: string; category: string; autonomy_score: number;
    leverage_configs: unknown; optimal_config: unknown; mrr_median: unknown;
    llc_gate: string; leverage_elasticity: string | null;
  }>;
  availableCapitalEur: number;
  maxExtraWorkers: number;
  riskAppetite: 'conservative' | 'balanced' | 'aggressive';
}): string {
  const ideasList = opts.ideas.map((i, idx) =>
    `#${idx + 1} ${i.slug} [${i.category}] autonomy=${i.autonomy_score} llc=${i.llc_gate} elasticity=${i.leverage_elasticity ?? 'unknown'}
  configs: ${JSON.stringify(i.leverage_configs)}
  optimal: ${JSON.stringify(i.optimal_config)}
  mrr_median: ${JSON.stringify(i.mrr_median)}`
  ).join('\n\n');

  const riskGuide: Record<typeof opts.riskAppetite, string> = {
    conservative: 'Prefer low-risk_score configs (<0.4). Spread across 4-5 ideas. Favor MEDIUM elasticity and llc_gate=none. Minimum 3 categories.',
    balanced: 'Mix risk levels (target avg ≤0.5). 3-4 ideas. Allow 1 HIGH elasticity turbo/overkill bet. Minimum 2 categories.',
    aggressive: 'Overweight HIGH elasticity ideas at turbo/overkill configs. 3 ideas OK if high conviction. Accept llc_gate=needs_llc penalty.',
  };

  return `Available capital: €${opts.availableCapitalEur}
Extra workers the user can dedicate: ${opts.maxExtraWorkers}
Risk appetite: ${opts.riskAppetite}
Risk guide: ${riskGuide[opts.riskAppetite]}

Pick 3-5 ideas from the top 20 below. For each, specify launch_eur and workers_assigned.
Constraints:
- Sum of launch_eur ≤ ${opts.availableCapitalEur}
- Sum of workers_assigned ≤ ${opts.maxExtraWorkers} (extra over baseline 1 per idea if workers_assigned > 1)
- Minimum 3 distinct categories (unless ${opts.riskAppetite} is 'aggressive', where 2 is acceptable)
- At least 1 llc_gate=none idea

TOP 20 CANDIDATES:
${ideasList}

Return strict JSON, no prose, no markdown:
{
  "allocations": [
    { "idea_slug": "<slug>", "launch_eur": N, "workers_assigned": N, "config_label": "bootstrap|accelerated|turbo|overkill", "expected_mrr_y3_eur": N, "rationale": "<1 sentence>" }
  ],
  "rationale": "<1-paragraph explanation of the allocation logic>"
}`;
}
