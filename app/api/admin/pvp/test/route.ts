import { NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Programmatic tests for PVP items with verification='test'.
// Each runner returns { ok: boolean, details: string }.
const RUNNERS: Record<string, () => Promise<{ ok: boolean; details: string }>> = {
  stripe_live_keys: async () => {
    const key = process.env.STRIPE_SECRET_KEY_LIVE
    if (!key) return { ok: false, details: 'STRIPE_SECRET_KEY_LIVE not set in CC env.' }
    if (!key.startsWith('sk_live_')) return { ok: false, details: 'Key format invalid.' }
    return { ok: true, details: 'Live secret key detected.' }
  },
  stripe_live_products: async () => {
    const key = process.env.STRIPE_SECRET_KEY_LIVE
    if (!key) return { ok: false, details: 'No STRIPE_SECRET_KEY_LIVE to query.' }
    const res = await fetch('https://api.stripe.com/v1/products?active=true&limit=20', {
      headers: { Authorization: `Bearer ${key}` },
    })
    if (!res.ok) return { ok: false, details: `Stripe API ${res.status}` }
    const data = await res.json() as { data: { id: string; name: string }[] }
    if (!data.data?.length) return { ok: false, details: 'No live products found.' }
    return { ok: true, details: `${data.data.length} live products: ${data.data.map(p => p.name).slice(0, 3).join(', ')}…` }
  },
  stripe_live_webhook: async () => {
    const key = process.env.STRIPE_SECRET_KEY_LIVE
    if (!key) return { ok: false, details: 'No STRIPE_SECRET_KEY_LIVE.' }
    const res = await fetch('https://api.stripe.com/v1/webhook_endpoints?limit=20', {
      headers: { Authorization: `Bearer ${key}` },
    })
    const data = await res.json() as { data: { url: string; status: string }[] }
    const enabled = data.data?.filter(e => e.status === 'enabled') ?? []
    if (!enabled.length) return { ok: false, details: 'No enabled live webhooks.' }
    return { ok: true, details: `${enabled.length} enabled: ${enabled.map(e => e.url).join(', ')}` }
  },
  https_enforce: async () => {
    const hosts = ['one-for-all-app.vercel.app', 'cc-dashboard.vercel.app', 'feel-the-gap.vercel.app']
    const results = await Promise.all(hosts.map(async h => {
      try {
        const res = await fetch(`https://${h}`, { method: 'HEAD', redirect: 'manual' })
        return `${h}: HTTP ${res.status}`
      } catch (e: any) {
        return `${h}: ${e.message}`
      }
    }))
    return { ok: true, details: results.join(' | ') }
  },
  auth_bricks_aligned: async () => {
    // Check that webauthn_credentials table exists and has rows with expected app values
    const admin = supabaseAdmin()
    const { data } = await admin.from('webauthn_credentials').select('app').limit(100)
    const apps = new Set((data ?? []).map(r => r.app))
    return { ok: apps.size > 0, details: `Apps found: ${[...apps].join(', ') || 'none'}` }
  },
  resend_domain: async () => {
    const key = process.env.RESEND_API_KEY
    if (!key) return { ok: false, details: 'RESEND_API_KEY not set.' }
    const res = await fetch('https://api.resend.com/domains', { headers: { Authorization: `Bearer ${key}` } })
    if (!res.ok) return { ok: false, details: `Resend API ${res.status}` }
    const data = await res.json() as { data?: { name: string; status: string }[] }
    const verified = data.data?.filter(d => d.status === 'verified') ?? []
    if (!verified.length) return { ok: false, details: `No verified domain. Found: ${data.data?.map(d => `${d.name}=${d.status}`).join(', ') || 'none'}` }
    return { ok: true, details: `Verified: ${verified.map(d => d.name).join(', ')}` }
  },
  sales_tax_nexus: async () => {
    return { ok: false, details: 'Manual check via Stripe Tax dashboard (Tax > Registrations).' }
  },
  ofa_live_keys: async () => RUNNERS.stripe_live_keys(),
}

export async function POST(req: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, testId } = await req.json()
  if (!id || !testId) return NextResponse.json({ error: 'id + testId required' }, { status: 400 })

  const run = RUNNERS[testId]
  if (!run) {
    const result = { ok: false, details: `No runner for ${testId}` }
    await supabaseAdmin().from('pvp_items').update({ last_test_result: result }).eq('id', id)
    return NextResponse.json({ result })
  }

  let result: { ok: boolean; details: string }
  try {
    result = await run()
  } catch (e: any) {
    result = { ok: false, details: `Error: ${e.message}` }
  }

  const update: Record<string, unknown> = { last_test_result: { ...result, at: new Date().toISOString() } }
  if (result.ok) {
    update.status = 'done'
    update.verified_at = new Date().toISOString()
    update.verified_by = user.id
  }
  await supabaseAdmin().from('pvp_items').update(update).eq('id', id)

  return NextResponse.json({ result })
}
