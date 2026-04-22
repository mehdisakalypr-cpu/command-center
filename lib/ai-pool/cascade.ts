/**
 * Cascade — try providers in order, rotating keys on each attempt.
 *
 * withFallback([...], input) returns the first successful response and
 * logs every attempt to ai_key_events.
 */

import { isAuthError, isRateLimit, logEvent, markFailure, markSuccess } from './health'
import { pickKey } from './router'
import { DEFAULT_CASCADE_ORDER } from './router'
import { hasAnyKey } from './registry'
import { callOpenRouter } from './providers/openrouter'
import { callGemini } from './providers/gemini'
import { callMistral } from './providers/mistral'
import type { GenInput, GenOutput, ProjectTag, Provider } from './types'

// Lazy Anthropic caller — avoids importing the SDK unless we actually need it.
async function callAnthropic(apiKey: string, input: GenInput): Promise<{ text: string; inputTokens?: number; outputTokens?: number; costUsd?: number }> {
  const model = input.model?.startsWith('anthropic/') ? input.model.replace('anthropic/', '') : (input.model ?? 'claude-sonnet-4-6')
  // Anthropic pricing (as of 2026-04): Sonnet $3/$15 per M tokens
  const COST_PER_INPUT_TOKEN = 3 / 1_000_000
  const COST_PER_OUTPUT_TOKEN = 15 / 1_000_000
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: input.maxTokens ?? 8000,
      temperature: input.temperature ?? 0.3,
      system: input.system,
      messages: [{ role: 'user', content: input.prompt }],
    }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`anthropic ${res.status}: ${body.slice(0, 200)}`)
  }
  const data = await res.json() as {
    content?: Array<{ type: string; text?: string }>
    usage?: { input_tokens?: number; output_tokens?: number }
  }
  const text = data.content?.find(b => b.type === 'text')?.text
  if (!text) throw new Error('anthropic: empty content block')
  const inputTokens = data.usage?.input_tokens
  const outputTokens = data.usage?.output_tokens
  const costUsd = (inputTokens ?? 0) * COST_PER_INPUT_TOKEN + (outputTokens ?? 0) * COST_PER_OUTPUT_TOKEN
  return { text, inputTokens, outputTokens, costUsd }
}

// Lazy Groq caller — free tier, very fast, supports Llama 4 + Qwen models.
async function callGroq(apiKey: string, input: GenInput): Promise<{ text: string; inputTokens?: number; outputTokens?: number; costUsd?: number }> {
  // Strip provider prefix if present; default to llama-4-scout which handles large structured outputs.
  const model = input.model?.startsWith('groq/') ? input.model.replace('groq/', '') : 'llama-3.3-70b-versatile'
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: input.temperature ?? 0.3,
      max_tokens: input.maxTokens ?? 8000,
      messages: [
        ...(input.system ? [{ role: 'system' as const, content: input.system }] : []),
        { role: 'user' as const, content: input.prompt },
      ],
    }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`groq ${res.status}: ${body.slice(0, 200)}`)
  }
  const data = await res.json() as {
    choices?: { message?: { content?: string } }[]
    usage?: { prompt_tokens?: number; completion_tokens?: number }
  }
  const text = data.choices?.[0]?.message?.content
  if (!text) throw new Error('groq: empty response')
  const inputTokens = data.usage?.prompt_tokens
  const outputTokens = data.usage?.completion_tokens
  // Groq pricing for Llama 4: ~$0.11/$0.34 per M tokens (approx)
  const costUsd = (inputTokens ?? 0) * 0.11 / 1_000_000 + (outputTokens ?? 0) * 0.34 / 1_000_000
  return { text, inputTokens, outputTokens, costUsd }
}

