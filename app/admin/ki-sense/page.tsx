/**
 * /admin/ki-sense — autonomous flywheel health dashboard.
 *
 * Pull-only snapshot of:
 *   - cron health (Hisoka harvest / AAM forge / Auto-push / Kaizen)
 *   - flywheel throughput (ideas generated / pushed / forged / cost)
 *   - anomalies (red/orange/blue signals)
 *   - LLM pool (24h per provider)
 *
 * No push alerts in v1. User visits this page to know if anything derails.
 */

import { redirect } from 'next/navigation'
import { createSupabaseAdmin, isAdmin } from '@/lib/supabase-server'
import {
  buildKiSenseSummary,
  type Anomaly,
  type CronHealth,
  type CronStatus,
  type FlywheelHealth,
  type ProviderPoolHealth,
} from '@/lib/ki-sense/summary'

export const metadata = { title: 'Ki Sense — Admin' }
export const dynamic = 'force-dynamic'

const COLORS = {
  ok: '#6BCB77',
  warn: '#FFB84C',
  fail: '#FF6B6B',
  unknown: '#9BA8B8',
  gold: '#C9A84C',
  text: '#E6EEF7',
  muted: '#9BA8B8',
  bg: '#0A1A2E',
  border: 'rgba(201,168,76,.15)',
} as const

function statusColor(s: CronStatus | ProviderPoolHealth['status']): string {
  if (s === 'ok') return COLORS.ok
  if (s === 'warn') return COLORS.warn
  if (s === 'fail' || s === 'degraded') return COLORS.fail
  return COLORS.unknown
}

function statusLabel(s: CronStatus): string {
  if (s === 'ok') return 'OK'
  if (s === 'warn') return 'WARN'
  if (s === 'fail') return 'FAIL'
  return '–'
}

function fmtAgo(hours: number | null): string {
  if (hours === null) return '–'
  if (hours < 1) return `${Math.round(hours * 60)} min`
  if (hours < 48) return `${hours.toFixed(1)} h`
  return `${(hours / 24).toFixed(1)} j`
}

function severityColor(s: Anomaly['severity']): string {
  if (s === 'critical') return COLORS.fail
  if (s === 'warn') return COLORS.warn
  return '#4DA3FF'
}

