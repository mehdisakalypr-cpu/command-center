import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin, requireAdmin } from '@/lib/supabase-server'

export const runtime = 'nodejs'

export async function GET() {
  const denied = await requireAdmin()
  if (denied) return denied

  const sb = createSupabaseAdmin()
  const { data, error } = await sb
    .from('wiki_niches')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ niches: data ?? [] })
}

export async function POST(req: NextRequest) {
  const denied = await requireAdmin()
  if (denied) return denied

  let body: {
    slug?: string
    title?: Record<string, string> | string
    description?: Record<string, string> | string
    tier_access?: 'free' | 'premium'
    meta_keywords?: string[]
    status?: 'draft' | 'live' | 'paused'
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'body JSON invalide' }, { status: 400 })
  }

  const slug = (body.slug ?? '').trim().toLowerCase()
  if (!slug || !/^[a-z0-9-]{3,60}$/.test(slug)) {
    return NextResponse.json({ error: 'slug invalide (a-z0-9-, 3-60 chars)' }, { status: 400 })
  }

  const title = typeof body.title === 'string' ? { fr: body.title } : (body.title ?? {})
  const description = typeof body.description === 'string' ? { fr: body.description } : (body.description ?? {})
  const tier_access = body.tier_access === 'premium' ? 'premium' : 'free'
  const status = body.status && ['draft', 'live', 'paused'].includes(body.status) ? body.status : 'draft'
  const meta_keywords = Array.isArray(body.meta_keywords) ? body.meta_keywords.filter(k => typeof k === 'string').slice(0, 30) : []

  const sb = createSupabaseAdmin()
  const { data, error } = await sb
    .from('wiki_niches')
    .insert({ slug, title, description, tier_access, meta_keywords, status })
    .select()
    .single()
  if (error) {
    const status = error.code === '23505' ? 409 : 500
    return NextResponse.json({ error: error.message }, { status })
  }
  return NextResponse.json({ niche: data }, { status: 201 })
}
