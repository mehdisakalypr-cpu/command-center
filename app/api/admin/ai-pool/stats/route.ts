/**
 * GET /api/admin/ai-pool/stats
 * Returns aggregated stats for the admin dashboard:
 *   - per-provider pool state (keys configured, active, cooling)
 *   - per-provider totals over 24h / 7j (calls, fails, cost)
 *   - daily cost by provider (7j)
 *   - top 10 keys by usage (with entity_label)
 *   - quota alerts (entity at 80%+ of estimated monthly quota)
 *
 * Gated via requireAdmin().
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/supabase-server'
import { getPool, listProviders, stats as poolStats } from '@/lib/ai-pool/registry'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

type EventRow = {
  provider: string
  key_label: string
  event: string
  cost_usd: number | null
  created_at: string
}

export async function GET() {
  const gate = await requireAdmin()
  if (gate) return gate

  const sb = db()
  const now = Date.now()
  const h24 = new Date(now - 24 * 60 * 60 * 1000).toISOString()
  const d7 = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString()

  // Last 7 days of events — bounded by service_role query.
  const { data: events7d, error } = await sb
    .from('ai_key_events')
    .select('provider,key_label,event,cost_usd,created_at')
    .gte('created_at', d7)
    .limit(50_000)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  const evts = (events7d ?? []) as EventRow[]

  // Pool config (runtime, from env).
  const pool = poolStats()
  const providers = listProviders()

  // Aggregates per provider × window.
  type Agg = { calls24: number; calls7: number; fails24: number; fails7: number; cost24: number; cost7: number }
  const agg: Record<string, Agg> = {}
  for (const p of providers) agg[p] = { calls24: 0, calls7: 0, fails24: 0, fails7: 0, cost24: 0, cost7: 0 }

  for (const e of evts) {
    const a = agg[e.provider] ?? (agg[e.provider] = { calls24: 0, calls7: 0, fails24: 0, fails7: 0, cost24: 0, cost7: 0 })
    const in24 = e.created_at >= h24
    if (e.event === 'call_ok') { a.calls7++; if (in24) a.calls24++ }
    if (e.event === 'call_fail' || e.event === 'rate_limit' || e.event === 'quota_exhausted') {
      a.fails7++; if (in24) a.fails24++
    }
    const c = Number(e.cost_usd || 0)
    if (c > 0) { a.cost7 += c; if (in24) a.cost24 += c }
  }

  // Per-provider rows for the main table.
  const rows = pool.map((p) => ({
    provider: p.provider,
    total_keys: p.total,
    active: p.active,
    cooling: p.cooling,
    uses_process: p.uses,
    fails_process: p.fails,
    ...agg[p.provider],
  }))

  // Daily cost by provider (7j).
  const dayCost: Record<string, Record<string, number>> = {}
  for (const e of evts) {
    const day = e.created_at.slice(0, 10)
    const c = Number(e.cost_usd || 0)
    if (c <= 0) continue
    dayCost[day] = dayCost[day] ?? {}
    dayCost[day][e.provider] = (dayCost[day][e.provider] ?? 0) + c
  }
  const daily = Object.entries(dayCost)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, byProv]) => ({ day, ...byProv }))

  // Top keys by calls (7j).
  const keyCounts: Record<string, { provider: string; key_label: string; calls: number; fails: number; cost: number }> = {}
  for (const e of evts) {
    const k = `${e.provider}|${e.key_label}`
    const rec = keyCounts[k] ?? (keyCounts[k] = { provider: e.provider, key_label: e.key_label, calls: 0, fails: 0, cost: 0 })
    if (e.event === 'call_ok') rec.calls++
    if (e.event === 'call_fail' || e.event === 'rate_limit' || e.event === 'quota_exhausted') rec.fails++
    rec.cost += Number(e.cost_usd || 0)
  }
  // Enrich with entity_label from runtime pool.
  const keyMeta: Record<string, { entity: string; quota: number; tier: string }> = {}
  for (const p of providers) {
    for (const k of getPool(p)) {
      keyMeta[`${p}|${k.label}`] = { entity: k.entityLabel, quota: k.quotaMonthly, tier: k.tier }
    }
  }
  const topKeys = Object.entries(keyCounts)
    .map(([id, v]) => ({ ...v, ...(keyMeta[id] ?? { entity: 'unknown', quota: 0, tier: 'free' }) }))
    .sort((a, b) => b.calls - a.calls)
    .slice(0, 10)

  // Quota alerts (80%+ of monthly quota).
  const monthStart = new Date(new Date().toISOString().slice(0, 7) + '-01T00:00:00Z').toISOString()
  const monthCounts: Record<string, number> = {}
  for (const e of evts) {
    if (e.created_at < monthStart) continue
    if (e.event !== 'call_ok') continue
    const id = `${e.provider}|${e.key_label}`
    monthCounts[id] = (monthCounts[id] ?? 0) + 1
  }
  const alerts: { provider: string; key_label: string; entity: string; used: number; quota: number; pct: number }[] = []
  for (const [id, used] of Object.entries(monthCounts)) {
    const meta = keyMeta[id]
    if (!meta || !meta.quota) continue
    const pct = (used / meta.quota) * 100
    if (pct >= 80) {
      const [provider, key_label] = id.split('|')
      alerts.push({ provider, key_label, entity: meta.entity, used, quota: meta.quota, pct })
    }
  }
  alerts.sort((a, b) => b.pct - a.pct)

  return NextResponse.json({
    providers: rows,
    daily,
    topKeys,
    alerts,
    generatedAt: new Date().toISOString(),
  })
}
