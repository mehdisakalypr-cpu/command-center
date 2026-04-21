import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

// POST /api/ftg-campaigns — create a draft campaign row in ftg_campaigns
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as {
    name?: string; channel?: string; segment?: string; provider?: string
    template_subject?: string; template_body?: string
    gap_match_min?: number; budget_eur?: number
    country_iso_filter?: string[]
  }

  if (!body.name || !body.channel || !body.provider || !body.template_subject || !body.template_body) {
    return NextResponse.json({ error: 'missing required fields' }, { status: 400 })
  }

  const db = admin()
  const { data, error } = await db.from('ftg_campaigns').insert({
    name: body.name,
    channel: body.channel,
    segment: body.segment ?? null,
    provider: body.provider,
    template_subject: body.template_subject,
    template_body: body.template_body,
    gap_match_min: body.gap_match_min ?? 50,
    budget_eur: body.budget_eur ?? 0,
    country_iso_filter: body.country_iso_filter?.length ? body.country_iso_filter : null,
    status: 'draft',
  }).select('id').single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ id: data.id, ok: true })
}
