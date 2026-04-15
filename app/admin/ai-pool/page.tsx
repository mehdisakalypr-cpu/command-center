/**
 * /admin/ai-pool — AI key-pool manager dashboard.
 *
 * Table per provider (keys configured, active, cooling, calls 24h/7j, cost)
 * + daily cost graph (7j) + top 10 keys + quota alerts.
 */

import { createClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { isAdmin } from '@/lib/supabase-server'
import { getPool, listProviders, stats as poolStats } from '@/lib/ai-pool/registry'

export const metadata = { title: 'AI Key Pool — Admin' }
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

export default async function AIPoolPage() {
  const admin = await isAdmin()
  if (!admin) redirect('/login?next=/admin/ai-pool')

  const sb = db()
  const now = Date.now()
  const h24 = new Date(now - 24 * 60 * 60 * 1000).toISOString()
  const d7 = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data } = await sb
    .from('ai_key_events')
    .select('provider,key_label,event,cost_usd,created_at')
    .gte('created_at', d7)
    .limit(50_000)
  const evts = (data ?? []) as EventRow[]

  const pool = poolStats()
  const providers = listProviders()

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

  // Top keys.
  const keyCounts: Record<string, { provider: string; key_label: string; calls: number; fails: number; cost: number }> = {}
  for (const e of evts) {
    const id = `${e.provider}|${e.key_label}`
    const r = keyCounts[id] ?? (keyCounts[id] = { provider: e.provider, key_label: e.key_label, calls: 0, fails: 0, cost: 0 })
    if (e.event === 'call_ok') r.calls++
    if (e.event === 'call_fail' || e.event === 'rate_limit' || e.event === 'quota_exhausted') r.fails++
    r.cost += Number(e.cost_usd || 0)
  }
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

  // Quota alerts.
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

  // Daily cost (7j).
  const dayCost: Record<string, number> = {}
  for (const e of evts) {
    const day = e.created_at.slice(0, 10)
    const c = Number(e.cost_usd || 0)
    if (c > 0) dayCost[day] = (dayCost[day] ?? 0) + c
  }
  const daily = Object.entries(dayCost).sort(([a], [b]) => a.localeCompare(b))
  const maxDaily = Math.max(0.0001, ...daily.map(([, v]) => v))

  return (
    <main style={{ padding: 24, maxWidth: 1280, margin: '0 auto', fontFamily: 'ui-sans-serif, system-ui' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>AI Key Pool</h1>
      <p style={{ color: '#64748B', marginBottom: 24 }}>
        Rotation multi-clés par provider — circuit breaker, cascade, monitoring 24h / 7j.
      </p>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Providers</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead style={{ background: '#F1F5F9' }}>
              <tr>
                <th style={thStyle}>Provider</th>
                <th style={thStyle}>Keys</th>
                <th style={thStyle}>Active</th>
                <th style={thStyle}>Cooling</th>
                <th style={thStyle}>Calls 24h</th>
                <th style={thStyle}>Calls 7j</th>
                <th style={thStyle}>Fails 24h</th>
                <th style={thStyle}>Cost 24h</th>
                <th style={thStyle}>Cost 7j</th>
              </tr>
            </thead>
            <tbody>
              {pool.map((p) => {
                const a = agg[p.provider]
                const cooling = p.cooling > 0
                return (
                  <tr key={p.provider} style={{ borderBottom: '1px solid #E2E8F0' }}>
                    <td style={tdStyle}><strong>{p.provider}</strong></td>
                    <td style={tdStyle}>{p.total}</td>
                    <td style={{ ...tdStyle, color: p.active ? '#10B981' : '#94A3B8' }}>{p.active}</td>
                    <td style={{ ...tdStyle, color: cooling ? '#F59E0B' : '#94A3B8' }}>{p.cooling}</td>
                    <td style={tdStyle}>{a.calls24}</td>
                    <td style={tdStyle}>{a.calls7}</td>
                    <td style={{ ...tdStyle, color: a.fails24 ? '#EF4444' : '#94A3B8' }}>{a.fails24}</td>
                    <td style={tdStyle}>${a.cost24.toFixed(4)}</td>
                    <td style={tdStyle}>${a.cost7.toFixed(4)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Coût quotidien (7j)</h2>
        {daily.length === 0 ? (
          <p style={{ color: '#94A3B8', fontSize: 14 }}>Aucun coût enregistré sur les 7 derniers jours.</p>
        ) : (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 160, paddingTop: 12 }}>
            {daily.map(([day, v]) => {
              const h = (v / maxDaily) * 140
              return (
                <div key={day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{ fontSize: 11, color: '#64748B' }}>${v.toFixed(3)}</div>
                  <div style={{ width: '100%', height: h, background: '#6366F1', borderRadius: 4 }} />
                  <div style={{ fontSize: 10, color: '#94A3B8' }}>{day.slice(5)}</div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Top 10 clés (7j)</h2>
        {topKeys.length === 0 ? (
          <p style={{ color: '#94A3B8', fontSize: 14 }}>Aucun appel enregistré.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead style={{ background: '#F1F5F9' }}>
              <tr>
                <th style={thStyle}>Provider</th>
                <th style={thStyle}>Key label</th>
                <th style={thStyle}>Entity</th>
                <th style={thStyle}>Tier</th>
                <th style={thStyle}>Calls</th>
                <th style={thStyle}>Fails</th>
                <th style={thStyle}>Cost</th>
              </tr>
            </thead>
            <tbody>
              {topKeys.map((k) => (
                <tr key={`${k.provider}|${k.key_label}`} style={{ borderBottom: '1px solid #E2E8F0' }}>
                  <td style={tdStyle}>{k.provider}</td>
                  <td style={tdStyle}><code style={{ fontSize: 12 }}>{k.key_label}</code></td>
                  <td style={tdStyle}>{k.entity}</td>
                  <td style={tdStyle}>{k.tier}</td>
                  <td style={tdStyle}>{k.calls}</td>
                  <td style={{ ...tdStyle, color: k.fails ? '#EF4444' : '#94A3B8' }}>{k.fails}</td>
                  <td style={tdStyle}>${k.cost.toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Alertes quota (≥ 80%)</h2>
        {alerts.length === 0 ? (
          <p style={{ color: '#10B981', fontSize: 14 }}>Aucune entité proche de son quota.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {alerts.map((a) => (
              <li key={`${a.provider}|${a.key_label}`} style={{
                padding: 12, marginBottom: 8, background: a.pct >= 100 ? '#FEE2E2' : '#FEF3C7',
                borderRadius: 6, fontSize: 14,
              }}>
                <strong>{a.provider}</strong> · {a.key_label} ({a.entity}) ·{' '}
                <span style={{ color: a.pct >= 100 ? '#B91C1C' : '#B45309' }}>
                  {a.used} / {a.quota} ({a.pct.toFixed(1)}%)
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}

const thStyle: React.CSSProperties = { padding: '8px 12px', textAlign: 'left', fontWeight: 600, fontSize: 12, color: '#475569' }
const tdStyle: React.CSSProperties = { padding: '8px 12px', fontSize: 14 }
