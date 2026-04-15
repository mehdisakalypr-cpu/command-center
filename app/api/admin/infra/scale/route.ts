/**
 * POST /api/admin/infra/scale
 * Body: { provider, scope, target_tier_name, reason }
 * Bumps the current subscription to target_tier and:
 *   - closes the previous subscription row (ended_at)
 *   - opens a new one
 *   - inserts a potential_raises row with the monthly cost delta (agent=GIANT_PICCOLO, kind=infra_scale_ready)
 *   - links the triggering alert (if id passed) via resolved_by
 * Auto-approval logic: if called from the cron with header X-Ofa-Auto=1, enforce
 * the threshold's max_auto_cost_delta_eur guardrail.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Body = { provider: string; scope: string; target_tier_name: string; reason: string; alert_id?: number }

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

export async function POST(req: NextRequest) {
  // Accept either admin session OR an internal server-to-server secret (used by ingest auto-scale).
  const internalSecret = process.env.INTERNAL_API_SECRET
  const headerSecret = req.headers.get('x-internal-auth')
  const internalAuthed = !!(internalSecret && headerSecret && headerSecret === internalSecret)
  if (!internalAuthed) {
    const gate = await requireAdmin(); if (gate) return gate
  }
  let body: Body
  try { body = await req.json() } catch { return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 }) }
  if (!body.provider || !body.scope || !body.target_tier_name || !body.reason) {
    return NextResponse.json({ ok: false, error: 'missing_fields' }, { status: 400 })
  }

  const sb = db()
  const isAutoCall = req.headers.get('x-ofa-auto') === '1'

  // Find target tier
  const { data: targetTier, error: tierErr } = await sb
    .from('infrastructure_tiers')
    .select('*')
    .eq('provider', body.provider)
    .eq('tier_name', body.target_tier_name)
    .maybeSingle()
  if (tierErr || !targetTier) return NextResponse.json({ ok: false, error: 'target_tier_not_found' }, { status: 404 })

  // Find current subscription
  const { data: currentSub } = await sb
    .from('infrastructure_subscriptions')
    .select('*, infrastructure_tiers(*)')
    .eq('provider', body.provider)
    .eq('scope', body.scope)
    .is('ended_at', null)
    .maybeSingle()
  const currentCost = Number(currentSub?.cost_eur_month ?? 0)
  const targetCost = Number(targetTier.monthly_cost_eur ?? 0)
  const delta = targetCost - currentCost

  // Guardrail on auto path
  if (isAutoCall) {
    const { data: th } = await sb
      .from('infrastructure_thresholds')
      .select('auto_scale, max_auto_cost_delta_eur')
      .eq('provider', body.provider)
      .limit(1)
      .maybeSingle()
    const allowed = th?.auto_scale ?? false
    const maxDelta = Number(th?.max_auto_cost_delta_eur ?? 0)
    if (!allowed) return NextResponse.json({ ok: false, error: 'auto_scale_not_allowed_for_provider', needs_human: true }, { status: 403 })
    if (delta > maxDelta) return NextResponse.json({ ok: false, error: 'cost_delta_exceeds_auto_cap', delta_eur: delta, cap_eur: maxDelta, needs_human: true }, { status: 403 })
  }

  // Close previous sub + open new one + create potential_raises row, best-effort
  if (currentSub?.id) {
    await sb.from('infrastructure_subscriptions').update({ ended_at: new Date().toISOString() }).eq('id', currentSub.id)
  }
  const { data: newSub, error: insErr } = await sb
    .from('infrastructure_subscriptions')
    .insert({
      provider: body.provider, scope: body.scope,
      current_tier_id: targetTier.id, cost_eur_month: targetCost,
      notes: body.reason,
    })
    .select().single()
  if (insErr) return NextResponse.json({ ok: false, error: 'subscription_insert_failed', detail: insErr.message }, { status: 500 })

  // Log a potential_raises row (cost propagation) — agent GIANT_PICCOLO, kind infra_scale_ready
  let potentialRaiseId: number | null = null
  if (delta > 0) {
    const { data: pr } = await sb
      .from('potential_raises')
      .insert({
        layer: 'C2', kind: 'infra_scale_ready',
        agent: 'GIANT_PICCOLO',
        trigger_source: isAutoCall ? 'overshoot_autonomous' : 'manual',
        delta_tam: null, delta_conv_bps: null,
        cost_eur: delta,
        notes: `Scale ${body.provider}:${body.scope} → ${body.target_tier_name}. Reason: ${body.reason}`,
      }).select().single()
    potentialRaiseId = pr?.id ?? null
  }

  // Mark alert resolved if provided
  if (body.alert_id) {
    await sb.from('infrastructure_alerts').update({
      resolved_at: new Date().toISOString(),
      resolved_by: isAutoCall ? 'auto' : 'human',
      action_taken: 'auto_scaled',
      tier_after_id: targetTier.id,
      potential_raise_id: potentialRaiseId,
    }).eq('id', body.alert_id)
  }

  return NextResponse.json({
    ok: true,
    scaled: { provider: body.provider, scope: body.scope, from_cost_eur: currentCost, to_cost_eur: targetCost, delta_eur: delta },
    subscription_id: newSub.id,
    potential_raise_id: potentialRaiseId,
  })
}
