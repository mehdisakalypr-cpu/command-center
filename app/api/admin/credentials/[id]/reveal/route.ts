import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getUser } from '@/lib/auth'

const SECRET = process.env.CREDENTIALS_SECRET!

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { id } = await params
  const sb = supabaseAdmin()

  const { data: row, error } = await sb.from('social_credentials').select('credential_encrypted').eq('id', id).single()
  if (error || !row) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const { data: plain, error: decErr } = await sb.rpc('credential_decrypt', {
    ciphertext_b64: row.credential_encrypted, secret: SECRET,
  })
  if (decErr) return NextResponse.json({ error: decErr.message }, { status: 500 })

  await sb.from('credential_access_log').insert({ credential_id: id, user_id: user.id, action: 'reveal' })
  await sb.from('social_credentials').update({ last_accessed_at: new Date().toISOString() }).eq('id', id)

  return NextResponse.json({ credential: plain as string })
}
