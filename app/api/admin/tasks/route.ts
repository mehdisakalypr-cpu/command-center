import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

const PROJECTS = new Set(['ftg','ofa','cc','estate','shift','optimus','hisoka','aam','general'])
const CATEGORIES = new Set(['test','dev','ops','legal','content','marketing','design','infra'])
const OWNERS = new Set(['user','claude','shared'])
const PRIORITIES = new Set(['critical','high','medium','low'])
const STATUSES = new Set(['pending','in_progress','done','blocked'])
const PLATFORMS = new Set(['desktop','mobile','both','api','n/a'])

function clean(s: unknown, max = 800): string | null {
  if (typeof s !== 'string') return null
  const t = s.trim()
  if (!t) return null
  return t.slice(0, max)
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const title = clean(body.title, 200)
  if (!title) return NextResponse.json({ error: 'title required' }, { status: 400 })

  const row = {
    project:  PROJECTS.has(String(body.project))   ? String(body.project)   : 'general',
    category: CATEGORIES.has(String(body.category)) ? String(body.category) : 'dev',
    owner:    OWNERS.has(String(body.owner))       ? String(body.owner)    : 'shared',
    priority: PRIORITIES.has(String(body.priority)) ? String(body.priority) : 'medium',
    status:   STATUSES.has(String(body.status))    ? String(body.status)   : 'pending',
    platform: PLATFORMS.has(String(body.platform)) ? String(body.platform) : 'n/a',
    title,
    description: clean(body.description, 2000),
    url: clean(body.url, 500),
    blocked_by: clean(body.blocked_by, 200),
    notes: clean(body.notes, 2000),
  }

  const { data, error } = await db().from('cc_tasks').insert(row).select('*').maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, task: data })
}

export async function PATCH(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const id = clean(body.id, 64)
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const patch: Record<string, unknown> = {}
  if (body.status !== undefined)     { if (!STATUSES.has(String(body.status)))    return NextResponse.json({ error: 'bad status' }, { status: 400 });    patch.status = body.status }
  if (body.priority !== undefined)   { if (!PRIORITIES.has(String(body.priority))) return NextResponse.json({ error: 'bad priority' }, { status: 400 }); patch.priority = body.priority }
  if (body.owner !== undefined)      { if (!OWNERS.has(String(body.owner)))       return NextResponse.json({ error: 'bad owner' }, { status: 400 });     patch.owner = body.owner }
  if (body.title !== undefined)      patch.title = clean(body.title, 200)
  if (body.description !== undefined) patch.description = clean(body.description, 2000)
  if (body.url !== undefined)        patch.url = clean(body.url, 500)
  if (body.notes !== undefined)      patch.notes = clean(body.notes, 2000)
  if (body.blocked_by !== undefined) patch.blocked_by = clean(body.blocked_by, 200)

  if (Object.keys(patch).length === 0) return NextResponse.json({ error: 'nothing to update' }, { status: 400 })

  const { data, error } = await db().from('cc_tasks').update(patch).eq('id', id).select('*').maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, task: data })
}

export async function DELETE(req: NextRequest) {
  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const { error } = await db().from('cc_tasks').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
