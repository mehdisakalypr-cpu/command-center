/**
 * Cron — video-gen worker.
 *
 * Picks up to N `video_jobs` in `pending|scripting` state and drives each
 * through the orchestrator (script → scenes → enqueue to FTG Ad Factory).
 *
 * Idempotent: `startVideoJob` skips jobs already past `scripting`. Stuck
 * `scripting` rows (if the previous run crashed mid-flight) get retried.
 *
 * Called every cron tick (default daily on hobby — to increase frequency,
 * mirror the FTG pattern and add a VPS cron that POSTs here with the
 * CRON_SECRET header).
 */
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase-server'
import { startVideoJob } from '@/lib/video-gen/orchestrator'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const BATCH_SIZE = 5

export async function GET(req: NextRequest) {
  const authorized =
    req.headers.get('x-vercel-cron') ||
    req.headers.get('authorization') === `Bearer ${process.env.CRON_SECRET}`
  if (!authorized) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const admin = createSupabaseAdmin()
  const t0 = Date.now()

  const { data: jobs, error } = await admin
    .from('video_jobs')
    .select('id, status, created_at')
    .in('status', ['pending', 'scripting'])
    .order('created_at', { ascending: true })
    .limit(BATCH_SIZE)

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  const results: Array<{ job_id: string; ok: boolean; status?: string; error?: string }> = []
  for (const j of jobs ?? []) {
    try {
      const r = await startVideoJob({ job_id: j.id })
      results.push({ job_id: j.id, ok: true, status: r.status })
    } catch (e) {
      const msg = (e as Error).message.slice(0, 300)
      results.push({ job_id: j.id, ok: false, error: msg })
    }
  }

  return NextResponse.json({
    ok: true,
    picked: jobs?.length ?? 0,
    processed: results,
    duration_ms: Date.now() - t0,
  })
}
