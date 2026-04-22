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

  if (dim === 'acquisition') {
    const { scoreAcquisitionCase, ACQUISITION_QUALIFY_THRESHOLD } = await import('@/lib/hisoka/aam-benchmarks/acquisition/run');
    const scored = await Promise.all(results.map(async r => {
      const expected = (r as { expected?: { qualify: boolean; hook: string } }).expected;
      const actual = (r as { actual?: { qualified: boolean; hook: string; message: string } }).actual;
      if (!expected || !actual) return { case_id: 'missing', score: 0, passed: false };
      const s = await scoreAcquisitionCase(expected, actual);
      return { case_id: String((r as { id?: string }).id ?? 'unknown'), score: s.qualify_match + s.hook_match + s.message_quality / 5, passed: s.qualify_match === 1 };
    }));
    const qualifyRate = scored.filter(x => x.passed).length / Math.max(1, scored.length);
    const passed = qualifyRate >= ACQUISITION_QUALIFY_THRESHOLD;
    return {
      autonomy_after: passed ? Math.min(1, autonomyBefore + 0.20) : autonomyBefore + 0.05,
      passed_threshold: passed,
      score_per_case: scored,
      human_params_needed: requiredEnvKeys.map(k => ({ param: k, optional: false })),
      notes: `qualify rate ${qualifyRate.toFixed(2)} (threshold ${ACQUISITION_QUALIFY_THRESHOLD})`,
    };
  }

  if (dim === 'fulfillment') {
    const { scoreFulfillmentCase, FULFILLMENT_DELIVERY_THRESHOLD } = await import('@/lib/hisoka/aam-benchmarks/fulfillment/run');
    const scored = await Promise.all(results.map(async r => {
      const expected = (r as { expected?: { artifact: string; sla: number } }).expected;
      const actual = (r as { actual?: { artifact_type: string; elapsed_seconds: number } }).actual;
      if (!expected || !actual) return { case_id: 'missing', score: 0, passed: false };
      const s = await scoreFulfillmentCase(expected, actual);
      return { case_id: String((r as { id?: string }).id ?? 'unknown'), score: s.artifact_match + s.within_sla, passed: s.artifact_match === 1 && s.within_sla === 1 };
    }));
    const deliveryRate = scored.filter(x => x.passed).length / Math.max(1, scored.length);
    const passed = deliveryRate >= FULFILLMENT_DELIVERY_THRESHOLD;
    return {
      autonomy_after: passed ? Math.min(1, autonomyBefore + 0.20) : autonomyBefore + 0.05,
      passed_threshold: passed,
      score_per_case: scored,
      human_params_needed: requiredEnvKeys.map(k => ({ param: k, optional: false })),
      notes: `delivery rate ${deliveryRate.toFixed(2)} (threshold ${FULFILLMENT_DELIVERY_THRESHOLD})`,
    };
  }

  // Phase 5.4+ will cover additional dimensions
  return {
    autonomy_after: autonomyBefore,
    passed_threshold: false,
    score_per_case: [],
    human_params_needed: requiredEnvKeys.map(k => ({ param: k, optional: false })),
    notes: `dim ${dim} benchmark not yet implemented`,
  };
}
