import { withFallback, extractJSON, stripPreamble, STRICT_JSON_DIRECTIVE } from '@/lib/ai-pool/cascade';
import type { AutomationGap, ForgeableDim } from './types';

const FORGEABLE: ForgeableDim[] = ['acquisition','content_ops','fulfillment','support'];

const SYSTEM = `You are a business-automation auditor. Given an idea and its per-dimension autonomy scores, you identify which dimensions have the biggest automation gap and describe what human work remains.${STRICT_JSON_DIRECTIVE}`;

export type AnalyzerInput = {
  idea: {
    name: string; tagline: string; rationale?: string;
    autonomy_acquisition: number;
    autonomy_content_ops: number;
    autonomy_fulfillment: number;
    autonomy_support: number;
    autonomy_billing: number;
    autonomy_compliance: number;
  };
};

export async function analyzeGaps(input: AnalyzerInput): Promise<AutomationGap[]> {
  const a = input.idea;
  const prompt = `Idea: "${a.name}" — ${a.tagline}
Autonomy scores (0-1):
- acquisition: ${a.autonomy_acquisition}
- content_ops: ${a.autonomy_content_ops}
- fulfillment: ${a.autonomy_fulfillment}
- support: ${a.autonomy_support}
- billing: ${a.autonomy_billing}
- compliance: ${a.autonomy_compliance}

For each dimension with autonomy < 0.92, describe what human work currently prevents full automation. Mark compliance and billing as forgeable=false (humain obligatoire per policy).
Return strict JSON: { "gaps": [{ "dim": "acquisition"|"content_ops"|"fulfillment"|"support"|"billing"|"compliance", "current_autonomy": 0.xx, "description": "<1 sentence>", "forgeable": true|false }] }`;

  const gen = await withFallback(
    { system: SYSTEM, prompt, model: 'llama-4-scout-17b-16e-instruct', temperature: 0.3, maxTokens: 2000 },
    { project: 'cc', order: ['gemini','mistral','groq','openrouter','anthropic'] },
  );
  const parsed = extractJSON<{ gaps: AutomationGap[] }>(stripPreamble(gen.text));
  // Enforce compliance/billing are never forgeable regardless of LLM output
  return (parsed.gaps ?? []).map(g => ({
    ...g,
    forgeable: FORGEABLE.includes(g.dim as ForgeableDim) && g.forgeable !== false,
  }));
}
