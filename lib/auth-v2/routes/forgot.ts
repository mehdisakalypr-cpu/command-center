import type { AuthV2Config } from '../config'
import { mergeConfig } from '../config'
import { serverClient } from '../lib/supabase-clients'
import { rateLimit, getClientIp, equalize } from '../lib/rate-limit'
import { cookies } from 'next/headers'

export function forgotHandler(userCfg: AuthV2Config) {
  const cfg = mergeConfig(userCfg)
  return async function POST(req: Request): Promise<Response> {
    const startedAt = Date.now()
    const ip = getClientIp(req)
    let body: { email?: string }
    try {
      body = await req.json()
    } catch {
      return new Response(JSON.stringify({ ok: true }), { status: 200 })
    }
    const email = (body.email || '').toLowerCase().trim()
    if (!email) {
      await equalize(500, startedAt)
      return new Response(JSON.stringify({ ok: true }), { status: 200 })
    }
    const rl = rateLimit(`forgot:${email}`, 3, 60 * 60 * 1000)
    const rlIp = rateLimit(`forgot:${ip}`, 10, 60 * 60 * 1000)
    if (!rl.allowed || !rlIp.allowed) {
      await equalize(500, startedAt)
      return new Response(JSON.stringify({ ok: true }), { status: 200 })
    }

    const jar = await cookies()
    const sb = serverClient(cfg, {
      getAll: () => jar.getAll().map(({ name, value }) => ({ name, value })),
      setAll: (c) => c.forEach(({ name, value, options }) => jar.set(name, value, options)),
    })
    // Always 200, regardless of account existence (anti-enumeration)
    await sb.auth.resetPasswordForEmail(email, { redirectTo: cfg.resetEmailRedirectTo })
    await equalize(500, startedAt)
    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  }
}
