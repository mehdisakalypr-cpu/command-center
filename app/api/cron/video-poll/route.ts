/**
 * Cron — video-gen poller.
 *
 * For every `video_jobs` row in `scene_gen` state, poll the FTG Ad Factory
 * bridge for progress. Transitions jobs to `completed` (with output_url)
 * or `failed` (with error_message) once FTG reports final state.
 *
 * Idempotent: `pollVideoJob` is a no-op on already-terminal jobs.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase-server'
import { pollVideoJob } from '@/lib/video-gen/orchestrator'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const BATCH_SIZE = 20

export async function GET(req: NextRequest) {
  const authorized =
    req.headers.get('x-vercel-cron') ||
    req.headers.get('authorization') === `Bearer ${process.env.CRON_SECRET}`
  if (!authorized) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const admin = createSupabaseAdmin()
  const t0 = Date.now()

  const { data: jobs, error } = await admin
    .from('video_jobs')
    .select('id')
    .eq('status', 'scene_gen')
    .order('created_at', { ascending: true })
    .limit(BATCH_SIZE)

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  const results: Array<{ job_id: string; status: string; progress_pct: number; error?: string }> = []
  for (const j of jobs ?? []) {
    try {
      const r = await pollVideoJob(j.id)
      results.push({ job_id: j.id, status: r.status, progress_pct: r.progress_pct })
    } catch (e) {
      const msg = (e as Error).message.slice(0, 300)
      results.push({ job_id: j.id, status: 'error', progress_pct: 0, error: msg })
    }
  }

  return NextResponse.json({
    ok: true,
    polled: jobs?.length ?? 0,
    results,
    duration_ms: Date.now() - t0,
  })
}
