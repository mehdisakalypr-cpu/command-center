/**
 * Mistral client — OpenAI-compatible chat completions endpoint.
 *
 * Free tier (La Plateforme): 1 req/s, 500k tokens/mo per key.
 * Default model = `mistral-small-latest` (128k context, free tier eligible).
 */

import type { GenInput } from '../types'

export type MistralCall = {
  text: string
  inputTokens?: number
  outputTokens?: number
  costUsd?: number
}

export async function callMistral(apiKey: string, input: GenInput): Promise<MistralCall> {
  const model = input.model?.startsWith('mistral/')
    ? input.model.replace('mistral/', '')
    : (input.model ?? 'mistral-small-latest')

  const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
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
    throw new Error(`mistral ${res.status}: ${body.slice(0, 200)}`)
  }
  const data = await res.json() as {
    choices?: { message?: { content?: string } }[]
    usage?: { prompt_tokens?: number; completion_tokens?: number }
  }
  const text = data.choices?.[0]?.message?.content
  if (!text) throw new Error('mistral: empty response')
  const inputTokens = data.usage?.prompt_tokens
  const outputTokens = data.usage?.completion_tokens
  // mistral-small-latest: $0.2/$0.6 per M tokens (free tier = $0 within quota).
  const costUsd = (inputTokens ?? 0) * 0.2 / 1_000_000 + (outputTokens ?? 0) * 0.6 / 1_000_000
  return { text, inputTokens, outputTokens, costUsd }
}
