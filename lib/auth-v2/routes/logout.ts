import type { AuthV2Config } from '../config'
import { serverClient } from '../lib/supabase-clients'
import { cookies } from 'next/headers'

export function logoutHandler(cfg: AuthV2Config) {
  return async function POST(_req: Request): Promise<Response> {
    const jar = await cookies()
    const sb = serverClient(cfg, {
      getAll: () => jar.getAll().map(({ name, value }) => ({ name, value })),
      setAll: (c) => c.forEach(({ name, value, options }) => jar.set(name, value, options)),
    })
    await sb.auth.signOut()
    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  }
}