// Lazy OpenAI caller — wired for GPT-4o class models.
async function callOpenAI(apiKey: string, input: GenInput): Promise<{ text: string; inputTokens?: number; outputTokens?: number; costUsd?: number }> {
  const model = input.model?.startsWith('openai/') ? input.model.replace('openai/', '') : 'gpt-4o-mini'
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: input.temperature ?? 0.3,
      max_tokens: input.maxTokens ?? 8000,
      messages: [
        ...(input.system ? [{ role: 'system' as const, content: input.system }] : []),
        { role: 'user' as const, content: input.prompt },
      ],
    }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`openai ${res.status}: ${body.slice(0, 200)}`)
  }
  const data = await res.json() as {
    choices?: { message?: { content?: string } }[]
    usage?: { prompt_tokens?: number; completion_tokens?: number }
  }
  const text = data.choices?.[0]?.message?.content
  if (!text) throw new Error('openai: empty response')
  const inputTokens = data.usage?.prompt_tokens
  const outputTokens = data.usage?.completion_tokens
  // gpt-4o-mini pricing: $0.15/$0.60 per M tokens
  const costUsd = (inputTokens ?? 0) * 0.15 / 1_000_000 + (outputTokens ?? 0) * 0.60 / 1_000_000
  return { text, inputTokens, outputTokens, costUsd }
}

const MAX_ATTEMPTS_PER_PROVIDER = 2

async function runProvider(provider: Provider, input: GenInput, project: ProjectTag): Promise<GenOutput> {
  const errors: string[] = []
  for (let attempt = 0; attempt < MAX_ATTEMPTS_PER_PROVIDER; attempt++) {
    const k = pickKey(provider)
    if (!k) break
    const start = Date.now()
    try {
      let text = ''
      let inputTokens: number | undefined
      let outputTokens: number | undefined
      let costUsd: number | undefined

      if (provider === 'openrouter') {
        const r = await callOpenRouter(k.value, input)
        text = r.text
        inputTokens = r.inputTokens
        outputTokens = r.outputTokens
        costUsd = r.costUsd
      } else if (provider === 'anthropic') {
        const r = await callAnthropic(k.value, input)
        text = r.text
        inputTokens = r.inputTokens
        outputTokens = r.outputTokens
        costUsd = r.costUsd
      } else if (provider === 'openai') {
        const r = await callOpenAI(k.value, input)
        text = r.text
        inputTokens = r.inputTokens
        outputTokens = r.outputTokens
        costUsd = r.costUsd
      } else if (provider === 'groq') {
        const r = await callGroq(k.value, input)
        text = r.text
        inputTokens = r.inputTokens
        outputTokens = r.outputTokens
        costUsd = r.costUsd
      } else if (provider === 'gemini') {
        const r = await callGemini(k.value, input)
        text = r.text
        inputTokens = r.inputTokens
        outputTokens = r.outputTokens
        costUsd = r.costUsd
      } else if (provider === 'mistral') {
        const r = await callMistral(k.value, input)
        text = r.text
        inputTokens = r.inputTokens
        outputTokens = r.outputTokens
        costUsd = r.costUsd
      } else {
        // Remaining providers can be added as lib/ai-pool/providers/*.ts.
        throw new Error(`provider ${provider} not wired in CC cascade (supported: openrouter, anthropic, openai, groq, gemini, mistral)`)
      }

      const durationMs = Date.now() - start
      markSuccess(k)
      void logEvent(project, {
        provider, key_label: k.label, event: 'call_ok',
        latency_ms: durationMs, input_tokens: inputTokens, output_tokens: outputTokens, cost_usd: costUsd,
      })
      return { text, provider, keyLabel: k.label, inputTokens, outputTokens, costUsd, durationMs }
    } catch (e: unknown) {
      const msg = (e as Error)?.message || String(e)
      errors.push(`${k.label}:${msg.slice(0, 80)}`)
      const rate = isRateLimit(e)
      const auth = isAuthError(e)
      markFailure(k, rate ? 65_000 : auth ? 24 * 60 * 60_000 : 30_000)
      void logEvent(project, {
        provider, key_label: k.label,
        event: rate ? 'rate_limit' : auth ? 'quota_exhausted' : 'call_fail',
        latency_ms: Date.now() - start,
        error_code: msg.slice(0, 120),
      })
      if (auth) break // don't retry with the same bad key
    }
  }
  throw new Error(`${provider}: all attempts failed · ${errors.join(' | ')}`)
}

