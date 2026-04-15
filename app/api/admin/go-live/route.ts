/**
 * GET  /api/admin/go-live — list milestones with computed "ready to start race" flag
 * POST /api/admin/go-live — { id, status, notes? } update one milestone status
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

const FALLBACK = [
  { id: 'llc_order', label: 'Commander la LLC Wyoming', status: 'not_started', eta_days: 14, description: 'Commander via Wyoming Registered Agent — $99+$100+$50', external_link: 'https://www.wyomingregisteredagent.com/wyoming-llc-package', template_path: '/root/llc-setup/articles/articles-of-organization.md', contact_info: 'support@wyomingregisteredagent.com', blocker_for: ['ein','dba','mercury','stripe_live'] },
  { id: 'operating_agreement', label: "Signer l'Operating Agreement", status: 'not_started', eta_days: 0, description: 'Single-member, member-managed — template prêt', template_path: '/root/llc-setup/operating-agreement/operating-agreement-single-member.md', blocker_for: ['mercury','llc_legitimacy'] },
  { id: 'ss4_fax', label: 'Faxer SS-4 à l\'IRS', status: 'not_started', eta_days: 42, description: 'Fax +1-855-641-6935 — délai IRS 4-6 sem.', template_path: '/root/llc-setup/ein/ss-4-ein-application.md', external_link: 'https://www.irs.gov/businesses/small-businesses-self-employed/apply-for-an-employer-identification-number-ein-online', contact_info: 'IRS International Desk +1-267-941-1099', blocker_for: ['mercury','stripe_live','w8_bene'] },
  { id: 'cpa_engagement', label: 'Engager James Baker CPA', status: 'not_started', eta_days: 7, description: 'Email engagement letter — Form 5472 $400-$600 flat', template_path: '/root/llc-setup/accounting/cpa-engagement-template.md', external_link: 'https://jamesbakercpa.com', contact_info: 'hello@jamesbakercpa.com', blocker_for: ['form_5472','tax_compliance'] },
]

export async function GET() {
  const gate = await requireAdmin(); if (gate) return gate
  try {
    const { data, error } = await db().from('go_live_milestones').select('*').order('id')
    if (error) return NextResponse.json({ ok: true, degraded: true, milestones: FALLBACK, error: error.message })
    return NextResponse.json({ ok: true, milestones: data ?? FALLBACK })
  } catch (e) {
    return NextResponse.json({ ok: true, degraded: true, milestones: FALLBACK, error: (e as Error).message })
  }
}

export async function POST(req: NextRequest) {
  const gate = await requireAdmin(); if (gate) return gate
  const body = await req.json().catch(() => null) as { id?: string; status?: string; notes?: string } | null
  if (!body?.id || !body?.status) return NextResponse.json({ ok: false, error: 'missing_fields' }, { status: 400 })
  if (!['not_started','in_progress','blocked','done'].includes(body.status)) return NextResponse.json({ ok: false, error: 'invalid_status' }, { status: 400 })
  const patch: Record<string, unknown> = { status: body.status, notes: body.notes ?? null }
  if (body.status === 'in_progress') patch.started_at = new Date().toISOString()
  if (body.status === 'done') patch.done_at = new Date().toISOString()
  const { error } = await db().from('go_live_milestones').update(patch).eq('id', body.id)
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
