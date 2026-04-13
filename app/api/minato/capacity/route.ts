/**
 * GET /api/minato/capacity
 * Retourne : counts live + cibles + rythme/semaine + ETA en jours.
 * Supabase anon = lecture commerce_leads + generated_sites.
 */
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Row = {
  label: string
  actual: number
  target: number
  weekly_rate: number   // débit hebdo constaté (ordre de grandeur)
  kaioken_rate: number  // débit si 5 agents en parallèle
}

export async function GET() {
  const t0 = Date.now()
  try {
    const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!)
    const counts = async (table: string, filter?: { column: string; value: string }) => {
      let q = sb.from(table).select('*', { count: 'exact', head: true })
      if (filter) q = q.eq(filter.column, filter.value) as typeof q
      const { count } = await q
      return count ?? 0
    }
    const notNull = async (table: string, column: string) => {
      const { count } = await sb.from(table).select('*', { count: 'exact', head: true }).not(column, 'is', null)
      return count ?? 0
    }

    const [leadsTotal, leadsEmail, leadsPhone, sitesTotal, sitesClaimed] = await Promise.all([
      counts('commerce_leads'),
      notNull('commerce_leads', 'email'),
      notNull('commerce_leads', 'phone'),
      counts('generated_sites'),
      counts('generated_sites', { column: 'status', value: 'claimed' }),
    ])

    // Rythme observé : agents démarrés 2026-04-11, check 2026-04-13 → ~2 jours
    // Leads: 10K en 2 jours = ~5K/jour = 35K/semaine
    // Sites: 4K en 2 jours = ~2K/jour = 14K/semaine
    const rows: Row[] = [
      { label: 'Leads bruts', actual: leadsTotal, target: 400_000, weekly_rate: 35_000, kaioken_rate: 175_000 },
      { label: 'Leads avec email', actual: leadsEmail, target: 80_000, weekly_rate: 0, kaioken_rate: 14_000 }, // 0 actuellement
      { label: 'Leads avec phone', actual: leadsPhone, target: 80_000, weekly_rate: 0, kaioken_rate: 14_000 },
      { label: 'Sites générés', actual: sitesTotal, target: 1_000_000, weekly_rate: 14_000, kaioken_rate: 70_000 },
      { label: 'Sites claimed (vendus)', actual: sitesClaimed, target: 30_000, weekly_rate: 1, kaioken_rate: 100 }, // blocker outreach
    ]

    const enriched = rows.map((r) => {
      const remaining = Math.max(0, r.target - r.actual)
      const eta_days = r.weekly_rate > 0 ? Math.ceil((remaining / r.weekly_rate) * 7) : null
      const eta_days_kaioken = r.kaioken_rate > 0 ? Math.ceil((remaining / r.kaioken_rate) * 7) : null
      const pct = r.target > 0 ? Math.round((r.actual / r.target) * 10000) / 100 : 0
      return { ...r, remaining, eta_days, eta_days_kaioken, pct }
    })

    // Global ETA (pire ligne)
    const etas = enriched.map((r) => r.eta_days).filter((x): x is number => x !== null)
    const global_eta_days = etas.length ? Math.max(...etas) : null
    const etas_k = enriched.map((r) => r.eta_days_kaioken).filter((x): x is number => x !== null)
    const global_eta_kaioken = etas_k.length ? Math.max(...etas_k) : null

    console.log(`[minato/capacity] ok in ${Date.now() - t0}ms · leads=${leadsTotal}`)
    return Response.json({
      ok: true,
      updated_at: new Date().toISOString(),
      rows: enriched,
      global_eta_days,
      global_eta_kaioken,
      note: 'Rythmes observés approximatifs (2 jours d\'agents, 1 scout à la fois). KAIOKEN = 5 agents en parallèle.',
    })
  } catch (e) {
    console.error(`[minato/capacity] error after ${Date.now() - t0}ms:`, e)
    return Response.json({ ok: false, error: String(e) }, { status: 500 })
  }
}
