import { NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'
import type { ProjectStatus, ProjectTier } from '@/lib/api-doc/types'

export const runtime = 'nodejs'

const VALID_TIERS: ProjectTier[] = ['free', 'pro', 'team']
const VALID_STATUS: ProjectStatus[] = ['active', 'generating', 'error', 'paused']

async function loadOwned(id: string) {
  const sb = await createSupabaseServer()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return { err: NextResponse.json({ error: 'non autorisé' }, { status: 401 }), sb: null, user: null }

  const { data, error } = await sb
    .from('api_doc_projects')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) {
    return { err: NextResponse.json({ error: 'projet introuvable' }, { status: 404 }), sb: null, user: null }
  }
  if (data.user_id !== user.id) {
    return { err: NextResponse.json({ error: 'accès refusé' }, { status: 403 }), sb: null, user: null }
  }
  return { err: null, sb, user, project: data }
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const { err, project } = await loadOwned(id)
  if (err) return err
  return NextResponse.json({ ok: true, project })
}

type PatchBody = {
  name?: string
  repo_url?: string | null
  spec_url?: string | null
  custom_domain?: string | null
  tier?: ProjectTier
  status?: ProjectStatus
  branding_enabled?: boolean
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const { err, sb } = await loadOwned(id)
  if (err) return err

  let body: PatchBody
  try {
    body = (await req.json()) as PatchBody
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 })
  }

  const update: Record<string, unknown> = {}
  if (typeof body.name === 'string') {
    const n = body.name.trim()
    if (!n || n.length > 100) return NextResponse.json({ error: 'nom invalide' }, { status: 400 })
    update.name = n
  }
  if ('repo_url' in body) update.repo_url = body.repo_url
  if ('spec_url' in body) update.spec_url = body.spec_url
  if ('custom_domain' in body) update.custom_domain = body.custom_domain
  if (body.tier) {
    if (!VALID_TIERS.includes(body.tier)) return NextResponse.json({ error: 'tier invalide' }, { status: 400 })
    update.tier = body.tier
  }
  if (body.status) {
    if (!VALID_STATUS.includes(body.status)) return NextResponse.json({ error: 'status invalide' }, { status: 400 })
    update.status = body.status
  }
  if (typeof body.branding_enabled === 'boolean') update.branding_enabled = body.branding_enabled

  if (!Object.keys(update).length) return NextResponse.json({ error: 'aucun champ à mettre à jour' }, { status: 400 })
  update.updated_at = new Date().toISOString()

  const { data, error } = await sb!
    .from('api_doc_projects')
    .update(update)
    .eq('id', id)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, project: data })
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const { err, sb } = await loadOwned(id)
  if (err) return err

  const { error } = await sb!.from('api_doc_projects').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
