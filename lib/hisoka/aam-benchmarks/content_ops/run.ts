import { withFallback, extractJSON } from '@/lib/ai-pool/cascade';
import { CONTENT_OPS_RUBRIC_SYSTEM } from './rubric';

export async function scoreContentCase(post: string, expectedWordMin: number): Promise<{ overall: number; breakdown: unknown }> {
  const prompt = `Blog post (expected ≥${expectedWordMin} words):\n"""\n${post.slice(0, 4000)}\n"""\nScore strictly. JSON only.`;
  const gen = await withFallback(
    { system: CONTENT_OPS_RUBRIC_SYSTEM, prompt, model: 'llama-4-scout-17b-16e-instruct', temperature: 0, maxTokens: 400 },
    { project: 'cc', order: ['gemini','mistral','groq','openrouter'] },
  );
  const parsed = extractJSON<{ originality: number; factuality: number; seo_signals: number; length_voice: number; overall: number }>(gen.text);
  return { overall: parsed.overall ?? 0, breakdown: parsed };
}

export const CONTENT_OPS_PASS_THRESHOLD = 3.5;
