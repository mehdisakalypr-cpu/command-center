import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

// POST /api/simulator/vr  { scenarioId }
// V/R = "Vision vs Réalisé" — for a saved scenario, count what actually
// happened in the underlying business tables since the scenario was created.
// Used by ScenarioHistory in /admin/simulator to draw the progress bars
// next to each row.
export async function POST(req: Request) {
  const { scenarioId } = await req.json().catch(() => ({}))
  if (!scenarioId) return NextResponse.json({ ok: false, error: 'scenarioId required' }, { status: 400 })

  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })

  const { data: scenario, error } = await sb
    .from('business_scenarios')
    .select('product, objective_type, objective_value, horizon_days, hypotheses_json, results_json, created_at')
    .eq('id', scenarioId)
    .single()
  if (error || !scenario) return NextResponse.json({ ok: false, error: 'scenario not found' }, { status: 404 })

  const s: any = scenario
  const since = s.created_at as string
  const targetLeads = s.results_json?.leadsNeeded ?? null
  const targetPaid  = s.results_json?.paidNeeded ?? null
  const targetMrr   = s.results_json?.mrr ?? (s.objective_type === 'mrr' ? s.objective_value : null)

  const actual: { leads: number | null; paid: number | null; mrr: number | null } = { leads: null, paid: null, mrr: null }

  try {
    if (s.product === 'ofa') {
      const leads = await sb.from('commerce_leads').select('*', { count: 'exact', head: true }).gte('created_at', since)
      // Proxy "paid" with claimed sites — true paying users come later.
      const sites = await sb.from('generated_sites').select('*', { count: 'exact', head: true }).eq('status', 'claimed').gte('claimed_at', since)
      actual.leads = leads.count ?? 0
      actual.paid = sites.count ?? 0
      const avgMrr = s.hypotheses_json?.avgMrr ?? 14.98
      actual.mrr = (actual.paid ?? 0) * avgMrr
    } else if (s.product === 'ftg') {
      const ent = await sb.from('entrepreneurs').select('*', { count: 'exact', head: true }).gte('created_at', since)
      const paying = await sb.from('profiles').select('*', { count: 'exact', head: true }).in('tier', ['data', 'basic', 'standard', 'strategy', 'premium']).gte('updated_at', since)
      actual.leads = ent.count ?? 0
      actual.paid = paying.count ?? 0
      const avgMrr = s.hypotheses_json?.avgMrr ?? 49
      actual.mrr = (actual.paid ?? 0) * avgMrr
    }
  } catch { /* missing table or perms — leave nulls */ }

  const pct = (a: number | null, t: number | null) =>
    (a == null || t == null || t === 0) ? null : Math.round(100 * a / t)

  const elapsedDays = Math.max(1, Math.round((Date.now() - new Date(since).getTime()) / 86400000))
  const horizon = s.horizon_days ?? 30
  const elapsedPct = Math.min(100, Math.round(100 * elapsedDays / horizon))

  return NextResponse.json({
    ok: true,
    scenarioId,
    since,
    elapsedDays,
    horizonDays: horizon,
    elapsedPct,
    target: { leads: targetLeads, paid: targetPaid, mrr: targetMrr },
    actual,
    pct: { leads: pct(actual.leads, targetLeads), paid: pct(actual.paid, targetPaid), mrr: pct(actual.mrr, targetMrr) },
  })
}
