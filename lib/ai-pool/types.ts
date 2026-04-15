/**
 * AI key-pool manager — types
 *
 * Phase 3 of the legal AI scaling strategy: each project (FTG/OFA/CC)
 * rotates through N real keys per provider, tracks quota in Supabase,
 * and cascades providers when one is exhausted.
 */

export type Provider =
  | 'openrouter'
  | 'groq'
  | 'gemini'
  | 'together'
  | 'openai'
  | 'anthropic'
  | 'mistral'
  | 'cohere'

export type ProjectTag = 'ftg' | 'ofa' | 'cc'

export type KeyTier = 'free' | 'paid' | 'trial'

export type KeyEntry = {
  provider: Provider
  /** Label displayed in the dashboard, e.g. "GROQ_API_KEY_2" or "alias@ofaops.xyz" */
  label: string
  /** Actual secret value. */
  value: string
  /** Owner entity label (for multi-entity strategy: which email/LLC owns this key). */
  entityLabel: string
  tier: KeyTier
  /** Estimated monthly quota in requests (0 = unlimited/unknown). */
  quotaMonthly: number
  /** Runtime counters. */
  useCount: number
  failCount: number
  lastUsedAt: number
  lastFailAt: number
  /** Circuit breaker: if > now(), key is skipped. */
  circuitOpenUntil: number
}

export type PoolStats = {
  provider: Provider
  total: number
  active: number
  cooling: number
  uses: number
  fails: number
}

export type RoutingDecision = {
  provider: Provider
  key: KeyEntry
  attempt: number
}

export type CallEvent =
  | 'call_ok'
  | 'call_fail'
  | 'rate_limit'
  | 'quota_exhausted'
  | 'circuit_open'
  | 'circuit_close'

export type CallEventRow = {
  project: ProjectTag
  provider: Provider | string
  key_label: string
  event: CallEvent
  latency_ms?: number
  input_tokens?: number
  output_tokens?: number
  cost_usd?: number
  error_code?: string
}

export type GenInput = {
  prompt: string
  system?: string
  temperature?: number
  maxTokens?: number
  /** Optional model hint, passed through to underlying provider. */
  model?: string
}

export type GenOutput = {
  text: string
  provider: Provider
  keyLabel: string
  inputTokens?: number
  outputTokens?: number
  costUsd?: number
  durationMs: number
}
