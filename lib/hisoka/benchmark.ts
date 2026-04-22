import type { SupabaseClient } from '@supabase/supabase-js';
import { withFallback, extractJSON } from '@/lib/ai-pool/cascade';
import { getBricks, getMinatoAgents } from './registries';
import { buildBenchmarkPrompt, IDEATOR_SYSTEM } from './prompts';
import { hardGates, baseScore } from './scoring';
import type { ScoredIdea } from './types';

export type BenchmarkResult = {
  id: string;
  scored: ScoredIdea;
  passed_gates: boolean;
  gate_reasons: string[];
  score: number;
  rank_if_added: number | null; // 1-20 where it would slot, null if below top 20
  verdict: 'top_3' | 'top_10' | 'top_20' | 'below_top_20' | 'fails_gates';
  cost_eur: number;
};

export async function benchmarkIdea(
  supabaseAdmin: SupabaseClient,
  userText: string,
): Promise<BenchmarkResult> {
  const [bricks, agents, currentTopResult] = await Promise.all([
    getBricks(),
    getMinatoAgents(),
    supabaseAdmin
      .from('business_ideas')
      .select('slug, score')
      .not('rank', 'is', null)
      .order('score', { ascending: false })
      .limit(20),
  ]);

  const currentTop = (currentTopResult.data ?? []) as Array<{ slug: string; score: number }>;

  const prompt = buildBenchmarkPrompt({ userText, bricks, agents });
  const gen = await withFallback(
    {
      system: IDEATOR_SYSTEM,
      prompt,
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      temperature: 0.4,
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

  let scored: ScoredIdea;
  try {
    scored = extractJSON<ScoredIdea>(cleanedText);
  } catch (e) {
    throw new Error(`Benchmark LLM JSON parse failed: ${String(e).slice(0, 200)} | raw=${gen.text.slice(0, 400)}`);
  }

  const gates = hardGates(scored);
  const score = gates.passed ? baseScore(scored) : 0;

  // Compute rank_if_added: count of current-top ideas with strictly higher score
  let rank_if_added: number | null = null;
  if (gates.passed) {
    const topScores = currentTop.map(r => Number(r.score));
    const higher = topScores.filter(s => s > score).length;
    if (higher < 20) rank_if_added = higher + 1;
  }

  let verdict: BenchmarkResult['verdict'];
  if (!gates.passed) verdict = 'fails_gates';
  else if (rank_if_added === null) verdict = 'below_top_20';
  else if (rank_if_added <= 3) verdict = 'top_3';
  else if (rank_if_added <= 10) verdict = 'top_10';
  else verdict = 'top_20';

  // Persist the benchmark result
  const { data: inserted, error } = await supabaseAdmin
    .from('business_idea_benchmarks')
    .insert({
      user_input: userText,
      scored_fields: scored,
      rank_if_added,
      verdict,
      cost_eur: costEur,
    })
    .select('id')
    .single();

  if (error) throw new Error(`Benchmark insert failed: ${error.message}`);

  return {
    id: (inserted as { id: string }).id,
    scored,
    passed_gates: gates.passed,
    gate_reasons: gates.reasons,
    score,
    rank_if_added,
    verdict,
    cost_eur: costEur,
  };
}
