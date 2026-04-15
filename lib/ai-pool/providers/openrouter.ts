/**
 * OpenRouter client — one key, many models.
 *
 * Priority provider in the cascade: a single OPENROUTER_API_KEY gives
 * access to Claude / GPT / Llama / Gemini / Mistral through the same
 * endpoint, so when present we try it first.
 */

import type { GenInput } from '../types'

const DEFAULT_MODEL_CHAIN = [
  // Free models first (as of 2026-04).
  'google/gemini-2.5-flash-lite:free',
  'openai/gpt-oss-120b:free',
  'qwen/qwen3-next-80b-a3b-instruct:free',
  'z-ai/glm-4.5-air:free',
  // Paid cheap fallbacks.
  'anthropic/claude-haiku-4',
  'openai/gpt-4o-mini',
]

export type OpenRouterCall = {
  text: string
  model: string
  inputTokens?: number
  outputTokens?: number
  costUsd?: number
}

export async function callOpenRouter(
  apiKey: string,
  input: GenInput,
  modelChain: string[] = DEFAULT_MODEL_CHAIN,
): Promise<OpenRouterCall> {
  const referer = process.env.OPENROUTER_REFERER || 'https://cc-dashboard.vercel.app'
  const title = process.env.OPENROUTER_TITLE || 'Command Center'
  const errors: string[] = []

  const models = input.model ? [input.model, ...modelChain] : modelChain
  for (const model of models) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': referer,
          'X-Title': title,
        },
        body: JSON.stringify({
          model,
          messages: [
            ...(input.system ? [{ role: 'system', content: input.system }] : []),
            { role: 'user', content: input.prompt },
          ],
          temperature: input.temperature ?? 0.3,
          max_tokens: input.maxTokens ?? 2048,
        }),
      })
      if (!res.ok) {
        const body = await res.text().catch(() => '')
        errors.push(`${model}:${res.status}:${body.slice(0, 120)}`)
        // 401/403 → abort the whole provider (bad key), propagate.
        if (res.status === 401 || res.status === 403) {
          throw new Error(`openrouter auth ${res.status}: ${body.slice(0, 120)}`)
        }
        continue
      }
      const data = await res.json() as {
        choices?: { message?: { content?: string } }[]
        usage?: { prompt_tokens?: number; completion_tokens?: number; total_cost?: number }
      }
      const text = data.choices?.[0]?.message?.content
      if (!text) {
        errors.push(`${model}:empty`)
        continue
      }
      return {
        text,
        model,
        inputTokens: data.usage?.prompt_tokens,
        outputTokens: data.usage?.completion_tokens,
        costUsd: data.usage?.total_cost,
      }
    } catch (e: unknown) {
      const msg = (e as Error)?.message || String(e)
      errors.push(`${model}:${msg.slice(0, 100)}`)
      if (/auth/i.test(msg)) throw e
    }
  }
  throw new Error(`openrouter: all models failed · ${errors.join(' | ')}`)
}
