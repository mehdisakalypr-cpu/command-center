import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isAdmin } from '@/lib/supabase-server'
import {
  type Capability, FUNNEL_RATES, fleetCapacityPerDay,
  estimateEffortGap, revenueFromAdditionalAccounts,
} from '@/lib/cc-fleet'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const sb = () =>
  createClient(
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

/**
 * POST /api/cc-fleet/gap-estimate
 * Body: {
 *   target_output: number          // ex: 500000 leads à scouter
 *   target_date: string ISO        // ex: 2026-09-30
 *   capability: Capability         // 'scout' | 'content' | ...
 *   project?: keyof FUNNEL_RATES   // pour calcul ROI revenue
 * }
 * Réponse: { fleet, gap, revenue } — chiffres pour pilotage.
 */
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return Response.json({ ok: false, error: 'admin only' }, { status: 403 })

  let body: {
    target_output?: number
    target_date?: string
    capability?: Capability
    project?: keyof typeof FUNNEL_RATES
  }
  try { body = await req.json() } catch { return Response.json({ ok: false, error: 'invalid json' }, { status: 400 }) }

  if (!body.target_output || !body.target_date || !body.capability) {
    return Response.json({ ok: false, error: 'target_output, target_date, capability required' }, { status: 400 })
  }

  const { data: workers, error } = await sb()
    .from('cc_workers')
    .select('id, capabilities, state, max_concurrent_tickets')

  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 })

  const currentCapacity = fleetCapacityPerDay(
    (workers ?? []) as never,
    body.capability,
  )

  const gap = estimateEffortGap({
    target_output: body.target_output,
    target_date_iso: body.target_date,
    capability: body.capability,
    current_capacity_per_day: currentCapacity,
  })

  const revenue = body.project && gap.gap_accounts > 0
    ? revenueFromAdditionalAccounts({
        project: body.project,
        additional_accounts: gap.gap_accounts,
        days_of_contribution: gap.days_remaining,
      })
    : null

  return Response.json({
    ok: true,
    fleet: {
      total_workers: (workers ?? []).length,
      active_workers: (workers ?? []).filter(w => w.state === 'active').length,
      current_capacity_per_day: currentCapacity,
    },
    gap,
    revenue,
  })
}