export type CascadeOptions = {
  /** Project tag for logging. Defaults to 'cc'. */
  project?: ProjectTag
  /** Override the default provider order. */
  order?: Provider[]
}

export async function withFallback(input: GenInput, opts: CascadeOptions = {}): Promise<GenOutput> {
  const project = opts.project ?? 'cc'
  const order = (opts.order ?? DEFAULT_CASCADE_ORDER).filter(hasAnyKey)
  if (!order.length) throw new Error('ai-pool: no provider has a configured key')

  const errors: string[] = []
  for (const provider of order) {
    try {
      return await runProvider(provider, input, project)
    } catch (e: unknown) {
      errors.push(`${provider}:${(e as Error)?.message?.slice(0, 100) ?? 'err'}`)
    }
  }
  throw new Error(`ai-pool cascade failed · ${errors.join(' | ')}`)
}

/**
 * Repair a JSON payload truncated mid-stream (e.g. LLM output hit maxTokens).
 *
 * Strategy: collect every `}` position outside strings, then try candidates
 * in reverse order — treat each as a potential truncation point, close any
 * still-open `{` / `[`, and test with `JSON.parse`. Returns the first slice
 * that parses, otherwise `null`.
 *
 * This tolerates truncation inside strings, numbers, or nested objects by
 * simply retreating to the most recent complete top-level child boundary.
 */
export function repairTruncatedJSON(raw: string): string | null {
  const text = raw.trim()
  if (!text) return null
  try { JSON.parse(text); return text } catch { /* fall through */ }

  const closePositions: number[] = []
  let inStr = false
  let esc = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (esc) { esc = false; continue }
    if (c === '\\' && inStr) { esc = true; continue }
    if (c === '"') { inStr = !inStr; continue }
    if (!inStr && c === '}') closePositions.push(i)
  }

  for (let idx = closePositions.length - 1; idx >= 0; idx--) {
    let candidate = text.slice(0, closePositions[idx] + 1)
    candidate = candidate.replace(/,\s*$/, '')

    const stack: string[] = []
    let istr = false, es = false
    for (let i = 0; i < candidate.length; i++) {
      const c = candidate[i]
      if (es) { es = false; continue }
      if (c === '\\' && istr) { es = true; continue }
      if (c === '"') { istr = !istr; continue }
      if (istr) continue
      if (c === '{') stack.push('}')
      else if (c === '[') stack.push(']')
      else if ((c === '}' || c === ']') && stack.length > 0 && stack[stack.length - 1] === c) {
        stack.pop()
      }
    }
    if (istr) continue

    let repaired = candidate
    while (stack.length > 0) repaired += stack.pop()

    try { JSON.parse(repaired); return repaired } catch { /* try earlier */ }
  }

  return null
}

/**
 * Extract the first JSON object/array from a free-form response.
 * Falls back to {@link repairTruncatedJSON} on truncated LLM outputs —
 * tries repair on the regex match first, then on the full text starting
 * at the first opening brace/bracket (handles payloads with no closing).
 */
export function extractJSON<T = unknown>(text: string): T {
  const match = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/)
  if (match) {
    try { return JSON.parse(match[0]) as T } catch {
      const repaired = repairTruncatedJSON(match[0])
      if (repaired) return JSON.parse(repaired) as T
    }
  }
  const firstOpen = text.search(/[{[]/)
  if (firstOpen >= 0) {
    const repaired = repairTruncatedJSON(text.slice(firstOpen))
    if (repaired) return JSON.parse(repaired) as T
  }
  throw new Error(`No JSON in response: ${text.slice(0, 160)}`)
}

export async function withFallbackJSON<T = unknown>(
  input: GenInput, opts: CascadeOptions = {},
): Promise<{ data: T; out: GenOutput }> {
  const out = await withFallback(input, opts)
  return { data: extractJSON<T>(out.text), out }
}
