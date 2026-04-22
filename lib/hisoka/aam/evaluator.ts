import type { ForgeableDim, EvaluationResult, TestOutput } from './types';
import { scoreContentCase, CONTENT_OPS_PASS_THRESHOLD } from '@/lib/hisoka/aam-benchmarks/content_ops/run';
import { scoreSupportCase, SUPPORT_DISPOSITION_THRESHOLD, SUPPORT_RESOLVED_THRESHOLD } from '@/lib/hisoka/aam-benchmarks/support/run';

export async function evaluate(
  dim: ForgeableDim,
  autonomyBefore: number,
  testOutput: TestOutput,
  requiredEnvKeys: string[],
): Promise<EvaluationResult> {
  const metrics = testOutput.raw_metrics as { results?: Array<Record<string, unknown>> };
  const results = metrics?.results ?? [];

  if (!testOutput.exited_cleanly || results.length === 0) {
    return {
      autonomy_after: autonomyBefore,
      passed_threshold: false,
      score_per_case: [],
      human_params_needed: requiredEnvKeys.map(k => ({ param: k, optional: false })),
      notes: 'sandbox did not produce results',
    };
  }

  if (dim === 'content_ops') {
    const scored = await Promise.all(results.map(async r => {
      const post = String((r as { post?: string }).post ?? '');
      const expectedMin = Number((r as { expected_word_min?: number }).expected_word_min ?? 400);
      const s = await scoreContentCase(post, expectedMin);
      return { case_id: String((r as { id?: string }).id ?? 'unknown'), score: s.overall, passed: s.overall >= CONTENT_OPS_PASS_THRESHOLD };
    }));
    const avg = scored.reduce((s, x) => s + x.score, 0) / Math.max(1, scored.length);
    const passed = avg >= CONTENT_OPS_PASS_THRESHOLD;
    return {
      autonomy_after: passed ? Math.min(1, autonomyBefore + 0.20) : autonomyBefore + 0.05,
      passed_threshold: passed,
      score_per_case: scored,
      human_params_needed: requiredEnvKeys.map(k => ({ param: k, optional: false })),
      notes: `avg rubric score ${avg.toFixed(2)} (threshold ${CONTENT_OPS_PASS_THRESHOLD})`,
    };
  }

  if (dim === 'support') {
    const scored = await Promise.all(results.map(async r => {
      const ticket = (r as { ticket?: { subject: string; body: string; expected_disposition: string } }).ticket;
      const reply = String((r as { reply?: string }).reply ?? '');
      if (!ticket) return { case_id: 'missing', score: 0, passed: false };
      const s = await scoreSupportCase(ticket, reply);
      return { case_id: String((r as { id?: string }).id ?? 'unknown'), score: s.disposition_match + s.resolved_without_human, passed: s.disposition_match === 1 };
    }));
    const dispositionRate = scored.filter(x => x.passed).length / Math.max(1, scored.length);
    const passed = dispositionRate >= SUPPORT_DISPOSITION_THRESHOLD;
    void SUPPORT_RESOLVED_THRESHOLD;
    return {
      autonomy_after: passed ? Math.min(1, autonomyBefore + 0.20) : autonomyBefore + 0.05,
      passed_threshold: passed,
      score_per_case: scored,
      human_params_needed: requiredEnvKeys.map(k => ({ param: k, optional: false })),
      notes: `disposition match rate ${dispositionRate.toFixed(2)} (threshold ${SUPPORT_DISPOSITION_THRESHOLD})`,
    };
  }

  // Phase 5.3 will cover acquisition + fulfillment
  return {
    autonomy_after: autonomyBefore,
    passed_threshold: false,
    score_per_case: [],
    human_params_needed: requiredEnvKeys.map(k => ({ param: k, optional: false })),
    notes: `dim ${dim} benchmark not yet implemented (Phase 5.3)`,
  };
}
