import { withFallback, extractJSON } from '@/lib/ai-pool/cascade';
import { FULFILLMENT_RUBRIC_SYSTEM } from './rubric';

export async function scoreFulfillmentCase(
  expected: { artifact: string; sla: number },
  actual: { artifact_type: string; elapsed_seconds: number },
) {
  const prompt = `Expected artifact: ${expected.artifact} within ${expected.sla}s.\nActual: ${actual.artifact_type} in ${actual.elapsed_seconds}s.`;
  const gen = await withFallback(
    { system: FULFILLMENT_RUBRIC_SYSTEM, prompt, model: 'llama-4-scout-17b-16e-instruct', temperature: 0, maxTokens: 100 },
    { project: 'cc', order: ['groq','openrouter'] },
  );
  return extractJSON<{ artifact_match: 0|1; within_sla: 0|1 }>(gen.text);
}
export const FULFILLMENT_DELIVERY_THRESHOLD = 1.0;
