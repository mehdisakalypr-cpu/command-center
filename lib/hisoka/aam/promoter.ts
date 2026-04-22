import type { SupabaseClient } from '@supabase/supabase-js';
import type { EvaluationResult, ForgeVerdict } from './types';

const PROMOTION_MIN_AUTONOMY = 0.92;
const MIN_UPLIFT = 0.10;
const MAX_HUMAN_PARAMS = 2;

export function decideVerdict(
  autonomyBefore: number,
  evaluation: EvaluationResult,
  attemptNumber: number,
  maxAttempts = 3,
): { verdict: ForgeVerdict; reason: string } {
  if (!evaluation.passed_threshold) {
    if (attemptNumber >= maxAttempts) {
      return { verdict: 'failed', reason: `benchmark failed on attempt ${attemptNumber}/${maxAttempts} (permanent)` };
    }
    return { verdict: 'failed', reason: `benchmark failed (${attemptNumber}/${maxAttempts})` };
  }
  const uplift = evaluation.autonomy_after - autonomyBefore;
  if (uplift < MIN_UPLIFT) {
    return { verdict: 'failed', reason: `uplift ${uplift.toFixed(2)} < ${MIN_UPLIFT} (anti-marginal)` };
  }
  if (evaluation.autonomy_after < PROMOTION_MIN_AUTONOMY) {
    return { verdict: 'needs_human', reason: `autonomy_after ${evaluation.autonomy_after} < ${PROMOTION_MIN_AUTONOMY}` };
  }
  if (evaluation.human_params_needed.length > MAX_HUMAN_PARAMS) {
    return { verdict: 'needs_human', reason: `${evaluation.human_params_needed.length} human params > ${MAX_HUMAN_PARAMS}` };
  }
  return { verdict: 'promoted', reason: 'all gates passed' };
}

export async function applyPromotion(
  admin: SupabaseClient,
  ideaId: string,
  autonomyAfter: number,
  dim: 'acquisition'|'content_ops'|'fulfillment'|'support',
): Promise<void> {
  const col = `autonomy_${dim}`;
  await admin.from('business_ideas').update({
    [col]: autonomyAfter,
    forge_status: 'promoted',
    last_forge_at: new Date().toISOString(),
  }).eq('id', ideaId);
}
