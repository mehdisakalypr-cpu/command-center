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
import type { GenInput, GenOutput, ProjectTag, Provider } from './types'

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
      } else {
        // Providers beyond openrouter are wired lazily to keep the CC build slim.
        // They can be added as lib/ai-pool/providers/*.ts and plugged in here.
        throw new Error(`provider ${provider} not wired in CC cascade (use openrouter)`)
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

/** Extract the first JSON object/array from a free-form response. */
export function extractJSON<T = unknown>(text: string): T {
  const match = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/)
  if (!match) throw new Error(`No JSON in response: ${text.slice(0, 160)}`)
  return JSON.parse(match[0]) as T
}

export async function withFallbackJSON<T = unknown>(
  input: GenInput, opts: CascadeOptions = {},
): Promise<{ data: T; out: GenOutput }> {
  const out = await withFallback(input, opts)
  return { data: extractJSON<T>(out.text), out }
}
