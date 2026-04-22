import type { SupabaseClient } from '@supabase/supabase-js';
import { withFallback, extractJSON } from '@/lib/ai-pool/cascade';
import { IDEATOR_SYSTEM, buildPortfolioPrompt } from './prompts';

export type PortfolioInput = {
  availableCapitalEur: number;
  maxExtraWorkers: number;
  riskAppetite: 'conservative' | 'balanced' | 'aggressive';
};

export type Allocation = {
  idea_slug: string;
  idea_name?: string;
  category?: string;
  launch_eur: number;
  workers_assigned: number;
  config_label: string;
  expected_mrr_y3_eur: number;
  rationale: string;
};

export type PortfolioResult = {
  id: string;
  allocations: Allocation[];
  expected_arr_y3_eur: number;
  annualized_return_pct: number;
  sp500_delta_pct: number;
  max_drawdown_pct: number;
  diversification_score: number;
  comparison_table: {
    hysa:      { annual_pct: number; arr_y3_eur: number };
    bonds:     { annual_pct: number; arr_y3_eur: number };
    sp500:     { annual_pct: number; arr_y3_eur: number };
    portfolio: { annual_pct: number; arr_y3_eur: number };
  };
  rationale: string;
  cost_eur: number;
};

// Reference annual rates (as of 2026-04).
const HYSA_ANNUAL = 0.02;
const BONDS_ANNUAL = 0.04;
const SP500_ANNUAL = 0.10;

function compoundOver3Years(principal: number, annualRate: number): number {
  return principal * Math.pow(1 + annualRate, 3);
}

// Diversification = 1 - Herfindahl index of category shares.
// 0 = all capital in one category, 1 = perfectly even spread.
function diversificationScore(allocations: Allocation[]): number {
  const totalCapital = allocations.reduce((s, a) => s + a.launch_eur + a.workers_assigned * 200, 0);
  if (totalCapital === 0) return 0;
  const byCat: Record<string, number> = {};
  for (const a of allocations) {
    const cat = a.category ?? 'unknown';
    const weight = (a.launch_eur + a.workers_assigned * 200) / totalCapital;
    byCat[cat] = (byCat[cat] ?? 0) + weight;
  }
  const herfindahl = Object.values(byCat).reduce((s, w) => s + w * w, 0);
  return Math.max(0, Math.min(1, 1 - herfindahl));
}

