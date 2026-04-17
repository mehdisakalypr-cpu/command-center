import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/supabase-server'
import { alert, type AlertLevel } from '@/lib/alerts/dispatch'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/test-alert — force a test alert through the CC pipeline.
 * Useful from /admin/alerts-log UI to verify Telegram bot + Resend end-to-end.
 */
export async function POST(req: Request) {
  const denied = await requireAdmin()
  if (denied) return denied
  const body = await req.json().catch(() => ({}))
  const level = ((body.level as AlertLevel) ?? 'LOW') as AlertLevel
  const res = await alert(
    body.code ?? 'test_alert',
    level,
    { triggered_by: 'cc_admin_test', at: new Date().toISOString() },
    { message: body.message ?? 'CC admin test alert (should reach Telegram)', force: true, source: 'cc' },
  )
  return NextResponse.json(res)
}
