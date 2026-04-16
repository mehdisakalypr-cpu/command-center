/**
 * Command Center auth — Supabase-based (migré le 2026-04-12).
 * Shim qui garde les mêmes signatures que l'ancienne API JWT+TOTP pour
 * éviter de toucher les dizaines de routes qui l'utilisent.
 *
 * createSession / deleteSession : no-op (Supabase gère les cookies via ses propres API).
 * getSession()                  : true si un user Supabase est présent.
 * requireAuth()                 : 401 si pas de user, 403 si user non-admin.
 *                                 CC est un cockpit admin-only : toutes les routes
 *                                 gardées par requireAuth doivent être inaccessibles
 *                                 aux users lambda (voir security_items backdoor HIGH).
 * getUser()                     : renvoie le user Supabase (ou null).
 */

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

async function sbServer() {
  const jar = await cookies()
  return createServerClient(URL, ANON, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (c) => { c.forEach(({ name, value, options }) => jar.set(name, value, options)) },
    },
  })
}

export async function getUser() {
  try {
    const sb = await sbServer()
    const { data: { user } } = await sb.auth.getUser()
    return user
  } catch {
    return null
  }
}

export async function getSession(): Promise<boolean> {
  return !!(await getUser())
}

export async function createSession() {
  // no-op: Supabase crée la session via signInWithPassword ou verifyOtp
}

export async function deleteSession() {
  try {
    const sb = await sbServer()
    await sb.auth.signOut()
  } catch { /* ignore */ }
}

/**
 * Strict admin gate for CC API routes.
 *
 * CC is an admin-only cockpit: every route currently protected by requireAuth
 * (dashboard/*, voice, tts, stt, bridge, admin/*) must never be reachable by
 * a regular authenticated Supabase user. Before 2026-04-16 this helper only
 * checked "session present?", which allowed any logged-in user (e.g. an FTG
 * customer sharing the Supabase project) to hit /api/admin/*. Fix: also
 * verify is_admin / is_delegate_admin on profiles, matching the stricter
 * requireAdmin() helper in lib/supabase-server.ts.
 *
 * Returns:
 *   null     → request is allowed to proceed
 *   401 JSON → no authenticated user
 *   403 JSON → authenticated but not an admin
 */
export async function requireAuth(): Promise<Response | null> {
  const sb = await sbServer()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  // Env-pinned owner bypass: allows bootstrap before any profile row exists.
  const adminEmail = process.env.ADMIN_EMAIL
  if (adminEmail && user.email === adminEmail) return null

  const { data: profile } = await sb
    .from('profiles')
    .select('is_admin, is_delegate_admin')
    .eq('id', user.id)
    .single()
  if (profile?.is_admin === true || profile?.is_delegate_admin === true) return null

  return new Response(JSON.stringify({ error: 'Forbidden' }), {
    status: 403,
    headers: { 'Content-Type': 'application/json' },
  })
}
