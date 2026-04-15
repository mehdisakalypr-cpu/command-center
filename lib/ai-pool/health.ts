/**
 * Health tracking — circuit breaker + Supabase event log.
 *
 * In-memory counters live on the KeyEntry. We also best-effort persist
 * every call outcome to `ai_key_events` so the admin dashboard can
 * display real 24h/7j stats and the user sees when a key is breached.
 */

import type { CallEventRow, KeyEntry, ProjectTag } from './types'

const DEFAULT_COOLDOWN_MS = 60_000

export function markSuccess(k: KeyEntry) {
  k.useCount++
  k.lastUsedAt = Date.now()
  if (k.circuitOpenUntil > 0 && k.circuitOpenUntil <= Date.now()) {
    k.circuitOpenUntil = 0
  }
}

export function markFailure(k: KeyEntry, cooldownMs = DEFAULT_COOLDOWN_MS) {
  k.failCount++
  k.lastFailAt = Date.now()
  k.circuitOpenUntil = Date.now() + cooldownMs
}

export function isRateLimit(err: unknown): boolean {
  const s = String((err as any)?.message ?? err ?? '').toLowerCase()
  return /429|rate.?limit|quota|exhausted|too many|limit.?exceeded/.test(s)
}

export function isAuthError(err: unknown): boolean {
  const s = String((err as any)?.message ?? err ?? '').toLowerCase()
  return /401|403|unauthorized|invalid.?api.?key|invalid_api_key/.test(s)
}

/**
 * Best-effort async log to Supabase. Never throws.
 * Expects SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in env.
 */
export async function logEvent(project: ProjectTag, row: Omit<CallEventRow, 'project'>) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) return
    // Dynamic import so this file stays safe to import from edge bundles.
    const { createClient } = await import('@supabase/supabase-js')
    const sb = createClient(url, key, { auth: { persistSession: false } })
    await sb.from('ai_key_events').insert({ project, ...row })
  } catch {
    /* best-effort, never throw */
  }
}
