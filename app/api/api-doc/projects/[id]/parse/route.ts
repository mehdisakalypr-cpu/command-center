import { NextResponse } from 'next/server'
import { createSupabaseServer, createSupabaseAdmin } from '@/lib/supabase-server'
import { parseSpec } from '@/lib/api-doc/parsers'

export const runtime = 'nodejs'

type ParseBody = {
  spec_content?: string
  version?: string
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const sb = await createSupabaseServer()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'non autorisé' }, { status: 401 })

  const { data: project, error: projErr } = await sb
    .from('api_doc_projects')
    .select('id, user_id, api_type')
    .eq('id', id)
    .single()

  if (projErr || !project) return NextResponse.json({ error: 'projet introuvable' }, { status: 404 })
  if (project.user_id !== user.id) return NextResponse.json({ error: 'accès refusé' }, { status: 403 })

  let body: ParseBody
  try {
    body = (await req.json()) as ParseBody
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 })
  }

  const specContent = body.spec_content
  const version = (body.version ?? '').trim()
  if (!specContent || typeof specContent !== 'string') {
    return NextResponse.json({ error: 'spec_content requis (string)' }, { status: 400 })
  }
  if (!version) {
    return NextResponse.json({ error: 'version requise' }, { status: 400 })
  }
  if (specContent.length > 5_000_000) {
    return NextResponse.json({ error: 'spec trop volumineuse (>5MB)' }, { status: 413 })
  }

  let parsedAst
  try {
    parsedAst = await parseSpec(specContent, project.api_type)
  } catch (e) {
    return NextResponse.json({ error: `parse: ${(e as Error).message}` }, { status: 422 })
  }

  const admin = createSupabaseAdmin()
  let specContentJson: unknown = specContent
  try {
    specContentJson = JSON.parse(specContent)
  } catch {
    specContentJson = { raw: specContent }
  }

  const { data: specRow, error: insertErr } = await admin
    .from('api_doc_specs')
    .upsert(
      {
        project_id: id,
        version,
        spec_content: specContentJson,
        parsed_ast: parsedAst,
      },
      { onConflict: 'project_id,version' },
    )
    .select('id')
    .single()

  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })

  await admin
    .from('api_doc_projects')
    .update({ last_synced_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', id)

  return NextResponse.json({
    ok: true,
    spec_id: specRow.id,
    endpoint_count: parsedAst.endpoints.length,
    parsed_ast: parsedAst,
  })
}
