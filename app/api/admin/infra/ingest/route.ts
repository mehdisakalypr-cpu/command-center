/**
 * POST /api/admin/infra/ingest
 * Body: { samples: [{provider, scope, metric, value, period?}, ...] }
 * Insert batch dans infrastructure_usage_samples. Appelé par le cron qui poll
 * les provider APIs (Vercel, Supabase, Cloudflare, Resend…).
 *
 * Après insert, scan des seuils : pour chaque (provider, scope, metric) qui dépasse
 * warn_pct/critical_pct/lockout_pct, un row infrastructure_alerts est créé.
 * Si critical + auto_scale=true + delta cost ≤ cap → appel auto de /api/admin/infra/scale.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Sample = { provider: string; scope: string; metric: string; value: number; period?: string; raw?: unknown }

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

function nextTierName(provider: string, current: string): string | null {
  const ladders: Record<string, string[]> = {
    vercel: ['Hobby', 'Pro', 'Team'],
    supabase: ['Free', 'Pro', 'Team'],
    cloudflare: ['Free', 'Workers Paid', 'Pro'],
    resend: ['Free', 'Pro', 'Business'],
    sentry: ['Developer', 'Team', 'Business'],
    betterstack: ['Free', 'Team'],
  }
  const ladder = ladders[provider]
  if (!ladder) return null
  const i = ladder.indexOf(current)
  if (i === -1 || i === ladder.length - 1) return null
  return ladder[i + 1]
}

export async function POST(req: NextRequest) {
  // Accept either admin session OR a shared cron secret in X-Cron-Secret header.
  const cronSecret = process.env.CRON_SECRET
  const headerSecret = req.headers.get('x-cron-secret')
  const cronAuthed = !!(cronSecret && headerSecret && headerSecret === cronSecret)
  if (!cronAuthed) {
    const gate = await requireAdmin(); if (gate) return gate
  }
  const body = await req.json().catch(() => null) as { samples?: Sample[] } | null
  if (!body?.samples?.length) return NextResponse.json({ ok: false, error: 'missing_samples' }, { status: 400 })

  const sb = db()
  const rows = body.samples.map(s => ({
    provider: s.provider, scope: s.scope, metric: s.metric,
    value: s.value, period: s.period ?? 'mtd', raw: s.raw ?? null,
  }))
  const { error } = await sb.from('infrastructure_usage_samples').insert(rows)
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  // Evaluate thresholds — read fresh utilization view
  const { data: util } = await sb.from('v_infrastructure_utilization').select('*')
  const { data: thresholds } = await sb.from('infrastructure_thresholds').select('*')
  type U = { provider: string; scope: string; metric: string; value: number; limit_value: number | null; pct_used: number | null; current_tier: string }
  type T = { provider: string; metric: string; warn_pct: number; critical_pct: number; lockout_pct: number; auto_scale: boolean; max_auto_cost_delta_eur: number }

  const created: { alert_id: number; severity: string; auto_scaled?: boolean }[] = []
  const origin = new URL(req.url).origin

  for (const u of (util ?? []) as U[]) {
    const th = ((thresholds ?? []) as T[]).find(t => t.provider === u.provider && t.metric === u.metric)
    if (!th || u.pct_used == null) continue
    const pct = Number(u.pct_used)
    let severity: 'warn' | 'critical' | 'lockout' | null = null
    if (pct >= th.lockout_pct) severity = 'lockout'
    else if (pct >= th.critical_pct) severity = 'critical'
    else if (pct >= th.warn_pct) severity = 'warn'
    if (!severity) continue

    // Dedup: don't re-alert if an unresolved alert with same metric+scope+severity exists in last 6h
    const { data: existing } = await sb.from('infrastructure_alerts')
      .select('id').eq('provider', u.provider).eq('scope', u.scope).eq('metric', u.metric).eq('severity', severity)
      .is('resolved_at', null).gte('triggered_at', new Date(Date.now() - 6 * 3600 * 1000).toISOString())
      .limit(1).maybeSingle()
    if (existing) continue

    const { data: alert } = await sb.from('infrastructure_alerts').insert({
      provider: u.provider, scope: u.scope, metric: u.metric,
      value: u.value, limit_value: u.limit_value ?? 0, pct_used: pct,
      severity, action_taken: 'notified',
    }).select().single()
    if (!alert) continue

    const entry: typeof created[number] = { alert_id: alert.id, severity }

    // Auto-scale on critical if allowed
    if (severity === 'critical' && th.auto_scale) {
      const target = nextTierName(u.provider, u.current_tier)
      if (target) {
        const r = await fetch(`${origin}/api/admin/infra/scale`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Ofa-Auto': '1',
            ...(process.env.INTERNAL_API_SECRET ? { 'X-Internal-Auth': process.env.INTERNAL_API_SECRET } : {}),
          },
          body: JSON.stringify({
            provider: u.provider, scope: u.scope, target_tier_name: target,
            reason: `Auto-scale ${u.metric}=${u.value} (${pct.toFixed(1)}% of ${u.current_tier} cap)`,
            alert_id: alert.id,
          }),
        })
        if (r.ok) entry.auto_scaled = true
      }
    }

    created.push(entry)
  }

  return NextResponse.json({ ok: true, samples_inserted: rows.length, alerts_created: created })
}
