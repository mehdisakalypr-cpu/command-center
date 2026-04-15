import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isAdmin } from '@/lib/supabase-server'

const sb = () =>
  createClient(
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

async function requireAdmin(): Promise<Response | null> {
  const ok = await isAdmin()
  if (!ok) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  return null
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin(); if (denied) return denied
  const { id } = await params
  const body = await req.json()
  // Auto-set resolved_at when marked done/verified
  if ((body.status === 'done' || body.status === 'verified') && !body.resolved_at) {
    body.resolved_at = new Date().toISOString()
  }
  if (body.status === 'open' || body.status === 'in_progress') {
    body.resolved_at = null
  }
  const { data, error } = await sb().from('security_items').update(body).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin(); if (denied) return denied
  const { id } = await params
  const { error } = await sb().from('security_items').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
