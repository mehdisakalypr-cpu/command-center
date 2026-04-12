/**
 * Command Center auth — Supabase-based (migré le 2026-04-12).
 * Shim qui garde les mêmes signatures que l'ancienne API JWT+TOTP pour
 * éviter de toucher les dizaines de routes qui l'utilisent.
 *
 * createSession / deleteSession : no-op (Supabase gère les cookies via ses propres API).
 * getSession()                  : true si un user Supabase est présent.
 * requireAuth()                 : Response 401 si pas de user.
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

export async function requireAuth(): Promise<Response | null> {
  const ok = await getSession()
  if (!ok) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  return null
}
