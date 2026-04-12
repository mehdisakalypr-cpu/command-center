import { NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data, error } = await supabaseAdmin()
    .from('pvp_items')
    .select('*')
    .order('project', { ascending: true })
    .order('domain', { ascending: true })
    .order('order_index', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ items: data ?? [] })
}

export async function PATCH(req: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const { id, ...patch } = body as { id: string; [k: string]: unknown }
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const allowed = ['status', 'notes', 'document_url', 'document_name', 'verified_at', 'verified_by', 'last_test_result']
  const clean: Record<string, unknown> = {}
  for (const k of allowed) if (k in patch) clean[k] = patch[k as keyof typeof patch]

  if (clean.status === 'done' && !clean.verified_at) {
    clean.verified_at = new Date().toISOString()
    clean.verified_by = user.id
  }

  const { data, error } = await supabaseAdmin()
    .from('pvp_items')
    .update(clean)
    .eq('id', id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: data })
}
