type Bucket = { tokens: number; lastRefill: number }
const buckets = new Map<string, Bucket>()

export type RateLimitResult = {
  allowed: boolean
  remaining: number
  resetInMs: number
}

export function rateLimit(key: string, max: number, windowMs: number): RateLimitResult {
  const now = Date.now()
  const b = buckets.get(key) ?? { tokens: max, lastRefill: now }
  const elapsed = now - b.lastRefill
  if (elapsed >= windowMs) {
    b.tokens = max
    b.lastRefill = now
  }
  if (b.tokens > 0) {
    b.tokens -= 1
    buckets.set(key, b)
    return { allowed: true, remaining: b.tokens, resetInMs: windowMs - elapsed }
  }
  buckets.set(key, b)
  return { allowed: false, remaining: 0, resetInMs: windowMs - elapsed }
}

export function getClientIp(req: Request): string {
  const h = req.headers
  return (
    h.get('x-forwarded-for')?.split(',')[0].trim() ||
    h.get('x-real-ip') ||
    h.get('cf-connecting-ip') ||
    'unknown'
  )
}

/** Equalize response latency to defeat timing-based email enumeration. */
export async function equalize(minMs: number, startedAt: number): Promise<void> {
  const elapsed = Date.now() - startedAt
  const wait = Math.max(0, minMs - elapsed)
  if (wait > 0) await new Promise((r) => setTimeout(r, wait))
}
