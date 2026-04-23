/**
 * Video Gen orchestrator — pipeline complet CC côté:
 *   1. Crée la row `video_jobs` (ou reprend une existante) avec status=pending
 *   2. Appelle le scénariste (ai-pool cascade)
 *   3. Insère les scènes dans `video_scenes`
 *   4. Enfile le job vers FTG Ad Factory (bridge HTTP)
 *   5. Update status=scene_gen + stocke `ftg_job_id` dans scenes_json
 *
 * Idempotent: si le job est déjà au-delà de `scripting`, on skip.
 */

import { createSupabaseAdmin } from '@/lib/supabase-server'
import type { Scene, VideoJob, VideoStatus } from './types'
import { scenarise } from './scenariste'
import { enqueueFTGJob, getFTGJobStatus } from './ftg-client'

type StartInput = {
  job_id: string
}

type StartResult = {
  job_id: string
  status: VideoStatus
  ftg_job_id: string | null
  scenes_count: number
}

const RESUMABLE: VideoStatus[] = ['pending', 'scripting']

export async function startVideoJob(input: StartInput): Promise<StartResult> {
  const admin = createSupabaseAdmin()

  const { data: jobData, error: fetchErr } = await admin
    .from('video_jobs')
    .select('*')
    .eq('id', input.job_id)
    .single()
  if (fetchErr || !jobData) {
    throw new Error(`orchestrator: job ${input.job_id} not found — ${fetchErr?.message ?? ''}`)
  }
  const job = jobData as VideoJob

  if (!RESUMABLE.includes(job.status)) {
    return {
      job_id: job.id,
      status: job.status,
      ftg_job_id: job.scenes_json?.ftg_job_id ?? null,
      scenes_count: job.scenes_json?.scenes?.length ?? 0,
    }
  }

  await admin
    .from('video_jobs')
    .update({ status: 'scripting', started_at: new Date().toISOString() })
    .eq('id', job.id)

  let scenes: Scene[]
  try {
    const out = await scenarise({
      brief: job.brief,
      tone: job.tone ?? undefined,
      duration_s: job.duration_s ?? 60,
      language: job.language,
    })
    scenes = out.scenes
  } catch (e) {
    const msg = (e as Error).message.slice(0, 500)
    await admin
      .from('video_jobs')
      .update({ status: 'failed', error_message: msg, finished_at: new Date().toISOString() })
      .eq('id', job.id)
    throw e
  }

  await admin.from('video_scenes').delete().eq('job_id', job.id)
  const scenesRows = scenes.map(s => ({
    job_id: job.id,
    seq: s.seq,
    prompt: s.prompt,
    voiceover_text: s.voiceover_text,
    duration_s: s.duration_s,
  }))
  const { error: insertErr } = await admin.from('video_scenes').insert(scenesRows)
  if (insertErr) throw new Error(`orchestrator: insert scenes failed — ${insertErr.message}`)

  const enqueue = await enqueueFTGJob({
    job_id: job.id,
    scenes,
    language: job.language,
    resolution: job.resolution,
    ratio: job.ratio,
  })

  await admin
    .from('video_jobs')
    .update({
      status: 'scene_gen',
      scenes_json: { scenes, ftg_job_id: enqueue.ftg_job_id },
    })
    .eq('id', job.id)

  return {
    job_id: job.id,
    status: 'scene_gen',
    ftg_job_id: enqueue.ftg_job_id,
    scenes_count: scenes.length,
  }
}

export async function pollVideoJob(job_id: string): Promise<{ status: VideoStatus; progress_pct: number; output_url?: string }> {
  const admin = createSupabaseAdmin()
  const { data, error } = await admin
    .from('video_jobs')
    .select('id, status, scenes_json, output_url')
    .eq('id', job_id)
    .single()
  if (error || !data) throw new Error(`pollVideoJob: job ${job_id} not found`)

  const job = data as Pick<VideoJob, 'id' | 'status' | 'scenes_json' | 'output_url'>
  const ftg_job_id = job.scenes_json?.ftg_job_id
  if (!ftg_job_id || ['completed', 'failed', 'cancelled'].includes(job.status)) {
    return { status: job.status, progress_pct: job.status === 'completed' ? 100 : 0, output_url: job.output_url ?? undefined }
  }

  const ftg = await getFTGJobStatus(ftg_job_id)

  if (ftg.status === 'completed' && ftg.output_url) {
    await admin
      .from('video_jobs')
      .update({
        status: 'completed',
        output_url: ftg.output_url,
        finished_at: new Date().toISOString(),
      })
      .eq('id', job_id)
    return { status: 'completed', progress_pct: 100, output_url: ftg.output_url }
  }
  if (ftg.status === 'failed') {
    await admin
      .from('video_jobs')
      .update({ status: 'failed', error_message: ftg.error ?? 'FTG job failed', finished_at: new Date().toISOString() })
      .eq('id', job_id)
    return { status: 'failed', progress_pct: ftg.progress_pct }
  }

  return { status: job.status, progress_pct: ftg.progress_pct }
}
