import { NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase-server'

export const runtime = 'nodejs'

export async function GET() {
  const admin = createSupabaseAdmin()
  const { data, error } = await admin
    .from('video_templates')
    .select('id, slug, name, category, structure, default_duration_s, created_at')
    .order('default_duration_s', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ templates: data ?? [] })
}
