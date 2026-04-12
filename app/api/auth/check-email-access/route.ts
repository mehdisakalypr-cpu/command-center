import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const SITE_SLUG = 'cc'

export async function POST(req: Request) {
  const { email } = await req.json()
  if (!email) return NextResponse.json({ exists: false })

  const admin = supabaseAdmin()
  const { data: users } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const user = users?.users?.find(u => u.email?.toLowerCase() === String(email).toLowerCase())
  if (!user) return NextResponse.json({ exists: false })

  const { data } = await admin
    .from('site_access')
    .select('id')
    .eq('user_id', user.id)
    .eq('site_slug', SITE_SLUG)
    .maybeSingle()

  return NextResponse.json({ exists: !!data })
}
