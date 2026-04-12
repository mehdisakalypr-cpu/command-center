import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  const body = await req.json()
  const { product, objectiveType, objectiveValue, horizonDays, avgMrr, funnel, results } = body

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
      target_json: { scenarioId: scenario.id, objectiveType, objectiveValue, horizonDays, results },
      updated_at: new Date().toISOString(),
    }, { onConflict: 'product' })

  return NextResponse.json({ id: scenario.id })
}
