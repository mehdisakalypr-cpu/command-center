/**
 * Key registry — loads API keys from env, indexed by provider.
 *
 * Convention (per provider):
 *   PROVIDER_API_KEY        → key #1 (legacy / single-entity)
 *   PROVIDER_API_KEY_2..10  → additional keys (multi-entity scaling)
 *
 * Optional metadata (same suffix):
 *   PROVIDER_API_KEY_{N}_ENTITY  → entity label (e.g. "ofaops", "alias1@…")
 *   PROVIDER_API_KEY_{N}_TIER    → free | paid | trial
 *   PROVIDER_API_KEY_{N}_QUOTA   → monthly request quota estimate
 */

import type { KeyEntry, KeyTier, PoolStats, Provider } from './types'

const ENV_PREFIX: Record<Provider, string[]> = {
  openrouter: ['OPENROUTER_API_KEY'],
  groq: ['GROQ_API_KEY'],
  gemini: ['GEMINI_API_KEY', 'GOOGLE_API_KEY', 'GOOGLE_GENERATIVE_AI_API_KEY'],
  together: ['TOGETHER_API_KEY'],
  openai: ['OPENAI_API_KEY'],
  anthropic: ['ANTHROPIC_API_KEY'],
  mistral: ['MISTRAL_API_KEY'],
  cohere: ['COHERE_API_KEY'],
}

const PROVIDERS: Provider[] = [
  'openrouter', 'groq', 'gemini', 'together', 'openai', 'anthropic', 'mistral', 'cohere',
]

const pool: Record<Provider, KeyEntry[]> = {
  openrouter: [], groq: [], gemini: [], together: [], openai: [], anthropic: [], mistral: [], cohere: [],
}
const cursor: Record<Provider, number> = {
  openrouter: 0, groq: 0, gemini: 0, together: 0, openai: 0, anthropic: 0, mistral: 0, cohere: 0,
}
let initialized = false

function readMeta(prefix: string, suffix: string): { entity: string; tier: KeyTier; quota: number } {
  const entity = process.env[`${prefix}${suffix}_ENTITY`] || 'default'
  const tierRaw = (process.env[`${prefix}${suffix}_TIER`] || 'free').toLowerCase()
  const tier: KeyTier = tierRaw === 'paid' ? 'paid' : tierRaw === 'trial' ? 'trial' : 'free'
  const quota = Number(process.env[`${prefix}${suffix}_QUOTA`] || '0') || 0
  return { entity, tier, quota }
}

function readKeys(provider: Provider, maxN = 10): KeyEntry[] {
  const out: KeyEntry[] = []
  const prefixes = ENV_PREFIX[provider]
  for (const prefix of prefixes) {
    const base = process.env[prefix]
    if (base) {
      const meta = readMeta(prefix, '')
      out.push({
        provider,
        label: `${prefix}`,
        value: base,
        entityLabel: meta.entity,
        tier: meta.tier,
        quotaMonthly: meta.quota,
        useCount: 0, failCount: 0, lastUsedAt: 0, lastFailAt: 0, circuitOpenUntil: 0,
      })
    }
    for (let i = 2; i <= maxN; i++) {
      const v = process.env[`${prefix}_${i}`]
      if (!v) continue
      const meta = readMeta(prefix, `_${i}`)
      out.push({
        provider,
        label: `${prefix}_${i}`,
        value: v,
        entityLabel: meta.entity,
        tier: meta.tier,
        quotaMonthly: meta.quota,
        useCount: 0, failCount: 0, lastUsedAt: 0, lastFailAt: 0, circuitOpenUntil: 0,
      })
    }
  }
  return out
}

function init() {
  if (initialized) return
  initialized = true
  for (const p of PROVIDERS) {
    pool[p] = readKeys(p)
  }
}

export function getPool(provider: Provider): KeyEntry[] {
  init()
  return pool[provider]
}

export function listProviders(): Provider[] {
  return PROVIDERS.slice()
}

export function advanceCursor(provider: Provider, idx: number) {
  init()
  cursor[provider] = (idx + 1) % Math.max(1, pool[provider].length)
}

export function getCursor(provider: Provider): number {
  init()
  return cursor[provider]
}

export function stats(): PoolStats[] {
  init()
  const now = Date.now()
  return PROVIDERS.map((p) => {
    const list = pool[p]
    return {
      provider: p,
      total: list.length,
      active: list.filter((k) => k.circuitOpenUntil <= now).length,
      cooling: list.filter((k) => k.circuitOpenUntil > now).length,
      uses: list.reduce((a, k) => a + k.useCount, 0),
      fails: list.reduce((a, k) => a + k.failCount, 0),
    }
  })
}

export function hasAnyKey(provider: Provider): boolean {
  init()
  return pool[provider].length > 0
}
