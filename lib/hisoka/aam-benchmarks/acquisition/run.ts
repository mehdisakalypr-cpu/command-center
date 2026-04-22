import { withFallback, extractJSON } from '@/lib/ai-pool/cascade';
import { ACQUISITION_RUBRIC_SYSTEM } from './rubric';

export async function scoreAcquisitionCase(
  expected: { qualify: boolean; hook: string },
  actual: { qualified: boolean; hook: string; message: string },
) {
  const prompt = `Expected: qualify=${expected.qualify} hook=${expected.hook}\nActual: qualified=${actual.qualified} hook=${actual.hook}\nMessage: """${actual.message.slice(0, 600)}"""`;
  const gen = await withFallback(
    { system: ACQUISITION_RUBRIC_SYSTEM, prompt, model: 'llama-4-scout-17b-16e-instruct', temperature: 0, maxTokens: 150 },
    { project: 'cc', order: ['gemini','mistral','groq','openrouter'] },
  );
  return extractJSON<{ qualify_match: 0|1; hook_match: 0|1; message_quality: number }>(gen.text);
}
export const ACQUISITION_QUALIFY_THRESHOLD = 0.75;
