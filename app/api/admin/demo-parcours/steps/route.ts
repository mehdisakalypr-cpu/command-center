import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// GET /api/admin/demo-parcours/steps?parcours=entrepreneur — List steps ordered by step_order
export async function GET(req: NextRequest) {
  try {
    const parcours = req.nextUrl.searchParams.get('parcours')?.trim().toLowerCase()
    if (!parcours) {
      return NextResponse.json({ error: 'Paramètre parcours requis.' }, { status: 400 })
    }

    const { data, error } = await sb()
      .from('demo_tours')
      .select('*')
      .eq('parcours', parcours)
      .order('step_order', { ascending: true })

    if (error) {
      console.error('[CC/admin/demo-parcours/steps GET]', error)
      return NextResponse.json({ error: 'Erreur interne.' }, { status: 500 })
    }

    return NextResponse.json({ steps: data ?? [] })
  } catch (err) {
    console.error('[CC/admin/demo-parcours/steps GET]', err)
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

// POST /api/admin/demo-parcours/steps — Upsert a step
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      id?: string
      parcours: string
      step_order: number
      title_fr: string
      title_en: string
      body_fr: string
      body_en: string
      target_url: string
      target_id?: string | null
      position?: string
      published?: boolean
    }

    if (!body.parcours || body.step_order == null || !body.title_fr || !body.target_url) {
      return NextResponse.json({ error: 'Champs requis manquants (parcours, step_order, title_fr, target_url).' }, { status: 400 })
    }

    const row = {
      parcours: body.parcours,
      step_order: body.step_order,
      title_fr: body.title_fr,
      title_en: body.title_en || '',
      body_fr: body.body_fr || '',
      body_en: body.body_en || '',
      target_url: body.target_url,
      target_id: body.target_id || null,
      position: body.position || 'bottom',
      published: body.published ?? true,
    }

    let data, error

    if (body.id) {
      const result = await sb()
        .from('demo_tours')
        .update(row)
        .eq('id', body.id)
        .select('*')
        .single()
      data = result.data
      error = result.error
    } else {
      const result = await sb()
        .from('demo_tours')
        .insert(row)
        .select('*')
        .single()
      data = result.data
      error = result.error
    }

    if (error) {
      console.error('[CC/admin/demo-parcours/steps POST]', error)
      return NextResponse.json({ error: 'Erreur de sauvegarde.' }, { status: 500 })
    }

    return NextResponse.json({ step: data })
  } catch (err) {
    console.error('[CC/admin/demo-parcours/steps POST]', err)
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

// DELETE /api/admin/demo-parcours/steps?id=xxx — Delete a step
export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'Paramètre id requis.' }, { status: 400 })
    }

    const { error } = await sb()
      .from('demo_tours')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('[CC/admin/demo-parcours/steps DELETE]', error)
      return NextResponse.json({ error: 'Erreur de suppression.' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[CC/admin/demo-parcours/steps DELETE]', err)
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
