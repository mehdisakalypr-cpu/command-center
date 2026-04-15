import type { AuthV2Config } from '../config'
import { mergeConfig } from '../config'
import { serverClient } from '../lib/supabase-clients'
import { rateLimit, getClientIp, equalize } from '../lib/rate-limit'
import { checkPassword } from '../lib/password-policy'
import { cookies } from 'next/headers'

export function registerHandler(userCfg: AuthV2Config) {
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
      return new Response(JSON.stringify({ error: 'invalid_request' }), { status: 400 })
    }
    const pw = checkPassword(password, cfg.minPasswordLength)
    if (!pw.ok) {
      await equalize(500, startedAt)
      return new Response(
        JSON.stringify({ error: 'weak_password', reason: pw.reason }),
        { status: 400 },
      )
    }
    const rl = rateLimit(`register:${ip}`, 5, 60 * 60 * 1000)
    if (!rl.allowed) {
      await equalize(500, startedAt)
      return new Response(JSON.stringify({ error: 'rate_limited' }), { status: 429 })
    }

    const jar = await cookies()
    const sb = serverClient(cfg, {
      getAll: () => jar.getAll().map(({ name, value }) => ({ name, value })),
      setAll: (c) => c.forEach(({ name, value, options }) => jar.set(name, value, options)),
    })
    const { error } = await sb.auth.signUp({ email, password })
    await equalize(500, startedAt)
    if (error) {
      // Anti-enumeration: return generic on "user exists"
      return new Response(JSON.stringify({ ok: true, check_email: true }), { status: 200 })
    }
    return new Response(JSON.stringify({ ok: true, check_email: true }), { status: 200 })
  }
}
