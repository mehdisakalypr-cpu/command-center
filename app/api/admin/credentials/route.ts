import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getUser } from '@/lib/auth'

const SECRET = process.env.CREDENTIALS_SECRET!

export async function GET(req: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const site = url.searchParams.get('site')

  const sb = supabaseAdmin()
  let q = sb.from('social_credentials').select('id, site_slug, platform, handle, auth_type, metadata_json, created_at, updated_at, last_accessed_at').order('site_slug').order('platform')
  if (site) q = q.eq('site_slug', site)
  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ credentials: data })
}

export async function POST(req: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { id, site_slug, platform, handle, auth_type, credential, metadata_json } = await req.json()
  if (!site_slug || !platform || !auth_type || !credential) {
    return NextResponse.json({ error: 'missing fields' }, { status: 400 })
  }

  const sb = supabaseAdmin()
  const { data: enc, error: encErr } = await sb.rpc('credential_encrypt', { plaintext: credential, secret: SECRET })
  if (encErr || !enc) return NextResponse.json({ error: encErr?.message || 'encryption failed' }, { status: 500 })

  const row = {
    site_slug, platform, handle: handle || null, auth_type,
    credential_encrypted: enc as string,
    metadata_json: metadata_json || {},
    created_by: user.id,
    updated_at: new Date().toISOString(),
  }

  if (id) {
    const { error } = await sb.from('social_credentials').update(row).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    await sb.from('credential_access_log').insert({ credential_id: id, user_id: user.id, action: 'update' })
    return NextResponse.json({ id })
  }

  const { data: inserted, error } = await sb.from('social_credentials').insert(row).select('id').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await sb.from('credential_access_log').insert({ credential_id: inserted.id, user_id: user.id, action: 'create' })
  return NextResponse.json({ id: inserted.id })
}

export async function DELETE(req: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 })
  const sb = supabaseAdmin()
  await sb.from('credential_access_log').insert({ credential_id: id, user_id: user.id, action: 'delete' })
  const { error } = await sb.from('social_credentials').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
