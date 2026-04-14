/**
 * GET /api/admin/infra/monitor
 * Renvoie la vue v_infrastructure_utilization enrichie + seuils (warn/critical/lockout)
 * + liste des alertes actives non résolues. Consommé par l'admin page et le cron.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type UtilRow = { provider: string; scope: string; metric: string; value: number; limit_value: number | null; pct_used: number | null; current_tier: string; current_cost_eur: number; sampled_at: string }
type ThresholdRow = { provider: string; metric: string; warn_pct: number; critical_pct: number; lockout_pct: number; auto_scale: boolean; max_auto_cost_delta_eur: number }
type AlertRow = { id: number; triggered_at: string; provider: string; scope: string; metric: string; value: number; limit_value: number; pct_used: number; severity: string; action_taken: string | null; resolved_at: string | null }

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

export async function GET() {
  try {
    const sb = db()
    const [{ data: util }, { data: thresholds }, { data: alerts }, { data: subs }] = await Promise.all([
      sb.from('v_infrastructure_utilization').select('*'),
      sb.from('infrastructure_thresholds').select('*'),
      sb.from('infrastructure_alerts').select('*').is('resolved_at', null).order('triggered_at', { ascending: false }).limit(50),
      sb.from('infrastructure_subscriptions').select('provider, scope, cost_eur_month').is('ended_at', null),
    ])

    const utilization = ((util ?? []) as UtilRow[]).map(r => {
      const th = ((thresholds ?? []) as ThresholdRow[]).find(t => t.provider === r.provider && t.metric === r.metric)
      const pct = r.pct_used ?? 0
      let severity: 'ok' | 'warn' | 'critical' | 'lockout' = 'ok'
      if (th) {
        if (pct >= th.lockout_pct) severity = 'lockout'
        else if (pct >= th.critical_pct) severity = 'critical'
        else if (pct >= th.warn_pct) severity = 'warn'
      }
      return { ...r, severity, thresholds: th ?? null }
    })

    const totalMonthlyCost = ((subs ?? []) as { cost_eur_month: number }[]).reduce((s, r) => s + Number(r.cost_eur_month ?? 0), 0)

    return NextResponse.json({
      ok: true,
      ts: new Date().toISOString(),
      utilization,
      alerts_open: (alerts ?? []) as AlertRow[],
      subscriptions_total_cost_eur: Math.round(totalMonthlyCost * 100) / 100,
    })
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 })
  }
}
