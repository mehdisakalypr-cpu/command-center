import { NextRequest, NextResponse } from 'next/server'
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

// GET /api/admin/security/items?site=&status=&severity=
export async function GET(req: NextRequest) {
  const denied = await requireAdmin(); if (denied) return denied
  const sp = req.nextUrl.searchParams
  let q = sb().from('security_items').select('*').order('detected_at', { ascending: false }).limit(500)
  const site = sp.get('site'); if (site) q = q.eq('site', site)
  const status = sp.get('status'); if (status) q = q.eq('status', status)
  const severity = sp.get('severity'); if (severity) q = q.eq('severity', severity)
  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/admin/security/items  body: partial<SecurityItem>
export async function POST(req: NextRequest) {
  const denied = await requireAdmin(); if (denied) return denied
  const body = await req.json()
  if (!body?.site || !body?.category || !body?.severity || !body?.title) {
    return NextResponse.json({ error: 'site, category, severity, title required' }, { status: 400 })
  }
  const { data, error } = await sb().from('security_items').insert(body).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
