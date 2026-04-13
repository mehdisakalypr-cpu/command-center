/**
 * GET /api/compute/max-potential?product=ofa&horizon=30&objective=mrr
 * Returns the REAL-TIME maximum potential at instant T, given the current
 * compute power reported by /api/compute/status (processes + bg jobs + MAX).
 *
 * Formula (transparent):
 *   baseline_leads_per_day  = product scout perDay (from PRODUCT_DEFAULTS)
 *   compute_multiplier      = f(processes, active_bg, max_sticky)
 *     · base = 1.0
 *     · + processes_count / 4  (cap ×3)
 *     · + active_bg_count / 3  (cap ×2)
 *     · × (max_enabled ? 1.5 : 1)
 *   leads_capacity = baseline_leads_per_day × compute_multiplier × horizon_days
 *   clients        = leads_capacity × funnel_product
 *   mrr_ceiling    = clients × avg_mrr_per_client
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Product = 'ofa' | 'ftg' | 'estate' | 'shiftdynamics'
type ObjectiveType = 'mrr' | 'clients' | 'revenue'

// Mirrored from app/admin/simulator/page.tsx (kept in sync manually).
const BASELINES: Record<Product, { scoutPerDay: number; funnelConv: number; avgMrr: number; oneTime: number }> = {
  ofa:           { scoutPerDay: 2000, funnelConv: 0.05,  avgMrr: 15,   oneTime: 149 },
  ftg:           { scoutPerDay: 1500, funnelConv: 0.025, avgMrr: 49,   oneTime: 499 },
  estate:        { scoutPerDay: 300,  funnelConv: 0.10,  avgMrr: 200,  oneTime: 0 },
  shiftdynamics: { scoutPerDay: 200,  funnelConv: 0.005, avgMrr: 2500, oneTime: 0 },
}

async function fetchStatus(origin: string): Promise<{ max_enabled: boolean; processes: number; active_bg: number } | null> {
  try {
    const r = await fetch(`${origin}/api/compute/status`, { cache: 'no-store' })
    if (!r.ok) return null
    const d = await r.json()
    return { max_enabled: !!d.max_enabled, processes: d.processes ?? 0, active_bg: d.active_bg ?? 0 }
  } catch { return null }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const product = (url.searchParams.get('product') as Product) ?? 'ofa'
  const objective = (url.searchParams.get('objective') as ObjectiveType) ?? 'mrr'
  const horizonDays = Math.max(1, Math.min(365, Number(url.searchParams.get('horizon') ?? 30)))

  const base = BASELINES[product]
  if (!base) return NextResponse.json({ ok: false, error: 'unknown product' }, { status: 400 })

  const origin = url.origin
  const status = await fetchStatus(origin) ?? { max_enabled: false, processes: 1, active_bg: 0 }

  const procFactor = Math.min(3, 1 + status.processes / 4)
  const bgFactor = Math.min(2, 1 + status.active_bg / 3)
  const stickyBonus = status.max_enabled ? 1.5 : 1
  const multiplier = procFactor * bgFactor * stickyBonus / 2 // (÷2 so we don't double-count base=1)

  // Reserve factor: keep 10% of capacity for chat/analyses/reports/monitoring/security.
  // Configurable via env MRR_RESERVE_FACTOR (default 0.9). Caller can override with ?reserve=1 for raw view.
  const includeReserve = url.searchParams.get('reserve') === '0'
  const reserveFactor = includeReserve ? 1 : Number(process.env.MRR_RESERVE_FACTOR ?? 0.9)

  const rawLeadsPerDay = base.scoutPerDay * multiplier
  const leadsPerDay = Math.round(rawLeadsPerDay * reserveFactor)
  const leadsCapacity = leadsPerDay * horizonDays
  const clients = Math.floor(leadsCapacity * base.funnelConv)
  const mrr = Math.round(clients * base.avgMrr)
  const revenue = base.oneTime > 0 ? Math.round(clients * base.oneTime) : mrr * 12

  const value = objective === 'mrr' ? mrr : objective === 'clients' ? clients : revenue

  return NextResponse.json({
    ok: true,
    ts: new Date().toISOString(),
    input: { product, objective, horizonDays },
    compute: status,
    multiplier: Math.round(multiplier * 100) / 100,
    reserveFactor,
    rawLeadsPerDay: Math.round(rawLeadsPerDay),
    leadsPerDay,
    leadsCapacity,
    clients,
    mrr,
    revenue,
    value,
  })
}
