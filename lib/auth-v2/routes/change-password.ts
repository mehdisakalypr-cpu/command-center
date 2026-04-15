import type { AuthV2Config } from '../config'
import { mergeConfig } from '../config'
import { serverClient } from '../lib/supabase-clients'
import { rateLimit, getClientIp, equalize } from '../lib/rate-limit'
import { checkPassword } from '../lib/password-policy'
import { verifyCsrf, CSRF_COOKIE, CSRF_HEADER } from '../lib/csrf'
import { cookies } from 'next/headers'

/**
 * POST /api/auth-v2/change-password
 * Body: { currentPassword, newPassword }
 * Requires CSRF token. Verifies current password (re-auth). DB trigger kills
 * all other sessions on success.
 */
export function changePasswordHandler(userCfg: AuthV2Config) {
  const cfg = mergeConfig(userCfg)
  return async function POST(req: Request): Promise<Response> {
    const startedAt = Date.now()
    const ip = getClientIp(req)

    const jar = await cookies()
    const csrfCookie = jar.get(CSRF_COOKIE)?.value
    const csrfHeader = req.headers.get(CSRF_HEADER)
    if (!verifyCsrf(csrfCookie, csrfHeader)) {
      await equalize(500, startedAt)
      return new Response(JSON.stringify({ error: 'csrf' }), { status: 403 })
    }

    let body: { currentPassword?: string; newPassword?: string }
    try {
      body = await req.json()
    } catch {
      return new Response(JSON.stringify({ error: 'invalid_body' }), { status: 400 })
    }
    const currentPassword = body.currentPassword || ''
    const newPassword = body.newPassword || ''
    const pw = checkPassword(newPassword, cfg.minPasswordLength)
    if (!pw.ok) {
      await equalize(500, startedAt)
      return new Response(
        JSON.stringify({ error: 'weak_password', reason: pw.reason }),
        { status: 400 },
      )
    }
    if (currentPassword === newPassword) {
      await equalize(500, startedAt)
      return new Response(JSON.stringify({ error: 'same_password' }), { status: 400 })
    }
    const rl = rateLimit(`change-pw:${ip}`, 5, 60 * 60 * 1000)
    if (!rl.allowed) {
      await equalize(500, startedAt)
      return new Response(JSON.stringify({ error: 'rate_limited' }), { status: 429 })
    }

    const sb = serverClient(cfg, {
      getAll: () => jar.getAll().map(({ name, value }) => ({ name, value })),
      setAll: (c) => c.forEach(({ name, value, options }) => jar.set(name, value, options)),
    })
    const { data: sess } = await sb.auth.getUser()
    if (!sess?.user?.email) {
      await equalize(500, startedAt)
      return new Response(JSON.stringify({ error: 'unauthenticated' }), { status: 401 })
    }
    // Re-auth to verify currentPassword
    const { error: reauthErr } = await sb.auth.signInWithPassword({
      email: sess.user.email,
      password: currentPassword,
    })
    if (reauthErr) {
      await equalize(500, startedAt)
      return new Response(JSON.stringify({ error: 'invalid_current_password' }), { status: 401 })
    }
    const { error } = await sb.auth.updateUser({ password: newPassword })
    await equalize(500, startedAt)
    if (error) {
      return new Response(JSON.stringify({ error: 'update_failed' }), { status: 400 })
    }
    return new Response(JSON.stringify({ ok: true, sessions_invalidated: true }), { status: 200 })
  }
}
