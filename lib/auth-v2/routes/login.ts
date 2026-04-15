import type { AuthV2Config } from '../config'
import { mergeConfig } from '../config'
import { serverClient } from '../lib/supabase-clients'
import { rateLimit, getClientIp, equalize } from '../lib/rate-limit'
import { cookies } from 'next/headers'

/**
 * POST /api/auth-v2/login
 * Body: { email, password }
 * Anti-enumeration: same 401 response + ≥500ms latency regardless of existence.
 */
export function loginHandler(userCfg: AuthV2Config) {
  const cfg = mergeConfig(userCfg)
  return async function POST(req: Request): Promise<Response> {
    const startedAt = Date.now()
    const ip = getClientIp(req)
    let body: { email?: string; password?: string }
    try {
      body = await req.json()
    } catch {
      return new Response(JSON.stringify({ error: 'invalid_body' }), { status: 400 })
    }
    const email = (body.email || '').toLowerCase().trim()
    const password = body.password || ''
    if (!email || !password) {
      await equalize(500, startedAt)
      return new Response(JSON.stringify({ error: 'invalid_credentials' }), { status: 401 })
    }

    const key = `login:${ip}:${email}`
    const rl = rateLimit(key, cfg.rateLimit.max, cfg.rateLimit.windowMs)
    if (!rl.allowed) {
      await equalize(500, startedAt)
      return new Response(
        JSON.stringify({ error: 'rate_limited', retryInMs: rl.resetInMs }),
        { status: 429 },
      )
    }

    const jar = await cookies()
    const sb = serverClient(cfg, {
      getAll: () => jar.getAll().map(({ name, value }) => ({ name, value })),
      setAll: (c) => c.forEach(({ name, value, options }) => jar.set(name, value, options)),
    })
    const { error } = await sb.auth.signInWithPassword({ email, password })
    await equalize(500, startedAt)
    if (error) {
      return new Response(JSON.stringify({ error: 'invalid_credentials' }), { status: 401 })
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  }
}
