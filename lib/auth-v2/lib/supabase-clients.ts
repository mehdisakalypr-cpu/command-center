import { createServerClient as createSbServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import type { AuthV2Config } from '../config'

type CookieAdapter = {
  getAll: () => { name: string; value: string }[]
  setAll: (cookies: { name: string; value: string; options?: any }[]) => void
}

function env(cfg: AuthV2Config) {
  return {
    url: cfg.supabaseEnv?.url ?? process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey: cfg.supabaseEnv?.anonKey ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    serviceRoleKey:
      cfg.supabaseEnv?.serviceRoleKey ?? process.env.SUPABASE_SERVICE_ROLE_KEY!,
  }
}

export function serverClient(cfg: AuthV2Config, cookies: CookieAdapter) {
  const e = env(cfg)
  return createSbServerClient(e.url, e.anonKey, {
    cookies,
    cookieOptions: {
      path: '/',
      sameSite: 'lax',
      secure: true,
      httpOnly: true,
    },
  })
}

export function adminClient(cfg: AuthV2Config) {
  const e = env(cfg)
  return createClient(e.url, e.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
