import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Refresh Command Center dashboards: cc_content_jobs counts + items_per_day
 * 7-day rolling average. Called daily by Vercel cron at 06:07 UTC and manually
 * via "Actualiser" buttons on /admin/overview, /admin/simulator, /admin/tasks.
 *
 * Gated by CRON_SECRET when set (Bearer header). Manual triggers from the
 * browser bypass the bearer because the user is admin-auth'd via cookies, so
 * we fall through to a service-role write.
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  const fromCron = Boolean(secret) && authHeader === `Bearer ${secret}`

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return NextResponse.json({ error: 'missing_supabase_env' }, { status: 500 })
  const db = createClient(url, key, { auth: { persistSession: false } })

  // Re-run per-job recipes to refresh completed/total counts. Recipes are
  // declared in code (no dynamic SQL strings executed at runtime).
  const { data: jobs } = await db.from('cc_content_jobs').select('id, project, job_key, completed')
  const out: Array<{ job_key: string; before: number; after: number; total: number | null }> = []

  for (const job of jobs ?? []) {
    const recipe = RECIPES[`${job.project}.${job.job_key}`]
    if (!recipe) continue
    try {
      const [{ count: total }, { count: done }] = await Promise.all([
        recipe.total(db),
        recipe.done(db),
      ])
      const before = Number(job.completed ?? 0)
      const after  = Number(done ?? 0)
      const delta  = after - before
      await db.from('cc_content_jobs').update({
        total_target: total ?? 0,
        completed: after,
        last_refreshed_at: new Date().toISOString(),
        last_delta_today: delta,
        updated_at: new Date().toISOString(),
      }).eq('id', job.id)
      out.push({ job_key: job.job_key, before, after, total: total ?? null })
    } catch (e) {
      out.push({ job_key: job.job_key, before: -1, after: -1, total: null })
    }
  }

  return NextResponse.json({
    ok: true,
    source: fromCron ? 'cron' : 'manual',
    refreshed_at: new Date().toISOString(),
    jobs: out,
  })
}

// GET mirrors POST so Vercel cron (which issues GET) still works.
export async function GET(req: NextRequest) {
  return POST(req)
}

// Broad shape — RECIPES only need `.from().select().eq().not()` so we untype.
/* eslint-disable @typescript-eslint/no-explicit-any */
type SB = any
type CountQuery = (db: SB) => Promise<{ count: number | null }>

const headOpts = { head: true, count: 'exact' as const }

async function cnt(q: { count?: number | null }): Promise<{ count: number | null }> {
  return { count: q.count ?? 0 }
}

const RECIPES: Record<string, { total: CountQuery; done: CountQuery }> = {
  'ftg.ftg_product_country_content_fr': {
    total: async (db) => cnt(await db.from('ftg_product_country_pair_agg').select('*', headOpts)),
    done:  async (db) => cnt(await db.from('ftg_product_country_content').select('*', headOpts).eq('lang', 'fr').eq('status', 'ready')),
  },
  'ftg.ftg_product_country_content_en': {
    total: async (db) => cnt(await db.from('ftg_product_country_pair_agg').select('*', headOpts)),
    done:  async (db) => cnt(await db.from('ftg_product_country_content').select('*', headOpts).eq('lang', 'en').eq('status', 'ready')),
  },
  'ftg.ftg_product_country_videos': {
    total: async (db) => cnt(await db.from('ftg_product_country_pair_agg').select('*', headOpts)),
    done:  async (db) => cnt(await db.from('ftg_product_country_videos').select('*', headOpts).eq('status', 'ready')),
  },
  'ftg.entrepreneur_demos_enriched': {
    total: async (db) => cnt(await db.from('entrepreneur_demos').select('*', headOpts)),
    done:  async (db) => cnt(await db.from('entrepreneur_demos').select('*', headOpts).not('email', 'is', null)),
  },
  'ftg.entrepreneur_demos_outreach_sent': {
    total: async (db) => cnt(await db.from('entrepreneur_demos').select('*', headOpts)),
    done:  async (db) => cnt(await db.from('entrepreneur_demos').select('*', headOpts).not('outreach_sent_at', 'is', null)),
  },
  'ftg.entrepreneurs_directory_email': {
    total: async (db) => cnt(await db.from('entrepreneurs_directory').select('*', headOpts)),
    done:  async (db) => cnt(await db.from('entrepreneurs_directory').select('*', headOpts).not('email', 'is', null)),
  },
  'ftg.ftg_business_plans': {
    total: async (db) => cnt(await db.from('business_plans').select('*', headOpts)),
    done:  async (db) => cnt(await db.from('business_plans').select('*', headOpts)),
  },
  'ofa.ofa_sites_published': {
    total: async (db) => cnt(await db.from('generated_sites').select('*', headOpts)),
    done:  async (db) => cnt(await db.from('generated_sites').select('*', headOpts).eq('status', 'claimed')),
  },
}
