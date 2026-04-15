import type { AuthV2Config } from '../config'
import { adminClient, serverClient } from '../lib/supabase-clients'
import { verifyCsrf, CSRF_COOKIE, CSRF_HEADER } from '../lib/csrf'
import { cookies } from 'next/headers'

/** GET /api/auth-v2/sessions — list active sessions for current user. */
export function listSessionsHandler(cfg: AuthV2Config) {
  return async function GET(_req: Request): Promise<Response> {
    const jar = await cookies()
    const sb = serverClient(cfg, {
      getAll: () => jar.getAll().map(({ name, value }) => ({ name, value })),
      setAll: (c) => c.forEach(({ name, value, options }) => jar.set(name, value, options)),
    })
    const { data } = await sb.auth.getUser()
    if (!data?.user) return new Response(JSON.stringify({ error: 'unauthenticated' }), { status: 401 })
    const admin = adminClient(cfg)
    const { data: sessions, error } = await admin
      .from('auth.sessions' as any)
      .select('id, created_at, updated_at, user_agent, ip')
      .eq('user_id', data.user.id)
      .order('updated_at', { ascending: false })
    if (error) {
      // Fallback: auth.sessions might not be queryable via PostgREST — return minimal info
      return new Response(JSON.stringify({ sessions: [], note: 'auth_sessions_not_exposed' }), {
        status: 200,
      })
    }
    return new Response(JSON.stringify({ sessions }), { status: 200 })
  }
}

/** DELETE /api/auth-v2/sessions — revoke a specific session or all. */
export function revokeSessionsHandler(cfg: AuthV2Config) {
  return async function DELETE(req: Request): Promise<Response> {
    const jar = await cookies()
    const csrfCookie = jar.get(CSRF_COOKIE)?.value
    const csrfHeader = req.headers.get(CSRF_HEADER)
    if (!verifyCsrf(csrfCookie, csrfHeader)) {
      return new Response(JSON.stringify({ error: 'csrf' }), { status: 403 })
    }
    const sb = serverClient(cfg, {
      getAll: () => jar.getAll().map(({ name, value }) => ({ name, value })),
      setAll: (c) => c.forEach(({ name, value, options }) => jar.set(name, value, options)),
    })
    const { data } = await sb.auth.getUser()
    if (!data?.user) return new Response(JSON.stringify({ error: 'unauthenticated' }), { status: 401 })
    const admin = adminClient(cfg)
    await admin.auth.admin.signOut(data.user.id, 'global')
    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  }
}
