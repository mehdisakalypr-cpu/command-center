/**
 * Gemini client — Google Generative Language REST API.
 *
 * Free tier : 15 RPM × 1.5M tokens/day per key (gemini-2.5-flash).
 * We use the v1beta `generateContent` endpoint, API-key auth via query param.
 */

import type { GenInput } from '../types'

export type GeminiCall = {
  text: string
  inputTokens?: number
  outputTokens?: number
  costUsd?: number
}

export async function callGemini(apiKey: string, input: GenInput): Promise<GeminiCall> {
  const rawModel = input.model?.startsWith('gemini/')
    ? input.model.replace('gemini/', '')
    : (input.model ?? 'gemini-2.5-flash')
  const model = rawModel.startsWith('models/') ? rawModel.slice('models/'.length) : rawModel

  const body = {
    contents: [
      { role: 'user', parts: [{ text: input.prompt }] },
    ],
    ...(input.system ? { systemInstruction: { parts: [{ text: input.system }] } } : {}),
    generationConfig: {
      temperature: input.temperature ?? 0.3,
      maxOutputTokens: input.maxTokens ?? 8000,
    },
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  )
  if (!res.ok) {
    const bodyText = await res.text().catch(() => '')
    throw new Error(`gemini ${res.status}: ${bodyText.slice(0, 200)}`)
  }
  const data = await res.json() as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> }
      finishReason?: string
    }>
    usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number }
  }

  const text = data.candidates?.[0]?.content?.parts?.map(p => p.text ?? '').join('') ?? ''
  if (!text) throw new Error('gemini: empty response')

  const inputTokens = data.usageMetadata?.promptTokenCount
  const outputTokens = data.usageMetadata?.candidatesTokenCount
  // gemini-2.5-flash free tier = $0; paid tier ~$0.075/$0.30 per M tokens.
  const costUsd = (inputTokens ?? 0) * 0.075 / 1_000_000 + (outputTokens ?? 0) * 0.30 / 1_000_000

  return { text, inputTokens, outputTokens, costUsd }
}
