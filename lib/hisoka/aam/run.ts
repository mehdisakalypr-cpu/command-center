import type { SupabaseClient } from '@supabase/supabase-js';
import { analyzeGaps } from './analyzer';
import { scoutCandidates } from './scout';
import { synthesizeIntegration } from './alchemist';
import { runSandboxTest } from './tester';
import { evaluate } from './evaluator';
import { decideVerdict, applyPromotion } from './promoter';
import type { ForgeResult, ForgeableDim } from './types';

export type ForgeOneOpts = { ideaId: string; admin: SupabaseClient };

export async function forgeOne({ ideaId, admin }: ForgeOneOpts): Promise<ForgeResult> {
  const { data: idea } = await admin.from('business_ideas').select('*').eq('id', ideaId).single();
  if (!idea) throw new Error(`idea ${ideaId} not found`);

  let verdict: 'promoted'|'failed'|'needs_human' = 'failed';
  let reason = '';
  let autonomyAfter: number | null = null;
  let cost = 0;
  let attemptId = 'none';
  let attemptNumber = 0;
  let dim: ForgeableDim = 'content_ops';
  let autonomyBefore = 0;

  try {
    const gaps = await analyzeGaps({ idea: idea as Parameters<typeof analyzeGaps>[0]['idea'] });
    const forgeable = gaps.filter(g => g.forgeable).sort((a, b) => a.current_autonomy - b.current_autonomy);
    if (forgeable.length === 0) {
      return stubVerdict(ideaId, 'no forgeable gap', 'failed');
    }
    const gap = forgeable[0];
    dim = gap.dim as ForgeableDim;
    autonomyBefore = gap.current_autonomy;

    attemptNumber = (idea.forge_attempts ?? 0) + 1;
    await admin.from('business_ideas').update({
      forge_status: 'forging',
      forge_attempts: attemptNumber,
      automation_gaps: gaps,
    }).eq('id', ideaId);

    const { data: attemptRow } = await admin.from('automation_upgrades').insert({
      idea_id: ideaId,
      attempt_number: attemptNumber,
      dim_targeted: dim,
      autonomy_before: autonomyBefore,
      verdict: 'failed',
    }).select('id').single();
    attemptId = (attemptRow as { id: string }).id;

    const candidates = await scoutCandidates(gap, 3);
    if (candidates.length === 0) { reason = 'no candidates found'; throw new Error(reason); }
    await admin.from('automation_upgrades').update({ candidates, chosen_candidate: candidates[0] }).eq('id', attemptId);

    const plan = await synthesizeIntegration(gap, candidates[0]);
    await admin.from('automation_upgrades').update({ integration_plan: plan }).eq('id', attemptId);
    cost += 0.005;

    const fixtures = await loadFixtures(dim);
    const testOutput = await runSandboxTest(plan, fixtures);
    cost += 0.01;
    await admin.from('automation_upgrades').update({
      sandbox_run_id: testOutput.sandbox_run_id,
      test_output: testOutput.raw_metrics,
    }).eq('id', attemptId);

    const evaluation = await evaluate(dim, autonomyBefore, testOutput, plan.required_env_keys);
    cost += 0.002;
    autonomyAfter = evaluation.autonomy_after;
    await admin.from('automation_upgrades').update({
      autonomy_after: evaluation.autonomy_after,
      human_params_needed: evaluation.human_params_needed,
    }).eq('id', attemptId);

    const decision = decideVerdict(autonomyBefore, evaluation, attemptNumber);
    verdict = decision.verdict === 'out_of_budget' ? 'failed' : decision.verdict;
    reason = decision.reason;
    if (verdict === 'promoted') {
      await applyPromotion(admin, ideaId, evaluation.autonomy_after, dim);
    }
  } catch (e) {
    reason = reason || String(e).slice(0, 200);
  } finally {
    if (attemptId !== 'none') {
      const nextStatus = verdict === 'promoted' ? 'promoted'
        : attemptNumber >= 3 ? 'permanent_fail'
        : 'idle';
      await admin.from('business_ideas').update({ forge_status: nextStatus }).eq('id', ideaId);
      await admin.from('automation_upgrades').update({
        verdict, verdict_reason: reason, cost_eur: cost, finished_at: new Date().toISOString(),
      }).eq('id', attemptId);
    }
  }

  return {
    attempt_id: attemptId, idea_id: ideaId, attempt_number: attemptNumber,
    dim_targeted: dim, autonomy_before: autonomyBefore, autonomy_after: autonomyAfter,
    verdict, verdict_reason: reason, cost_eur: cost,
  };
}

async function loadFixtures(dim: ForgeableDim): Promise<string> {
  const { promises: fs } = await import('node:fs');
  const path = await import('node:path');
  const abs = path.join(process.cwd(), 'lib/hisoka/aam-benchmarks', dim, 'fixtures.json');
  return fs.readFile(abs, 'utf-8');
}

function stubVerdict(ideaId: string, reason: string, verdict: 'failed'|'needs_human'): ForgeResult {
  return {
    attempt_id: 'none', idea_id: ideaId, attempt_number: 0,
    dim_targeted: 'content_ops', autonomy_before: 0, autonomy_after: null,
    verdict, verdict_reason: reason, cost_eur: 0,
  };
}
