/**
 * GET /api/gitnexus[?repo&query]
 * Reads the latest snapshot from `gitnexus_snapshots` (pushed by VPS cron).
 * No longer spawns `gitnexus` CLI or reads VPS filesystem — fully portable.
 *
 * If repo+query are provided we return `unsupported` since live cypher
 * cannot run from Vercel. The UI should use the snapshot view only.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// RLS on gitnexus_snapshots is locked-by-default (0 policies). Use service_role
// server-side to read; the proxy.ts already requires an authenticated user.
const sb = () => createClient(
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } },
)

export async function GET(req: NextRequest) {
  const repo = req.nextUrl.searchParams.get('repo')
  const query = req.nextUrl.searchParams.get('query')

  if (repo && query) {
    return NextResponse.json({
      error: 'live cypher unavailable on this runtime; use snapshot view',
      markdown: '',
      row_count: 0,
    })
  }

  try {
    const { data } = await sb()
      .from('gitnexus_snapshots')
      .select('*')
      .order('captured_at', { ascending: false })
      .limit(1)

    const row = data?.[0]
    if (!row) {
      return NextResponse.json(
        { repos: [], generatedAt: null, source: 'none', error: 'no gitnexus snapshot yet — waiting for VPS cron' },
        { status: 200 },
      )
    }

    return NextResponse.json({
      repos: row.repos ?? [],
      generatedAt: row.captured_at,
      source: row.source ?? 'vps-cron',
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ repos: [], generatedAt: null, source: 'error', error: msg }, { status: 200 })
  }
}
