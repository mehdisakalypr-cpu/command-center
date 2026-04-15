/**
 * POST /api/simulator/compute
 * Reads the current state (leads + paid clients) from Supabase and returns
 * either a single computeFunnel result or the full 3×3 matrix, plus the
 * suggested agent push delta.
 *
 * Body:
 *   {
 *     product: 'ofa' | 'ftg',
 *     objectiveType: 'mrr' | 'clients',
 *     objectiveValue: number,
 *     horizonDays: number,
 *     scenario?: 'conservative' | 'median' | 'high',
 *     mix?: 'mostly_abo' | 'mostly_achat' | 'mostly_seogeo',
 *     matrix?: boolean,   // when true, also return the 3×3 matrix
 *   }
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  computeFunnel, computeMatrix, suggestAgentPush,
  type Product, type Scenario, type PricingMixId, type ObjectiveType,
} from '@/lib/simulator'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const sb = () => createClient(
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

async function fetchCurrent(product: Product, horizonDays: number) {
  const since = new Date(Date.now() - horizonDays * 86400_000).toISOString()
  const client = sb()
  let leadsCount = 0
  let paidCount = 0
  let currentMrr = 0

  try {
    if (product === 'ofa') {
      const leads = await client
        .from('commerce_leads')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', since)
      leadsCount = leads.count ?? 0

      const paid = await client
        .from('generated_sites')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'claimed')
        .gte('claimed_at', since)
      paidCount = paid.count ?? 0
      // Approx MRR: blended ~12 €/client (between 9.99 maint and 19.99 abo).
      currentMrr = Math.round(paidCount * 12)
    } else {
      const ent = await client
        .from('entrepreneurs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', since)
      leadsCount = ent.count ?? 0

      const paying = await client
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .in('tier', ['data', 'basic', 'standard', 'strategy', 'premium'])
        .gte('updated_at', since)
      paidCount = paying.count ?? 0
      currentMrr = Math.round(paidCount * 49)
    }
  } catch {
    // Swallow — pages where tables are absent still get a usable response.
  }

  return { leadsCount, paidCount, currentMrr }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({} as any))
  const product = (body.product ?? 'ofa') as Product
  const objectiveType = (body.objectiveType ?? 'mrr') as ObjectiveType
  const objectiveValue = Number(body.objectiveValue ?? 0)
  const horizonDays = Math.max(1, Math.min(365, Number(body.horizonDays ?? 30)))
  const scenario = (body.scenario ?? 'median') as Scenario
  const mix = (body.mix ?? 'mostly_abo') as PricingMixId
  const wantMatrix = !!body.matrix

  if (!['ofa', 'ftg'].includes(product)) {
    return NextResponse.json({ ok: false, error: 'invalid product' }, { status: 400 })
  }
  if (!Number.isFinite(objectiveValue) || objectiveValue <= 0) {
    return NextResponse.json({ ok: false, error: 'objectiveValue must be > 0' }, { status: 400 })
  }

  const current = await fetchCurrent(product, horizonDays)

  const result = computeFunnel({
    product, scenario, mix, objectiveType, objectiveValue, horizonDays, current,
  })

  const matrix = wantMatrix
    ? computeMatrix({ product, objectiveType, objectiveValue, horizonDays, current })
    : null

  const pushSuggestion = suggestAgentPush(product, result.leadsPerDay)

  return NextResponse.json({
    ok: true, current, result, matrix, pushSuggestion,
  })
}
