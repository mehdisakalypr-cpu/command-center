import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const sb = () =>
  createClient(
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

function detectPlatform(url: string): string {
  const u = url.toLowerCase()
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube'
  if (u.includes('tiktok.com')) return 'tiktok'
  if (u.includes('vimeo.com')) return 'vimeo'
  if (u.includes('twitter.com') || u.includes('x.com')) return 'twitter'
  if (u.includes('instagram.com')) return 'instagram'
  return 'other'
}

export async function GET() {
  const denied = await requireAuth()
  if (denied) return denied

  const { data, error } = await sb()
    .from('video_analyses')
    .select('id, url, platform, status, title, uploader, duration_s, language, error, cost_eur, created_at, finished_at')
    .order('created_at', { ascending: false })
    .limit(50)

  return NextResponse.json({ jobs: data ?? [], error: error?.message ?? null })
}

export async function POST(req: Request) {
  const denied = await requireAuth()
  if (denied) return denied

  const body = (await req.json().catch(() => ({}))) as {
    url?: string
    user_prompt?: string
  }
  const url = (body.url ?? '').trim()
  const userPrompt = (body.user_prompt ?? '').trim() || null

  if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 })
  try {
    new URL(url)
  } catch {
    return NextResponse.json({ error: 'invalid url' }, { status: 400 })
  }

  const { data, error } = await sb()
    .from('video_analyses')
    .insert({ url, platform: detectPlatform(url), status: 'pending', user_prompt: userPrompt })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, id: data!.id })
}
