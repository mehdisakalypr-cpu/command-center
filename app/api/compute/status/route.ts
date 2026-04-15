/**
 * GET /api/compute/status
 * Reads the latest sample from `compute_samples` (pushed by VPS cron
 * `/root/monitor/push-compute-to-db.sh`). The route no longer spawns
 * processes or reads files — it is fully portable to Vercel / any host.
 *
 * If the VPS cron has not run in > 10 min we still return the row but
 * flag `stale=true` so the UI can warn.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const sb = () => createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!)

export async function GET() {
  const t0 = Date.now()
  try {
    const client = sb()

    const [{ data: stateRow }, { data: sampleRows }] = await Promise.all([
      client.from('compute_max_state').select('*').eq('id', true).single(),
      client
        .from('compute_samples')
        .select('*')
        .order('captured_at', { ascending: false })
        .limit(1),
    ])

    const sample = sampleRows?.[0] ?? null
    const maxEnabled = !!stateRow?.max_enabled

    if (!sample) {
      return NextResponse.json({
        ok: true,
        ts: new Date().toISOString(),
        max_enabled: maxEnabled,
        enabled_at: stateRow?.enabled_at ?? null,
        last_claude_ack: stateRow?.last_claude_ack ?? null,
        utilization: 0,
        processes: 0,
        processes_by_project: {},
        bg_jobs: [],
        active_bg: 0,
        load_avg: [0, 0, 0],
        ram_pct: 0,
        stale: true,
        stale_reason: 'no compute_samples row yet — wait for VPS cron',
        duration_ms: Date.now() - t0,
      })
    }

    const capturedAt = new Date(sample.captured_at).getTime()
    const ageMs = Date.now() - capturedAt
    const stale = ageMs > 10 * 60_000

    const bg = Array.isArray(sample.bg_jobs) ? sample.bg_jobs : []
    const activeBg = bg.filter((j: { status?: string }) => j?.status === 'running').length

    return NextResponse.json({
      ok: true,
      ts: new Date().toISOString(),
      sample_at: sample.captured_at,
      sample_age_ms: ageMs,
      stale,
      max_enabled: maxEnabled,
      enabled_at: stateRow?.enabled_at ?? null,
      last_claude_ack: stateRow?.last_claude_ack ?? null,
      utilization: Number(sample.utilization ?? 0),
      processes: Number(sample.processes ?? 0),
      processes_by_project: sample.processes_by_project ?? {},
      bg_jobs: bg,
      active_bg: activeBg,
      load_avg: [Number(sample.load_avg_1m ?? 0), 0, 0],
      ram_pct: Number(sample.ram_pct ?? 0),
      source: sample.source ?? 'vps-cron',
      duration_ms: Date.now() - t0,
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
