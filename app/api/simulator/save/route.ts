import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/simulator/save?product=ofa — returns the active (last-validated)
// target for this product so the UI can restore state on page refresh.
export async function GET(req: Request) {
  const url = new URL(req.url)
  const product = url.searchParams.get('product')
  if (!product) return NextResponse.json({ ok: false, error: 'product required' }, { status: 400 })

  const { data: target } = await sb
    .from('agent_targets')
    .select('target_json, updated_at')
    .eq('product', product)
    .single()

  if (!target) return NextResponse.json({ ok: true, active: null })

  const t: any = target.target_json
  let hypotheses: any = null
  if (t?.scenarioId) {
    const { data: scen } = await sb
      .from('business_scenarios')
      .select('hypotheses_json, was_max')
      .eq('id', t.scenarioId)
      .single()
    hypotheses = (scen as any)?.hypotheses_json ?? null
  }

  return NextResponse.json({
    ok: true,
    active: {
      objectiveType: t.objectiveType,
      objectiveValue: t.objectiveValue,
      horizonDays: t.horizonDays,
      avgMrr: hypotheses?.avgMrr ?? null,
      funnel: hypotheses?.funnel ?? null,
      maxMode: !!t.maxMode,
      updated_at: target.updated_at,
    },
  })
}

export async function POST(req: Request) {
  const body = await req.json()
  const { product, objectiveType, objectiveValue, horizonDays, avgMrr, funnel, results, maxMode } = body

  if (!product || !objectiveType || !objectiveValue) {
    return NextResponse.json({ error: 'Champs manquants' }, { status: 400 })
  }

  // Persiste le scénario
  const { data: scenario, error } = await sb
    .from('business_scenarios')
    .insert({
      product,
      objective_type: objectiveType,
      objective_value: objectiveValue,
      horizon_days: horizonDays,
      hypotheses_json: { avgMrr, funnel },
      results_json: results,
    })
    .select('id')
    .single()

  if (error) {
    // Table pas encore créée ou autre erreur — on retourne quand même l'acquittement pour ne pas bloquer l'UX
    return NextResponse.json({ id: 'local-' + Date.now(), warning: error.message })
  }

  // Upsert la cible active pour ce produit → les agents la liront
  await sb
    .from('agent_targets')
    .upsert({
      product,
      target_json: { scenarioId: scenario.id, objectiveType, objectiveValue, horizonDays, results, maxMode: !!maxMode },
      updated_at: new Date().toISOString(),
    }, { onConflict: 'product' })

  return NextResponse.json({ id: scenario.id })
}
