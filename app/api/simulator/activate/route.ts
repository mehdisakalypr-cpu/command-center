import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// POST /api/simulator/activate  { scenarioId }
// Re-activates a previously saved scenario by copying it into agent_targets.
// Use case: rollback to an earlier hypothesis set, or re-push targets after
// agent-side changes.
export async function POST(req: Request) {
  const { scenarioId } = await req.json()
  if (!scenarioId) {
    return NextResponse.json({ ok: false, error: 'scenarioId required' }, { status: 400 })
  }

  const { data: scenario, error } = await sb
    .from('business_scenarios')
    .select('id, product, objective_type, objective_value, horizon_days, hypotheses_json, results_json')
    .eq('id', scenarioId)
    .single()
  if (error || !scenario) {
    return NextResponse.json({ ok: false, error: error?.message ?? 'not found' }, { status: 404 })
  }

  const s: any = scenario
  const { error: upErr } = await sb.from('agent_targets').upsert({
    product: s.product,
    target_json: {
      scenarioId: s.id,
      objectiveType: s.objective_type,
      objectiveValue: s.objective_value,
      horizonDays: s.horizon_days,
      results: s.results_json,
      maxMode: false,
    },
    updated_at: new Date().toISOString(),
  }, { onConflict: 'product' })
  if (upErr) return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 })

  return NextResponse.json({ ok: true, product: s.product, scenarioId: s.id })
}
