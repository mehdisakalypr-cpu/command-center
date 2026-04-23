import { NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'
import type { ApiType } from '@/lib/api-doc/types'

export const runtime = 'nodejs'

const VALID_TYPES: ApiType[] = ['openapi', 'graphql', 'grpc', 'trpc']
const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/

export async function GET() {
  const sb = await createSupabaseServer()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'non autorisé' }, { status: 401 })

  const { data, error } = await sb
    .from('api_doc_projects')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, projects: data ?? [] })
}

type CreateBody = { name?: string; slug?: string; api_type?: ApiType }

export async function POST(req: Request) {
  const sb = await createSupabaseServer()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'non autorisé' }, { status: 401 })

  let body: CreateBody
  try {
    body = (await req.json()) as CreateBody
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 })
  }

  const name = (body.name ?? '').trim()
  const slug = (body.slug ?? '').trim().toLowerCase()
  const apiType = body.api_type ?? 'openapi'

  if (!name || name.length > 100) {
    return NextResponse.json({ error: 'nom requis (≤100 car.)' }, { status: 400 })
  }
  if (!SLUG_RE.test(slug)) {
    return NextResponse.json({ error: 'slug invalide (a-z, 0-9, -)' }, { status: 400 })
  }
  if (!VALID_TYPES.includes(apiType)) {
    return NextResponse.json({ error: `api_type doit être ${VALID_TYPES.join(',')}` }, { status: 400 })
  }

  const { data, error } = await sb
    .from('api_doc_projects')
    .insert({ user_id: user.id, name, slug, api_type: apiType })
    .select('*')
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'slug déjà utilisé' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true, project: data }, { status: 201 })
}
