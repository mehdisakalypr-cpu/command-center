import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// GET /api/admin/demo-parcours — List all demo requests (optional ?status=pending filter)
export async function GET(req: NextRequest) {
  try {
    const statusFilter = req.nextUrl.searchParams.get('status')

    let query = sb()
      .from('demo_requests')
      .select('*')
      .order('created_at', { ascending: false })

    if (statusFilter && ['pending', 'approved', 'rejected'].includes(statusFilter)) {
      query = query.eq('status', statusFilter)
    }

    const { data, error } = await query

    if (error) {
      console.error('[CC/admin/demo-parcours GET]', error)
      return NextResponse.json({ error: 'Erreur interne.' }, { status: 500 })
    }

    return NextResponse.json({ requests: data ?? [] })
  } catch (err) {
    console.error('[CC/admin/demo-parcours GET]', err)
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

// POST /api/admin/demo-parcours — Update a request {id, status, parcours}
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      id?: string
      status?: string
      parcours?: string[]
    }

    if (!body.id) {
      return NextResponse.json({ error: 'ID requis.' }, { status: 400 })
    }

    const update: Record<string, unknown> = {}

    if (body.status && ['pending', 'approved', 'rejected'].includes(body.status)) {
      update.status = body.status
      update.reviewed_at = new Date().toISOString()
    }
    if (Array.isArray(body.parcours)) {
      update.parcours = body.parcours
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'Rien à mettre à jour.' }, { status: 400 })
    }

    const { data, error } = await sb()
      .from('demo_requests')
      .update(update)
      .eq('id', body.id)
      .select('*')
      .single()

    if (error) {
      console.error('[CC/admin/demo-parcours POST]', error)
      return NextResponse.json({ error: 'Erreur de mise à jour.' }, { status: 500 })
    }

    return NextResponse.json({ request: data })
  } catch (err) {
    console.error('[CC/admin/demo-parcours POST]', err)
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

// DELETE /api/admin/demo-parcours?id=xxx — Delete a request
export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'Paramètre id requis.' }, { status: 400 })
    }

    const { error } = await sb()
      .from('demo_requests')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('[CC/admin/demo-parcours DELETE]', error)
      return NextResponse.json({ error: 'Erreur de suppression.' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[CC/admin/demo-parcours DELETE]', err)
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
