import { withFallback, extractJSON } from '@/lib/ai-pool/cascade';
import { SUPPORT_RUBRIC_SYSTEM } from './rubric';

export async function scoreSupportCase(ticket: { subject: string; body: string; expected_disposition: string }, actualResponse: string) {
  const prompt = `Ticket: ${ticket.subject}\n"${ticket.body}"\nExpected disposition: ${ticket.expected_disposition}\nAutomation response: """${actualResponse.slice(0, 1500)}"""\nJSON only.`;
  const gen = await withFallback(
    { system: SUPPORT_RUBRIC_SYSTEM, prompt, model: 'llama-4-scout-17b-16e-instruct', temperature: 0, maxTokens: 200 },
    { project: 'cc', order: ['gemini','mistral','groq','openrouter'] },
  );
  return extractJSON<{ disposition_match: 0|1; resolved_without_human: 0|1 }>(gen.text);
}

export const SUPPORT_DISPOSITION_THRESHOLD = 0.8;
export const SUPPORT_RESOLVED_THRESHOLD = 0.7;