export async function proposePortfolio(
  supabaseAdmin: SupabaseClient,
  input: PortfolioInput,
): Promise<PortfolioResult> {
  // 1. Load current top 20
  const { data: top20, error: loadErr } = await supabaseAdmin
    .from('business_ideas')
    .select('slug, name, category, autonomy_score, leverage_configs, optimal_config, mrr_median, llc_gate, leverage_elasticity')
    .not('rank', 'is', null)
    .order('rank')
    .limit(20);
  if (loadErr) throw new Error(`Cannot load top 20: ${loadErr.message}`);
  if (!top20 || top20.length === 0) throw new Error('No ideas in top 20 — run Hisoka first');

  // 2. LLM Portfolio Optimizer
  const prompt = buildPortfolioPrompt({
    ideas: top20 as Parameters<typeof buildPortfolioPrompt>[0]['ideas'],
    availableCapitalEur: input.availableCapitalEur,
    maxExtraWorkers: input.maxExtraWorkers,
    riskAppetite: input.riskAppetite,
  });
  const gen = await withFallback(
    {
      system: IDEATOR_SYSTEM,
      prompt,
      model: 'llama-4-scout-17b-16e-instruct',
      temperature: 0.5,
      maxTokens: 3000,
    },
    {
      project: 'cc',
      order: ['groq', 'openrouter', 'anthropic'],
    },
  );
  const costEur = (gen.costUsd ?? 0) * 0.92;

  // Strip code fences defensively before extracting JSON
  const cleanedText = gen.text.replace(/^```(?:json)?\n?|\n?```$/g, '').trim();

  let parsed: { allocations: Allocation[]; rationale: string };
  try {
    parsed = extractJSON<{ allocations: Allocation[]; rationale: string }>(cleanedText);
  } catch (e) {
    throw new Error(`Portfolio LLM JSON parse failed: ${String(e).slice(0, 200)}`);
  }

  // 3. Enrich allocations with idea metadata (name, category, verify slug exists)
  const bySlug = new Map(
    (top20 as Array<{ slug: string; name: string; category: string }>).map(i => [i.slug, i])
  );
  const allocations: Allocation[] = (parsed.allocations ?? []).map(a => {
    const meta = bySlug.get(a.idea_slug);
    return {
      ...a,
      idea_name: meta?.name,
      category: meta?.category,
    };
  }).filter(a => a.idea_name); // drop any LLM-hallucinated slug

  if (allocations.length === 0) throw new Error('No valid allocations in LLM response');

  // 4. Aggregate metrics
  const totalLaunch = allocations.reduce((s, a) => s + a.launch_eur, 0);
  const totalWorkers = allocations.reduce((s, a) => s + a.workers_assigned, 0);
  // 3y worker cost upfront approximation: €200/mo × 36 months
  const totalCapitalAtStart = totalLaunch + totalWorkers * 200 * 36;

  // expected_arr_y3_eur = sum of MRR@M36 × 12 (per idea, from LLM's expected_mrr_y3_eur = annual at y3)
  const expectedArrY3 = allocations.reduce((s, a) => s + (a.expected_mrr_y3_eur || 0), 0);

  // Annualized return ≈ (expectedArrY3 / totalCapitalAtStart)^(1/3) - 1, capped to sane range
  const annualizedReturn = totalCapitalAtStart > 0
    ? Math.pow(Math.max(expectedArrY3, 1) / Math.max(totalCapitalAtStart, 1), 1 / 3) - 1
    : 0;
  const annualizedReturnPct = Math.max(-100, Math.min(1000, annualizedReturn * 100));
  const sp500DeltaPct = annualizedReturnPct - SP500_ANNUAL * 100;

  // Max drawdown proxy: assume P10 = 30% of median (rough — proper Monte Carlo is Phase 4)
  const maxDrawdownPct = 70;

  // Diversification score
  const divScore = diversificationScore(allocations);

  // Benchmark comparison
  const baseline = Math.max(totalCapitalAtStart, 1);
  const comparison_table = {
    hysa:      { annual_pct: HYSA_ANNUAL  * 100, arr_y3_eur: compoundOver3Years(baseline, HYSA_ANNUAL)  - baseline },
    bonds:     { annual_pct: BONDS_ANNUAL * 100, arr_y3_eur: compoundOver3Years(baseline, BONDS_ANNUAL) - baseline },
    sp500:     { annual_pct: SP500_ANNUAL * 100, arr_y3_eur: compoundOver3Years(baseline, SP500_ANNUAL) - baseline },
    portfolio: { annual_pct: annualizedReturnPct, arr_y3_eur: expectedArrY3 },
  };

  // 5. Persist
  const { data: inserted, error: insErr } = await supabaseAdmin
    .from('business_portfolios')
    .insert({
      available_capital_eur: input.availableCapitalEur,
      max_workers_to_add: input.maxExtraWorkers,
      risk_appetite: input.riskAppetite,
      allocation: allocations,
      expected_arr_y3_eur: expectedArrY3,
      irr_y3_pct: annualizedReturnPct,
      sp500_delta_pct: sp500DeltaPct,
      max_drawdown_pct: maxDrawdownPct,
      diversification_score: divScore,
      comparison_table,
      rationale: parsed.rationale,
    })
    .select('id')
    .single();
  if (insErr) throw new Error(`Portfolio insert failed: ${insErr.message}`);

  return {
    id: (inserted as { id: string }).id,
    allocations,
    expected_arr_y3_eur: expectedArrY3,
    annualized_return_pct: annualizedReturnPct,
    sp500_delta_pct: sp500DeltaPct,
    max_drawdown_pct: maxDrawdownPct,
    diversification_score: divScore,
    comparison_table,
    rationale: parsed.rationale,
    cost_eur: costEur,
  };
}
