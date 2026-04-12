import { NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BUCKET = 'pvp-docs'

export async function POST(req: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const form = await req.formData()
  const file = form.get('file') as File | null
  const itemId = form.get('itemId') as string | null
  if (!file || !itemId) return NextResponse.json({ error: 'file + itemId required' }, { status: 400 })

  const admin = supabaseAdmin()
  // Ensure bucket exists (private)
  await admin.storage.createBucket(BUCKET, { public: false }).catch(() => {})

  const ext = file.name.split('.').pop() ?? 'bin'
  const path = `${itemId}/${Date.now()}.${ext}`
  const bytes = new Uint8Array(await file.arrayBuffer())
  const { error: upErr } = await admin.storage.from(BUCKET).upload(path, bytes, {
    contentType: file.type || 'application/octet-stream',
    upsert: false,
  })
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })

  const { data: signed } = await admin.storage.from(BUCKET).createSignedUrl(path, 60 * 60 * 24 * 365)

  await admin.from('pvp_items').update({
    document_url: signed?.signedUrl ?? path,
    document_name: file.name,
    status: 'done',
    verified_at: new Date().toISOString(),
    verified_by: user.id,
  }).eq('id', itemId)

  return NextResponse.json({ ok: true, path, url: signed?.signedUrl })
}
