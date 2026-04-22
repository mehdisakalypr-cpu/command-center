import { NextResponse } from 'next/server'
import { createSupabaseAdmin, requireAdmin } from '@/lib/supabase-server'
import { buildKiSenseSummary } from '@/lib/ki-sense/summary'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/ki-sense/summary
 * Admin-gated JSON snapshot of flywheel health.
 * Consumed by /admin/ki-sense and (later) daily email digest.
 */
export async function GET() {
  const gate = await requireAdmin()
  if (gate) return gate
  try {
    const sb = createSupabaseAdmin()
    const summary = await buildKiSenseSummary(sb)
    return NextResponse.json(summary)
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: String(e).slice(0, 500) },
      { status: 500 },
    )
  }
}
