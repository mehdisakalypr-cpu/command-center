import { NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

const SITE_SLUG = 'cc'

// Allowlist: emails auto-granted on first authenticated check (bootstrap owner account).
const AUTO_GRANT = new Set(
  (process.env.CC_OWNER_EMAILS ?? 'mehdi.sakalypr@gmail.com')
    .split(',').map(s => s.trim().toLowerCase()).filter(Boolean),
)

export async function GET(req: Request) {
  // Prefer cookie-based session; fallback to Bearer token for race-safe calls from login page.
  let user = await getUser()
  if (!user) {
    const auth = req.headers.get('authorization') || ''
    const m = auth.match(/^Bearer\s+(.+)$/i)
    if (m) {
      const admin = supabaseAdmin()
      const { data } = await admin.auth.getUser(m[1])
      if (data?.user) user = data.user
    }
  }
  if (!user) return NextResponse.json({ allowed: false, reason: 'not_authenticated' }, { status: 401 })

  const admin = supabaseAdmin()
  const { data } = await admin
    .from('site_access')
    .select('id')
    .eq('user_id', user.id)
    .eq('site_slug', SITE_SLUG)
    .maybeSingle()

  if (!data) {
    const email = (user.email ?? '').toLowerCase()
    if (AUTO_GRANT.has(email)) {
      await admin.from('site_access').insert({ user_id: user.id, site_slug: SITE_SLUG })
      return NextResponse.json({ allowed: true, bootstrapped: true })
    }
    return NextResponse.json({ allowed: false, reason: 'no_access' }, { status: 403 })
  }
  return NextResponse.json({ allowed: true })
}