function CronHealthTable({ crons }: { crons: CronHealth[] }) {
  return (
    <div
      style={{
        background: COLORS.bg,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 6,
        overflow: 'hidden',
      }}
    >
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ background: 'rgba(255,255,255,.03)' }}>
            {['Cron', 'Schedule', 'Dernier run', 'Statut', 'Runs 7j', 'Échecs 7j', 'Coût 7j'].map((h) => (
              <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: COLORS.gold }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {crons.map((c) => (
            <tr key={c.key} style={{ borderTop: `1px solid ${COLORS.border}` }}>
              <td style={{ padding: '8px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14 }}>{c.icon}</span>
                  <div>
                    <div style={{ color: COLORS.text }}>{c.label}</div>
                    <div style={{ color: COLORS.muted, fontSize: 10, fontFamily: 'ui-monospace, monospace' }}>{c.path}</div>
                  </div>
                </div>
              </td>
              <td style={{ padding: '8px 12px', color: COLORS.muted, fontFamily: 'ui-monospace, monospace' }}>{c.schedule}</td>
              <td style={{ padding: '8px 12px', color: COLORS.muted }}>
                {c.lastRunAt ? (
                  <>
                    il y a {fmtAgo(c.hoursSinceLastRun)}
                    <div style={{ fontSize: 10 }}>
                      {new Date(c.lastRunAt).toLocaleString('fr-FR')}
                    </div>
                  </>
                ) : (
                  <span style={{ color: COLORS.unknown }}>jamais</span>
                )}
              </td>
              <td style={{ padding: '8px 12px' }}>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    borderRadius: 4,
                    background: `${statusColor(c.status)}22`,
                    color: statusColor(c.status),
                    fontWeight: 600,
                    fontSize: 11,
                  }}
                >
                  {statusLabel(c.status)}
                </span>
                {c.note && (
                  <div style={{ color: COLORS.muted, fontSize: 10, marginTop: 4 }}>{c.note}</div>
                )}
              </td>
              <td style={{ padding: '8px 12px', color: COLORS.text }}>{c.runs7d}</td>
              <td style={{ padding: '8px 12px', color: c.fails7d > 0 ? COLORS.fail : COLORS.text }}>{c.fails7d}</td>
              <td style={{ padding: '8px 12px', color: COLORS.text }}>€{c.cost7dEur.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div
      style={{
        background: COLORS.bg,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 6,
        padding: '12px 14px',
        minWidth: 140,
        flex: '1 1 140px',
      }}
    >
      <div style={{ color: COLORS.muted, fontSize: 11, marginBottom: 4 }}>{label}</div>
      <div style={{ color: color ?? COLORS.text, fontSize: 22, fontWeight: 700 }}>{value}</div>
      {sub && <div style={{ color: COLORS.muted, fontSize: 10, marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

function FlywheelBlock({ f }: { f: FlywheelHealth }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
      <StatCard label="Idées générées (7j)" value={f.ideasGenerated7d} sub={`${f.ideasTotalActive} actives au total`} />
      <StatCard
        label="Poussées à Minato (7j)"
        value={f.pushedToMinato7d}
        sub={f.highAutonomyReady > 0 ? `${f.highAutonomyReady} ≥0.92 en attente` : 'aucune en attente'}
        color={f.highAutonomyReady >= 3 ? COLORS.warn : undefined}
      />
      <StatCard
        label="Forge attempts (7j)"
        value={f.forgeAttempts7d}
        sub={`${f.forgePromoted7d} promues · ${f.forgeFailed7d} échecs`}
      />
      <StatCard
        label="Coût flywheel (7j)"
        value={`€${(f.forgeCost7dEur + f.hunterCost7dEur).toFixed(2)}`}
        sub={`hunt €${f.hunterCost7dEur.toFixed(2)} · forge €${f.forgeCost7dEur.toFixed(2)}`}
        color={(f.forgeCost7dEur + f.hunterCost7dEur) > 7 ? COLORS.warn : undefined}
      />
      <StatCard
        label="Autonomy top 20"
        value={f.avgAutonomyTop20 === null ? '–' : f.avgAutonomyTop20.toFixed(2)}
        sub="moyenne ≥0.92 = prête push"
      />
    </div>
  )
}

function AnomaliesList({ anomalies }: { anomalies: Anomaly[] }) {
  if (!anomalies.length) {
    return (
      <div
        style={{
          padding: 16,
          background: COLORS.bg,
          border: `1px solid ${COLORS.ok}44`,
          borderRadius: 6,
          color: COLORS.ok,
          fontSize: 13,
        }}
      >
        ✓ Aucune anomalie détectée — le flywheel tourne normalement.
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {anomalies.map((a) => {
        const color = severityColor(a.severity)
        return (
          <div
            key={a.code}
            style={{
              background: COLORS.bg,
              border: `1px solid ${color}55`,
              borderLeft: `3px solid ${color}`,
              borderRadius: 6,
              padding: '10px 14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <span
                style={{
                  background: `${color}22`,
                  color,
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 4,
                  letterSpacing: '.05em',
                }}
              >
                {a.severity.toUpperCase()}
              </span>
              <span style={{ color: COLORS.text, fontSize: 13, fontWeight: 600 }}>{a.title}</span>
            </div>
            <div style={{ color: COLORS.muted, fontSize: 12, marginLeft: 2 }}>{a.detail}</div>
            <div style={{ color: '#56657A', fontSize: 10, marginTop: 4, fontFamily: 'ui-monospace, monospace' }}>{a.code}</div>
          </div>
        )
      })}
    </div>
  )
}

function LlmPoolTable({ pool }: { pool: ProviderPoolHealth[] }) {
  if (!pool.length) {
    return (
      <div style={{ color: COLORS.muted, fontSize: 12, padding: 12 }}>
        Aucun événement LLM sur 24h (table <code>ai_key_events</code> vide ou absente).
      </div>
    )
  }
  return (
    <div style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 6, overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ background: 'rgba(255,255,255,.03)' }}>
            {['Provider', 'Statut', 'Calls OK 24h', 'Fails', 'Rate-limit', 'Quota vide', 'Clés distinctes', 'Coût 24h'].map((h) => (
              <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: COLORS.gold }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {pool.map((p) => (
            <tr key={p.provider} style={{ borderTop: `1px solid ${COLORS.border}` }}>
              <td style={{ padding: '8px 12px', color: COLORS.text, fontFamily: 'ui-monospace, monospace' }}>{p.provider}</td>
              <td style={{ padding: '8px 12px' }}>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    borderRadius: 4,
                    background: `${statusColor(p.status)}22`,
                    color: statusColor(p.status),
                    fontWeight: 600,
                    fontSize: 11,
                  }}
                >
                  {p.status.toUpperCase()}
                </span>
              </td>
              <td style={{ padding: '8px 12px', color: COLORS.text }}>{p.calls24h}</td>
              <td style={{ padding: '8px 12px', color: p.fails24h > 0 ? COLORS.fail : COLORS.text }}>{p.fails24h}</td>
              <td style={{ padding: '8px 12px', color: p.rateLimit24h > 0 ? COLORS.warn : COLORS.text }}>{p.rateLimit24h}</td>
              <td style={{ padding: '8px 12px', color: p.quotaExhausted24h > 0 ? COLORS.fail : COLORS.text }}>{p.quotaExhausted24h}</td>
              <td style={{ padding: '8px 12px', color: COLORS.text }}>{p.distinctKeys24h}</td>
              <td style={{ padding: '8px 12px', color: COLORS.text }}>${p.cost24hUsd.toFixed(4)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default async function KiSensePage() {
  const authed = await isAdmin()
  if (!authed) redirect('/login?next=/admin/ki-sense')

  const admin = createSupabaseAdmin()
  const summary = await buildKiSenseSummary(admin)

  const criticalCount = summary.anomalies.filter((a) => a.severity === 'critical').length
  const warnCount = summary.anomalies.filter((a) => a.severity === 'warn').length

  return (
    <div style={{ padding: 24, color: COLORS.text }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: COLORS.gold, marginBottom: 4 }}>
          🧘 Ki Sense — Flywheel Health
        </h1>
        <div style={{ fontSize: 13, color: COLORS.muted }}>
          <em>&quot;Ressentir le ki, c&apos;est sentir le dérapage avant qu&apos;il ne se matérialise.&quot;</em>
          {' · '}
          {summary.anomalies.length === 0 ? (
            <span style={{ color: COLORS.ok }}>tout est calme</span>
          ) : (
            <>
              {criticalCount > 0 && <span style={{ color: COLORS.fail, fontWeight: 600 }}>{criticalCount} critique{criticalCount > 1 ? 's' : ''}</span>}
              {criticalCount > 0 && warnCount > 0 && ' · '}
              {warnCount > 0 && <span style={{ color: COLORS.warn, fontWeight: 600 }}>{warnCount} warning{warnCount > 1 ? 's' : ''}</span>}
            </>
          )}
          {' · '}
          snapshot {new Date(summary.generatedAt).toLocaleString('fr-FR')}
        </div>
      </div>

      {/* Anomalies first — c'est le but de la page */}
      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, color: COLORS.gold, marginBottom: 10 }}>
          Anomalies détectées
        </h2>
        <AnomaliesList anomalies={summary.anomalies} />
      </section>

      {/* Flywheel stats */}
      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, color: COLORS.gold, marginBottom: 10 }}>
          Flywheel (7j)
        </h2>
        <FlywheelBlock f={summary.flywheel} />
      </section>

      {/* Cron health */}
      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, color: COLORS.gold, marginBottom: 10 }}>
          Cron health
        </h2>
        <CronHealthTable crons={summary.crons} />
      </section>

      {/* LLM pool */}
      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, color: COLORS.gold, marginBottom: 10 }}>
          LLM pool (24h)
        </h2>
        <LlmPoolTable pool={summary.llmPool} />
      </section>

      <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 32, borderTop: `1px solid ${COLORS.border}`, paddingTop: 12 }}>
        Source JSON :{' '}
        <a href="/api/ki-sense/summary" style={{ color: COLORS.gold }}>
          /api/ki-sense/summary
        </a>
        {' · '}
        Pull-only — push alerts (Resend / Aria bridge) = chantier suivant.
      </div>
    </div>
  )
}
