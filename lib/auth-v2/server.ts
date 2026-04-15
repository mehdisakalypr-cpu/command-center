import { cookies } from 'next/headers'
import type { AuthV2Config } from './config'
import { serverClient, adminClient } from './lib/supabase-clients'

export type Session = {
  userId: string
  email: string | null
  isAdmin: boolean
}

async function cookieAdapter() {
  const jar = await cookies()
  return {
    getAll: () => jar.getAll().map(({ name, value }) => ({ name, value })),
    setAll: (c: { name: string; value: string; options?: any }[]) =>
      c.forEach(({ name, value, options }) => jar.set(name, value, options)),
  }
}

export async function getSession(cfg: AuthV2Config): Promise<Session | null> {
  const sb = serverClient(cfg, await cookieAdapter())
  const { data } = await sb.auth.getUser()
  if (!data?.user) return null
  return {
    userId: data.user.id,
    email: data.user.email ?? null,
    isAdmin: (data.user.app_metadata?.role ?? data.user.user_metadata?.role) === 'admin',
  }
}

export async function requireAuth(cfg: AuthV2Config): Promise<Session> {
  const s = await getSession(cfg)
  if (!s) throw new Response(JSON.stringify({ error: 'unauthenticated' }), { status: 401 })
  return s
}

export async function requireAdmin(cfg: AuthV2Config): Promise<Session> {
  const s = await requireAuth(cfg)
  if (!s.isAdmin) throw new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 })
  return s
}

/**
 * Server-side password change. The DB trigger `auth_v2_on_password_change` will
 * automatically delete all auth.sessions + auth.refresh_tokens for the user,
 * forcing re-login on every device.
 */
export async function changePassword(
  cfg: AuthV2Config,
  newPassword: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const s = await getSession(cfg)
  if (!s) return { ok: false, reason: 'unauthenticated' }
  const sb = serverClient(cfg, await cookieAdapter())
  const { error } = await sb.auth.updateUser({ password: newPassword })
  if (error) return { ok: false, reason: error.message }
  return { ok: true }
}

/** Admin-only: revoke all sessions for an arbitrary user. */
export async function adminRevokeAllSessions(
  cfg: AuthV2Config,
  userId: string,
): Promise<void> {
  const admin = adminClient(cfg)
  await admin.auth.admin.signOut(userId, 'global')
}

export { serverClient, adminClient }
