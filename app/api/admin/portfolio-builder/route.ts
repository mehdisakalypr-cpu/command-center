import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '@/lib/auth'
import { PORTFOLIO_PRODUCTS, PAGE_TYPES, type PageType } from '@/lib/portfolio/products'

export const dynamic = 'force-dynamic'

const sb = () =>
  createClient(
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

export async function GET() {
  const denied = await requireAuth()
  if (denied) return denied
  const s = sb()

  const [jobsRes] = await Promise.all([
    s.from('portfolio_build_jobs')
      .select('id, product_slug, page_type, status, attempts, last_error, generated_path, html_url, provider, cost_usd, created_at, finished_at')
      .order('id', { ascending: false })
      .limit(200),
  ])

  return NextResponse.json({
    products: PORTFOLIO_PRODUCTS.map((p) => ({
      slug: p.slug,
      name: p.name,
      tagline: p.tagline,
      colorPrimary: p.colorPrimary,
      colorAccent: p.colorAccent,
      baseUrl: p.baseUrl,
      repoOwner: p.repoOwner,
      repoName: p.repoName,
    })),
    pageTypes: PAGE_TYPES,
    jobs: jobsRes.data ?? [],
    error: jobsRes.error?.message ?? null,
  })
}

export async function POST(req: Request) {
  const denied = await requireAuth()
  if (denied) return denied

  const body = (await req.json().catch(() => ({}))) as {
    action?: 'enqueue' | 'retry' | 'cancel'
    product_slug?: string
    page_types?: PageType[]
    job_id?: number
    brief?: string
  }
  const s = sb()

  if (body.action === 'enqueue') {
    if (!body.product_slug) return NextResponse.json({ ok: false, error: 'product_slug required' }, { status: 400 })
    const product = PORTFOLIO_PRODUCTS.find((p) => p.slug === body.product_slug)
    if (!product) return NextResponse.json({ ok: false, error: 'unknown product_slug' }, { status: 400 })

    const requested: PageType[] = (body.page_types && body.page_types.length > 0)
      ? body.page_types
      : (PAGE_TYPES as PageType[])

    const frozen = new Set(product.frozenPages ?? [])
    const types = requested.filter((t) => !frozen.has(t))

    if (types.length === 0) {
      return NextResponse.json({ ok: false, error: 'all requested page types are frozen for this product' }, { status: 400 })
    }

    const rows = types.map((pageType) => ({
      product_slug: body.product_slug,
      page_type: pageType,
      brief: body.brief ? { text: body.brief } : {},
      status: 'pending',
      priority: 50,
    }))

    // Use upsert with onConflict to skip duplicates of (product_slug, page_type, status='pending').
    const { data, error } = await s.from('portfolio_build_jobs')
      .insert(rows)
      .select('id, product_slug, page_type')
    if (error) {
      return NextResponse.json({ ok: false, error: error.message, hint: 'duplicate pending row?' }, { status: 400 })
    }
    return NextResponse.json({ ok: true, enqueued: data?.length ?? 0, ids: (data ?? []).map((r) => r.id) })
  }

  if (body.action === 'retry') {
    if (!body.job_id) return NextResponse.json({ ok: false, error: 'job_id required' }, { status: 400 })
    const { error } = await s.from('portfolio_build_jobs')
      .update({ status: 'pending', last_error: null, claimed_at: null, attempts: 0 })
      .eq('id', body.job_id)
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true })
  }

  if (body.action === 'cancel') {
    if (!body.job_id) return NextResponse.json({ ok: false, error: 'job_id required' }, { status: 400 })
    const { error } = await s.from('portfolio_build_jobs').delete().eq('id', body.job_id)
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ ok: false, error: 'unknown action' }, { status: 400 })
}
