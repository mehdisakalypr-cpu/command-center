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

/** Default cheap-first order used by the cascade when no explicit order is passed. */
export const DEFAULT_CASCADE_ORDER: Provider[] = [
  'openrouter', // paid catch-all but 1 key → many models → often cheapest
  'groq',       // free tier, very fast
  'gemini',     // free tier
  'together',   // cheap
  'mistral',    // cheap
  'cohere',     // cheap
  'openai',     // expensive
  'anthropic',  // expensive
]
