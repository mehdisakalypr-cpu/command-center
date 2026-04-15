import type { AuthV2Config } from '../config'
import { mergeConfig } from '../config'
import { serverClient } from '../lib/supabase-clients'
import { rateLimit, getClientIp, equalize } from '../lib/rate-limit'
import { checkPassword } from '../lib/password-policy'
import { cookies } from 'next/headers'

/**
 * POST /api/auth-v2/reset
 * Body: { password }
 * Requires a live recovery session (user clicked email link, Supabase set session cookie).
 * The DB trigger invalidates all OTHER sessions when password changes.
 */
export function resetHandler(userCfg: AuthV2Config) {
  const cfg = mergeConfig(userCfg)
  return async function POST(req: Request): Promise<Response> {
    const startedAt = Date.now()
    const ip = getClientIp(req)
    let body: { password?: string }
    try {
      body = await req.json()
    } catch {
      return new Response(JSON.stringify({ error: 'invalid_body' }), { status: 400 })
    }
    const password = body.password || ''
    const pw = checkPassword(password, cfg.minPasswordLength)
    if (!pw.ok) {
      await equalize(500, startedAt)
      return new Response(
        JSON.stringify({ error: 'weak_password', reason: pw.reason }),
        { status: 400 },
      )
    }
    const rl = rateLimit(`reset:${ip}`, 5, 15 * 60 * 1000)
    if (!rl.allowed) {
      await equalize(500, startedAt)
      return new Response(JSON.stringify({ error: 'rate_limited' }), { status: 429 })
    }

    const jar = await cookies()
    const sb = serverClient(cfg, {
      getAll: () => jar.getAll().map(({ name, value }) => ({ name, value })),
      setAll: (c) => c.forEach(({ name, value, options }) => jar.set(name, value, options)),
    })
    const { data: sess } = await sb.auth.getUser()
    if (!sess?.user) {
      await equalize(500, startedAt)
      return new Response(JSON.stringify({ error: 'no_recovery_session' }), { status: 401 })
    }
    const { error } = await sb.auth.updateUser({ password })
    await equalize(500, startedAt)
    if (error) {
      return new Response(JSON.stringify({ error: 'reset_failed' }), { status: 400 })
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  }
}
