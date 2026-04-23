import { NextResponse } from 'next/server'
import { createSupabaseAdmin, createSupabaseServer } from '@/lib/supabase-server'
import { startVideoJob } from '@/lib/video-gen/orchestrator'
import { TIER_LIMITS, type VideoRatio, type VideoResolution, type VideoTier } from '@/lib/video-gen/types'

export const runtime = 'nodejs'

type CreateBody = {
  brief?: string
  tone?: string
  duration_s?: number
  language?: string
  resolution?: VideoResolution
  ratio?: VideoRatio
  tier?: VideoTier
  template_slug?: string
}

const RESOLUTION_ORDER: Record<VideoResolution, number> = {
  '480p': 1, '720p': 2, '1080p': 3, '4k': 4,
}

function currentMonth(): string {
  const d = new Date()
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

export async function GET() {
  const sb = await createSupabaseServer()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data, error } = await sb
    .from('video_jobs')
    .select('id, status, brief, tone, duration_s, language, resolution, ratio, tier, output_url, error_message, created_at, finished_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ jobs: data ?? [] })
}

export async function POST(req: Request) {
  const sb = await createSupabaseServer()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let body: CreateBody
  try {
    body = (await req.json()) as CreateBody
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 })
  }

  const brief = (body.brief ?? '').trim()
  if (brief.length < 10) {
    return NextResponse.json({ error: 'brief trop court (min 10 caractères)' }, { status: 400 })
  }

  const tier: VideoTier = body.tier ?? 'free'
  const limits = TIER_LIMITS[tier]
  if (!limits) return NextResponse.json({ error: 'tier invalide' }, { status: 400 })

  const requestedRes: VideoResolution = body.resolution ?? limits.maxResolution
  if (RESOLUTION_ORDER[requestedRes] > RESOLUTION_ORDER[limits.maxResolution]) {
    return NextResponse.json({
      error: `résolution ${requestedRes} interdite pour le tier ${tier} (max ${limits.maxResolution})`,
    }, { status: 403 })
  }

  const duration = Math.max(5, Math.min(180, body.duration_s ?? 60))
  const ratio: VideoRatio = body.ratio ?? '16:9'
  const language = body.language ?? 'fr'

  const admin = createSupabaseAdmin()
  const month = currentMonth()

  const { data: usageRow } = await admin
    .from('video_usage_logs')
    .select('videos_count')
    .eq('user_id', user.id)
    .eq('month', month)
    .maybeSingle()

  const used = usageRow?.videos_count ?? 0
  if (used >= limits.videosPerMonth) {
    return NextResponse.json({
      error: `quota atteint pour le tier ${tier} (${used}/${limits.videosPerMonth} vidéos ce mois-ci)`,
    }, { status: 429 })
  }

  const { data: inserted, error: insertErr } = await admin
    .from('video_jobs')
    .insert({
      user_id: user.id,
      status: 'pending',
      brief,
      tone: body.tone ?? null,
      duration_s: duration,
      language,
      resolution: requestedRes,
      ratio,
      tier,
    })
    .select('*')
    .single()
  if (insertErr || !inserted) {
    return NextResponse.json({ error: insertErr?.message ?? 'insert failed' }, { status: 500 })
  }

  await admin
    .from('video_usage_logs')
    .upsert({
      user_id: user.id,
      tier,
      month,
      videos_count: used + 1,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,month' })

  try {
    const result = await startVideoJob({ job_id: inserted.id })
    return NextResponse.json({ job: inserted, pipeline: result }, { status: 201 })
  } catch (e) {
    return NextResponse.json({
      job: inserted,
      pipeline_error: (e as Error).message,
    }, { status: 202 })
  }
}
