import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const db = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)

export async function GET() {
  const { data, error } = await db().from('api_keys_log').select('*').order('added_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ rows: data ?? [] })
}

export async function POST(req: Request) {
  const body = await req.json()
  const { provider, label, env_var_name, purpose, daily_quota, notes } = body
  if (!provider || !label) return NextResponse.json({ error: 'provider & label required' }, { status: 400 })
  const { data, error } = await db().from('api_keys_log').insert({
    provider, label, env_var_name, purpose, daily_quota, notes,
  }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ row: data })
}

export async function PATCH(req: Request) {
  const body = await req.json()
  const { id, ...patch } = body
  const { error } = await db().from('api_keys_log').update(patch).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const { id } = await req.json()
  const { error } = await db().from('api_keys_log').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
