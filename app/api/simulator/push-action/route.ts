import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ ok: false, error: 'invalid json' }, { status: 400 })

  const { product, action, agent, instances, source = 'dashboard/simulator', payload } = body
  if (!product || !action) {
    return NextResponse.json({ ok: false, error: 'product and action required' }, { status: 400 })
  }

  const { data, error } = await sb
    .from('business_simulator_push_log')
    .insert({
      product,
      action,
      agent: agent ?? null,
      instances: instances ?? null,
      source,
      payload: payload ?? null,
    })
    .select('id, created_at')
    .single()

  if (error) {
    // table absente: on log côté serveur et on acquitte sans bloquer l'UX
    console.warn('[push-action] insert failed:', error.message)
    return NextResponse.json({ ok: true, id: 'local-' + Date.now(), warning: error.message })
  }

  return NextResponse.json({ ok: true, id: data.id, created_at: data.created_at })
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const product = url.searchParams.get('product')
  const limit = Math.min(200, parseInt(url.searchParams.get('limit') ?? '50', 10) || 50)

  const q = sb
    .from('business_simulator_push_log')
    .select('id, product, action, agent, instances, source, payload, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)

  const { data, error } = product ? await q.eq('product', product) : await q
  if (error) return NextResponse.json({ ok: true, items: [], warning: error.message })
  return NextResponse.json({ ok: true, items: data })
}
