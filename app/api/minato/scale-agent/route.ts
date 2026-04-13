/**
 * POST /api/minato/scale-agent
 * Giant Piccolo — enqueue a scale request in Supabase. A VPS cron worker
 * (/root/monitor/scale-worker.sh) picks up 'pending' rows, spawns the
 * requested agent instances via nohup, and writes back PIDs + status.
 *
 * Vercel serverless can't persist processes, so we decouple.
 *
 * GET /api/minato/scale-agent?id=N → current status of a request (polling).
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Allowlist of agents. Must match the VPS worker.
const AGENTS = [
  'ofa:scout-osm',
  'ofa:hyperscale-scout',
  'ofa:generate-for-leads',
  'ofa:generate-for-reachable',
  'ofa:enrich-contacts',
  'ofa:outreach',
  'ofa:classifier-auto',
  'ofa:reviews-checker',
  'ofa:fix-demos',
  'ftg:seo-factory',
]

const sb = () => createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY!,
)

export async function POST(req: NextRequest) {
  const { agent, instances = 1, args = '', strategy, requester = 'ui' } = await req.json().catch(() => ({} as any))
  if (!agent || !AGENTS.includes(agent)) {
    return NextResponse.json({ ok: false, error: `unknown agent "${agent}". Allowed: ${AGENTS.join(', ')}` }, { status: 400 })
  }
  const n = Math.max(1, Math.min(10, Number(instances) || 1))

  const { data, error } = await sb().from('scale_requests').insert({
    agent, instances: n, args: args || null, requester, strategy: strategy || null, status: 'pending',
  }).select('id').single()

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  return NextResponse.json({
    ok: true,
    id: (data as any).id,
    agent, instances: n,
    status: 'pending',
    note: 'Request queued. VPS worker picks up within ~60s. Poll GET ?id=N for status.',
  })
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  const pidsRaw = url.searchParams.get('pids')

  // Legacy in-process liveness check (still used by watchdog).
  if (pidsRaw) {
    const pids = pidsRaw.split(',').map(s => parseInt(s, 10)).filter(n => Number.isFinite(n) && n > 0)
    const alive: number[] = []
    for (const pid of pids) {
      try { process.kill(pid, 0); alive.push(pid) } catch {}
    }
    return NextResponse.json({ ok: true, requested: pids, alive, dead: pids.filter(p => !alive.includes(p)) })
  }

  if (!id) return NextResponse.json({ ok: true, agents: AGENTS })

  const { data, error } = await sb().from('scale_requests').select('*').eq('id', id).single()
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 404 })
  return NextResponse.json({ ok: true, request: data })
}
