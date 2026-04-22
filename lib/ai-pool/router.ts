/**
 * Router — picks the next usable key for a provider.
 *
 * Strategy: round-robin, skipping keys whose circuit is open.
 * Cheap-first ordering of providers is enforced at the cascade level,
 * not here.
 */

import { advanceCursor, getCursor, getPool, hasAnyKey } from './registry'
import type { KeyEntry, Provider } from './types'

export function pickKey(provider: Provider): KeyEntry | null {
  if (!hasAnyKey(provider)) return null
  const list = getPool(provider)
  const now = Date.now()
  const start = getCursor(provider)
  for (let i = 0; i < list.length; i++) {
    const idx = (start + i) % list.length
    const k = list[idx]
    if (k.circuitOpenUntil <= now) {
      advanceCursor(provider, idx)
      return k
    }
  }
  return null
}

export function isProviderExhausted(provider: Provider): boolean {
  if (!hasAnyKey(provider)) return true
  const list = getPool(provider)
  const now = Date.now()
  return list.every((k) => k.circuitOpenUntil > now)
}

/** Default cheap-first order used by the cascade when no explicit order is passed.
 *
 * Gemini lead — 13 keys @ 1.5M tokens/day = ~19.5M tokens/day free capacity.
 * Mistral second — 3 keys free tier. Groq third — some keys org-restricted,
 * rotated. OpenRouter still useful for model diversity. OpenAI last (paid).
 */
export const DEFAULT_CASCADE_ORDER: Provider[] = [
  'gemini',     // free tier, 13 keys → highest daily capacity
  'mistral',    // free tier, 3 keys
  'groq',       // free tier, 8 keys, very fast
  'openrouter', // model diversity fallback
  'together',   // cheap
  'cohere',     // cheap
  'anthropic',  // expensive
  'openai',     // paid, last resort
]
