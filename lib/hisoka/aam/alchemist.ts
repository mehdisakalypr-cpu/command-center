import { withFallback, extractJSON, stripPreamble, STRICT_JSON_DIRECTIVE } from '@/lib/ai-pool/cascade';
import type { AutomationGap, Candidate, IntegrationPlan } from './types';

const SYSTEM = `You are Power Loader, support-item engineer. Given a gap and a chosen candidate (GitHub repo or library), you synthesize a minimal integration plan: an install script (bash), an entry-point file (JS or Python), and the code that invokes the library against a benchmark fixture file.${STRICT_JSON_DIRECTIVE}`;

export async function synthesizeIntegration(
  gap: AutomationGap,
  candidate: Candidate,
): Promise<IntegrationPlan> {
  const prompt = `Gap on ${gap.dim}: ${gap.description}
Chosen candidate: ${candidate.title}
URL: ${candidate.url}
Language: ${candidate.language ?? 'unknown'}

Write:
1. install_script: bash commands to clone the repo and install deps (assume Ubuntu 22, node 22, python 3.11 pre-installed). Cap at 15 lines.
2. entry_point: filename (e.g. "run.mjs" or "run.py").
3. entry_code: the code body that reads fixtures.json (an array of test cases at ./fixtures.json), runs each through the candidate lib, and writes results.json. Keep it under 40 lines. Be defensive — wrap each case in try/catch.
4. required_env_keys: list of env vars the candidate needs (e.g. ["OPENAI_API_KEY"]).

Return JSON: { "install_script": "...", "entry_point": "run.mjs", "entry_code": "...", "required_env_keys": [...], "notes": "..." }`;

  const gen = await withFallback(
    { system: SYSTEM, prompt, model: 'anthropic/claude-sonnet-4-6', temperature: 0.2, maxTokens: 4000 },
    { project: 'cc', order: ['gemini','mistral','openrouter','anthropic','groq'] },
  );
  const parsed = extractJSON<Omit<IntegrationPlan,'candidate'>>(stripPreamble(gen.text));
  return { ...parsed, candidate };
}
