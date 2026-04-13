import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// GET /api/simulator/list?product=ofa&limit=20
// Returns scenario history for a product + the currently-active target id so
// the UI can flag which row is live.
export async function GET(req: Request) {
  const url = new URL(req.url)
  const product = url.searchParams.get('product')
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '20', 10), 100)

  const q = sb
    .from('business_scenarios')
    .select('id, name, product, objective_type, objective_value, horizon_days, hypotheses_json, results_json, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (product) q.eq('product', product)
  const { data: scenarios, error } = await q
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  const activeByProduct: Record<string, string | null> = {}
  const productFilter = product ? [product] : ['ofa', 'ftg', 'estate', 'shiftdynamics']
  const { data: targets } = await sb
    .from('agent_targets')
    .select('product, target_json')
    .in('product', productFilter)
  for (const t of targets ?? []) {
    activeByProduct[(t as any).product] = (t as any).target_json?.scenarioId ?? null
  }

  return NextResponse.json({
    ok: true,
    scenarios: (scenarios ?? []).map((s: any) => ({
      ...s,
      isActive: activeByProduct[s.product] === s.id,
    })),
    activeByProduct,
  })
}
