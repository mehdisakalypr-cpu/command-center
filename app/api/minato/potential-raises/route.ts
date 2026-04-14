/**
 * GET  /api/minato/potential-raises?limit=50&layer=C3
 * POST /api/minato/potential-raises  { kind, agent?, delta_*?, cost_eur?, notes? }
 *
 * Ledger Infinite Tsukuyomi — chaque action C2/C3 doit être logguée et mesurable.
 * Règle anti-gaspillage : au moins un delta_* ou mrr_ceiling_estimate_eur doit être renseigné.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const VALID_KINDS = new Set([
  'tam_expand','conv_upstream','pricing_options','data_moat','infra_scale_ready',
  'quality_top1','partnerships','organic_content',
  'scout_amplify','regen_quality','outreach_multi','lp_geo_extra','competitor_watch',
])

function sb() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY!)
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get('limit') ?? 50)))
  const layer = url.searchParams.get('layer')

  const client = sb()
  let q = client.from('potential_raises').select('*').order('raised_at', { ascending: false }).limit(limit)
  if (layer === 'C2' || layer === 'C3') q = q.eq('layer', layer)
  const { data, error } = await q
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  const { data: monthly } = await client.from('potential_raises_monthly_cost').select('*').limit(6)

  return NextResponse.json({
    ok: true,
    ts: new Date().toISOString(),
    rows: data ?? [],
    monthly_cost: monthly ?? [],
  })
}

type Body = {
  layer?: 'C2' | 'C3'
  kind: string
  agent?: string
  trigger_source?: 'overshoot_autonomous' | 'tsukuyomi_potential_raise' | 'manual'
  delta_tam?: number
  delta_conv_bps?: number
  delta_pricing_options?: number
  delta_leads?: number
  delta_sites?: number
  delta_lp?: number
  mrr_ceiling_estimate_eur?: number
  cost_eur?: number
  notes?: string
}

export async function POST(req: NextRequest) {
  let body: Body
  try { body = await req.json() } catch { return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 }) }

  if (!body.kind || !VALID_KINDS.has(body.kind)) {
    return NextResponse.json({ ok: false, error: 'invalid_kind' }, { status: 400 })
  }

  const hasDelta = [
    body.delta_tam, body.delta_conv_bps, body.delta_pricing_options,
    body.delta_leads, body.delta_sites, body.delta_lp, body.mrr_ceiling_estimate_eur,
  ].some(v => typeof v === 'number' && v !== 0)
  if (!hasDelta) {
    return NextResponse.json({ ok: false, error: 'measurable_delta_required' }, { status: 400 })
  }

  const row = {
    layer: body.layer ?? 'C3',
    kind: body.kind,
    agent: body.agent ?? null,
    trigger_source: body.trigger_source ?? 'tsukuyomi_potential_raise',
    delta_tam: body.delta_tam ?? null,
    delta_conv_bps: body.delta_conv_bps ?? null,
    delta_pricing_options: body.delta_pricing_options ?? null,
    delta_leads: body.delta_leads ?? null,
    delta_sites: body.delta_sites ?? null,
    delta_lp: body.delta_lp ?? null,
    mrr_ceiling_estimate_eur: body.mrr_ceiling_estimate_eur ?? null,
    cost_eur: body.cost_eur ?? 0,
    notes: body.notes ?? null,
  }

  const { data, error } = await sb().from('potential_raises').insert(row).select().single()
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, row: data })
}
