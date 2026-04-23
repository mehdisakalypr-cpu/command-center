import { NextResponse } from 'next/server'
import { createSupabaseAdmin, createSupabaseServer } from '@/lib/supabase-server'
import { pollVideoJob } from '@/lib/video-gen/orchestrator'

export const runtime = 'nodejs'

type PatchBody = { action?: 'cancel' }

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const sb = await createSupabaseServer()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: job, error } = await sb
    .from('video_jobs')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!job) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const admin = createSupabaseAdmin()
  const { data: scenes } = await admin
    .from('video_scenes')
    .select('seq, prompt, voiceover_text, duration_s, media_url, voiceover_url, provider')
    .eq('job_id', id)
    .order('seq', { ascending: true })

  let live: Awaited<ReturnType<typeof pollVideoJob>> | null = null
  try {
    live = await pollVideoJob(id)
  } catch {
    live = null
  }

  return NextResponse.json({ job, scenes: scenes ?? [], live })
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const sb = await createSupabaseServer()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let body: PatchBody
  try { body = (await req.json()) as PatchBody } catch { body = {} }
  if (body.action !== 'cancel') {
    return NextResponse.json({ error: 'action non supportée (cancel uniquement)' }, { status: 400 })
  }

  const admin = createSupabaseAdmin()
  const { data: job, error: fetchErr } = await admin
    .from('video_jobs')
    .select('id, user_id, status')
    .eq('id', id)
    .maybeSingle()
  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })
  if (!job || job.user_id !== user.id) return NextResponse.json({ error: 'not found' }, { status: 404 })
  if (['completed', 'failed', 'cancelled'].includes(job.status)) {
    return NextResponse.json({ error: `impossible d'annuler un job ${job.status}` }, { status: 409 })
  }

  const { error: updErr } = await admin
    .from('video_jobs')
    .update({ status: 'cancelled', finished_at: new Date().toISOString() })
    .eq('id', id)
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })

  return NextResponse.json({ ok: true, id, status: 'cancelled' })
}
