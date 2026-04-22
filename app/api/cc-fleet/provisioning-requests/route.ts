import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isAdmin } from '@/lib/supabase-server'
import type { Capability } from '@/lib/cc-fleet'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const sb = () =>
  createClient(
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

const ALLOWED_CAPS: Capability[] = [
  'ui', 'feature', 'architecture', 'review', 'debug',
  'fix', 'refactor', 'scout', 'content', 'cron',
]

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return Response.json({ ok: false, error: 'admin only' }, { status: 403 })

  let body: {
    count?: number
    capabilities?: string[]
    kind?: 'autonomous' | 'interactive'
    night_eligible?: boolean
    max_concurrent_tickets?: number
    quota_plan?: 'max_5x' | 'max_20x' | 'team' | 'api_direct'
    notes?: string
  }
  try {
    body = await req.json()
  } catch {
    return Response.json({ ok: false, error: 'invalid json' }, { status: 400 })
  }

  const count = Math.max(1, Math.min(10, Number(body.count ?? 1)))
  const capabilities = (body.capabilities ?? ['scout', 'content', 'refactor', 'cron', 'fix'])
    .filter(c => ALLOWED_CAPS.includes(c as Capability))
  if (capabilities.length === 0) {
    return Response.json({ ok: false, error: 'at least one capability required' }, { status: 400 })
  }
  const kind = body.kind === 'interactive' ? 'interactive' : 'autonomous'
  const night_eligible = body.night_eligible !== false
  const max_concurrent_tickets = Math.max(1, Math.min(5, Number(body.max_concurrent_tickets ?? 2)))
  const quota_plan = ['max_5x', 'max_20x', 'team', 'api_direct'].includes(body.quota_plan ?? '')
    ? body.quota_plan
    : 'max_20x'
  const notes = (body.notes ?? '').slice(0, 500)

  const rows = Array.from({ length: count }, () => ({
    kind, capabilities, night_eligible, max_concurrent_tickets, quota_plan, notes,
  }))

  const { data, error } = await sb().from('cc_fleet_provisioning_requests').insert(rows).select('id')
  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 })
  }

  return Response.json({
    ok: true,
    inserted: data?.length ?? 0,
    ids: data?.map((r: { id: string }) => r.id),
    next_step: 'Ouvre Claude Code en terminal et tape : `/provision-cc-fleet` ou « provisionne les workers CC Fleet en attente »',
  })
}

export async function GET() {
  if (!(await isAdmin())) return Response.json({ ok: false, error: 'admin only' }, { status: 403 })

  const { data, error } = await sb()
    .from('cc_fleet_provisioning_requests')
    .select('*')
    .in('state', ['pending', 'in_progress'])
    .order('created_at', { ascending: true })

  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 })
  return Response.json({ ok: true, requests: data ?? [] })
}
