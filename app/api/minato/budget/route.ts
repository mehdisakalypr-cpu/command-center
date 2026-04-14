/**
 * GET /api/minato/budget
 * Circuit breaker budget 150€/mo (cf feedback_cost_tiers).
 * Somme cost_eur du mois courant depuis potential_raises. Hard stop si ≥ 150€.
 * Renvoie { allowed, remaining_eur, tier_mode } — consommé par supervisor + NEJI cycle.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const HARD_CAP_EUR = Number(process.env.MINATO_BUDGET_CAP_EUR ?? 150)
const SOFT_THRESHOLD = 0.8 // 80% → bascule T0 uniquement

export async function GET() {
  try {
    const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY!)

    const firstOfMonth = new Date()
    firstOfMonth.setUTCDate(1); firstOfMonth.setUTCHours(0, 0, 0, 0)

    const { data, error } = await sb
      .from('potential_raises')
      .select('cost_eur')
      .gte('raised_at', firstOfMonth.toISOString())

    if (error) {
      // Fail-open sur erreur lecture (pas de blocage si DB down) mais on log
      console.warn('[budget] supabase error — fail-open:', error.message)
      return NextResponse.json({
        ok: true, degraded: true,
        cap_eur: HARD_CAP_EUR, spent_eur: 0, remaining_eur: HARD_CAP_EUR,
        allowed: true, tier_mode: 'T1', usage_based: false,
      })
    }

    const spent = (data ?? []).reduce((s, r) => s + Number(r.cost_eur ?? 0), 0)
    const remaining = Math.max(0, HARD_CAP_EUR - spent)
    const pctUsed = HARD_CAP_EUR > 0 ? spent / HARD_CAP_EUR : 0

    const allowed = spent < HARD_CAP_EUR
    const tierMode = !allowed ? 'T0_HARD_STOP' : pctUsed >= SOFT_THRESHOLD ? 'T0' : 'T1'

    return NextResponse.json({
      ok: true,
      ts: new Date().toISOString(),
      cap_eur: HARD_CAP_EUR,
      spent_eur: Math.round(spent * 100) / 100,
      remaining_eur: Math.round(remaining * 100) / 100,
      pct_used: Math.round(pctUsed * 10000) / 100,
      allowed,
      tier_mode: tierMode,
      usage_based: false,
      circuit_breaker: {
        soft_threshold_pct: SOFT_THRESHOLD * 100,
        hard_cap_hit: !allowed,
        action: !allowed
          ? 'HARD STOP — aucune action payante jusqu\'au 1er du mois suivant'
          : pctUsed >= SOFT_THRESHOLD
          ? 'T0 only — bascule gratuit, pas de nouvelle ressource payante'
          : 'T1 autorisé jusqu\'au seuil soft',
      },
    })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}
