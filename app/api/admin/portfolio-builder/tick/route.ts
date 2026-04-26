import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * Manual tick — admin button calls this to drain a few queue jobs without
 * waiting for the next cron firing. Re-uses the cron route by injecting the
 * cron secret server-side so the browser never sees it.
 */
export async function POST() {
  const denied = await requireAuth()
  if (denied) return denied

  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json({ ok: false, error: 'CRON_SECRET not configured' }, { status: 500 })
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

  const res = await fetch(`${baseUrl}/api/cron/portfolio-build?max=5`, {
    method: 'GET',
    headers: { 'x-cron-secret': secret },
  })
  const data = await res.json().catch(() => ({}))
  return NextResponse.json(data, { status: res.status })
}
