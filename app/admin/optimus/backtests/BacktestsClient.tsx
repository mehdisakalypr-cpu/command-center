'use client'

import { useState, useMemo } from 'react'

const GOLD = '#C9A84C'
const BG = '#0A1A2E'
const FG = '#E6EEF7'
const DIM = '#9BA8B8'
const GOOD = '#6BCB77'
const WARN = '#FFB84C'
const BAD = '#FF6B6B'
const CARD_BG = 'rgba(201,168,76,.06)'
const BORDER = 'rgba(201,168,76,.2)'

export type BacktestRow = {
  id: string
  strategy_id: string | null
  started_at: string | null
  finished_at: string | null
  bar_range: unknown
  symbols: string[] | null
  timeframe: string | null
  params: Record<string, unknown> | null
  metrics: Record<string, unknown> | null
  status: string | null
}

function sharpeColor(v: number | null): string {
  if (v === null) return DIM
  if (v > 0.5) return GOOD
  if (v > 0) return WARN
  return BAD
}

function fmt(v: unknown, digits = 2): string {
  if (v === null || v === undefined) return '—'
  const n = Number(v)
  if (isNaN(n)) return '—'
  return n.toFixed(digits)
}

function fmtPct(v: unknown): string {
  if (v === null || v === undefined) return '—'
  const n = Number(v)
  if (isNaN(n)) return '—'
  return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`
}

function fmtElapsed(params: Record<string, unknown> | null): string {
  if (!params) return '—'
  const v = params['elapsed_s'] ?? params['elapsed_ms']
  if (v === null || v === undefined) return '—'
  let s = Number(v)
  if (isNaN(s)) return '—'
  if (params['elapsed_ms'] !== undefined) s = s / 1000
  if (s < 60) return `${s.toFixed(1)}s`
  return `${(s / 60).toFixed(1)}m`
}

function fmtDate(ts: string | null): string {
  if (!ts) return '—'
  const d = new Date(ts)
  return d.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function extractSymbol(row: BacktestRow): string {
  if (row.symbols && row.symbols.length > 0) return row.symbols[0]
  const p = row.params
  if (p) {
    if (typeof p['venue'] === 'string' && typeof p['symbol'] === 'string') {
      return `${p['venue']}:${p['symbol']}`
    }
    if (typeof p['symbol'] === 'string') return p['symbol'] as string
  }
  return '—'
}

function statusBadge(status: string | null) {
  const s = status ?? 'unknown'
  const color = s === 'done' ? GOOD : s === 'running' ? WARN : s === 'failed' ? BAD : DIM
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 4,
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: '.06em',
      textTransform: 'uppercase',
      color,
      border: `1px solid ${color}`,
      background: `${color}15`,
    }}>
      {s}
    </span>
  )
}

type KpiProps = { label: string; value: string; accent?: string; sub?: string }
function KpiCard({ label, value, accent = GOLD, sub }: KpiProps) {
  return (
    <div style={{ background: BG, borderRadius: 6, padding: 14, border: `1px solid ${BORDER}`, minWidth: 120 }}>
      <div style={{ color: GOLD, fontSize: 10, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ color: accent, fontSize: 22, fontWeight: 700 }}>{value}</div>
      {sub && <div style={{ color: DIM, fontSize: 10, marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

export default function BacktestsClient({ rows }: { rows: BacktestRow[] }) {
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterStrategy, setFilterStrategy] = useState<string>('all')
  const [filterTimeframe, setFilterTimeframe] = useState<string>('all')

  const strategies = useMemo(() => {
    const s = new Set<string>()
    for (const r of rows) if (r.strategy_id) s.add(r.strategy_id)
    return Array.from(s).sort()
  }, [rows])

  const timeframes = useMemo(() => {
    const s = new Set<string>()
    for (const r of rows) if (r.timeframe) s.add(r.timeframe)
    return Array.from(s).sort()
  }, [rows])

  const statuses = useMemo(() => {
    const s = new Set<string>()
    for (const r of rows) if (r.status) s.add(r.status)
    return Array.from(s).sort()
  }, [rows])

  const filtered = useMemo(() => {
    return rows.filter(r => {
      if (filterStatus !== 'all' && r.status !== filterStatus) return false
      if (filterStrategy !== 'all' && r.strategy_id !== filterStrategy) return false
      if (filterTimeframe !== 'all' && r.timeframe !== filterTimeframe) return false
      return true
    })
  }, [rows, filterStatus, filterStrategy, filterTimeframe])

  const doneRows = rows.filter(r => r.status === 'done')
  const sharpeValues = doneRows
    .map(r => (r.metrics ? Number(r.metrics['sharpe']) : NaN))
    .filter(v => !isNaN(v))

  const winRate = rows.length > 0
    ? Math.round((rows.filter(r => {
        const s = r.metrics ? Number(r.metrics['sharpe']) : NaN
        return !isNaN(s) && s > 0
      }).length / rows.length) * 100)
    : 0

  const avgSharpe = sharpeValues.length > 0
    ? (sharpeValues.reduce((a, b) => a + b, 0) / sharpeValues.length).toFixed(2)
    : '—'

  const bestRun = doneRows.reduce<BacktestRow | null>((best, r) => {
    const s = r.metrics ? Number(r.metrics['sharpe']) : NaN
    if (isNaN(s)) return best
    if (!best) return r
    const bs = best.metrics ? Number(best.metrics['sharpe']) : NaN
    return isNaN(bs) || s > bs ? r : best
  }, null)

  const worstRun = doneRows.reduce<BacktestRow | null>((worst, r) => {
    const s = r.metrics ? Number(r.metrics['sharpe']) : NaN
    if (isNaN(s)) return worst
    if (!worst) return r
    const ws = worst.metrics ? Number(worst.metrics['sharpe']) : NaN
    return isNaN(ws) || s < ws ? r : worst
  }, null)

  const failedCount = rows.filter(r => r.status === 'failed').length

  const selectStyle: React.CSSProperties = {
    background: '#071425',
    border: `1px solid ${BORDER}`,
    borderRadius: 6,
    color: FG,
    padding: '5px 10px',
    fontSize: 12,
    cursor: 'pointer',
  }

  return (
    <div style={{ padding: 24, color: FG, minHeight: '100vh', background: BG }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: GOLD, marginBottom: 4 }}>
        Optimus — Backtests
      </h1>
      <div style={{ fontSize: 12, color: DIM, marginBottom: 24 }}>
        100 derniers runs · trié par sharpe desc · actualisation 60s
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 28 }}>
        <KpiCard label="Total runs" value={String(rows.length)} />
        <KpiCard label="Win rate" value={`${winRate}%`} accent={winRate >= 50 ? GOOD : winRate >= 30 ? WARN : BAD} sub="sharpe > 0" />
        <KpiCard label="Avg sharpe" value={avgSharpe} accent={Number(avgSharpe) > 0.5 ? GOOD : Number(avgSharpe) > 0 ? WARN : BAD} sub="done runs" />
        <KpiCard
          label="Best sharpe"
          value={bestRun ? fmt(bestRun.metrics?.['sharpe']) : '—'}
          accent={GOOD}
          sub={bestRun ? extractSymbol(bestRun) : undefined}
        />
        <KpiCard
          label="Worst sharpe"
          value={worstRun ? fmt(worstRun.metrics?.['sharpe']) : '—'}
          accent={BAD}
          sub={worstRun ? extractSymbol(worstRun) : undefined}
        />
        <KpiCard label="Failed" value={String(failedCount)} accent={failedCount > 0 ? BAD : DIM} />
      </div>

      {/* Filtres */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: DIM, textTransform: 'uppercase', letterSpacing: '.08em' }}>Filtres :</span>

        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={selectStyle}>
          <option value="all">Tous statuts</option>
          {statuses.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <select value={filterStrategy} onChange={e => setFilterStrategy(e.target.value)} style={selectStyle}>
          <option value="all">Toutes stratégies</option>
          {strategies.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <select value={filterTimeframe} onChange={e => setFilterTimeframe(e.target.value)} style={selectStyle}>
          <option value="all">Tous timeframes</option>
          {timeframes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        {(filterStatus !== 'all' || filterStrategy !== 'all' || filterTimeframe !== 'all') && (
          <button
            type="button"
            onClick={() => { setFilterStatus('all'); setFilterStrategy('all'); setFilterTimeframe('all') }}
            style={{ ...selectStyle, color: WARN, border: `1px solid ${WARN}40`, background: `${WARN}10` }}
          >
            Réinitialiser
          </button>
        )}

        <span style={{ marginLeft: 'auto', fontSize: 11, color: DIM }}>
          {filtered.length} / {rows.length} runs
        </span>
      </div>

      {/* Légende sharpe */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 14, flexWrap: 'wrap', fontSize: 11, color: DIM }}>
        <LegendDot color={GOOD} label="Sharpe > 0.5" />
        <LegendDot color={WARN} label="Sharpe 0–0.5" />
        <LegendDot color={BAD} label="Sharpe < 0" />
      </div>

      {/* Table desktop */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }} className="bt-table">
          <thead>
            <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
              {['Symbole', 'TF', 'Stratégie', 'Statut', 'Sharpe', 'Return', 'Trades', 'Win%', 'MaxDD', 'Elapsed', 'Démarré'].map(h => (
                <th key={h} style={{ padding: '8px 10px', textAlign: h === 'Symbole' || h === 'Stratégie' ? 'left' : 'center', color: GOLD, fontWeight: 600, fontSize: 10, letterSpacing: '.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={11} style={{ padding: '32px 12px', textAlign: 'center', color: DIM, fontStyle: 'italic' }}>
                  Aucun run trouvé avec ces filtres.
                </td>
              </tr>
            ) : (
              filtered.map((row, idx) => {
                const m = row.metrics ?? {}
                const sharpe = m['sharpe'] !== undefined ? Number(m['sharpe']) : null
                const sc = sharpeColor(sharpe)
                return (
                  <tr key={row.id} style={{
                    borderBottom: `1px solid rgba(201,168,76,.07)`,
                    background: idx % 2 === 0 ? 'transparent' : 'rgba(201,168,76,.025)',
                  }}>
                    <td style={{ padding: '7px 10px', color: FG, fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {extractSymbol(row)}
                    </td>
                    <td style={{ padding: '7px 10px', textAlign: 'center', color: DIM, fontWeight: 500 }}>
                      {row.timeframe ?? '—'}
                    </td>
                    <td style={{ padding: '7px 10px', color: FG, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {row.strategy_id ?? '—'}
                    </td>
                    <td style={{ padding: '7px 10px', textAlign: 'center' }}>
                      {statusBadge(row.status)}
                    </td>
                    <td style={{ padding: '7px 10px', textAlign: 'center', color: sc, fontWeight: 700, fontSize: 13 }}>
                      {sharpe !== null ? sharpe.toFixed(3) : '—'}
                    </td>
                    <td style={{ padding: '7px 10px', textAlign: 'center', color: m['return_pct'] !== undefined ? (Number(m['return_pct']) >= 0 ? GOOD : BAD) : DIM }}>
                      {fmtPct(m['return_pct'])}
                    </td>
                    <td style={{ padding: '7px 10px', textAlign: 'center', color: DIM }}>
                      {m['trades'] !== undefined ? String(m['trades']) : '—'}
                    </td>
                    <td style={{ padding: '7px 10px', textAlign: 'center', color: DIM }}>
                      {m['win_rate'] !== undefined ? `${fmt(m['win_rate'], 1)}%` : '—'}
                    </td>
                    <td style={{ padding: '7px 10px', textAlign: 'center', color: m['max_dd_pct'] !== undefined ? (Number(m['max_dd_pct']) < -10 ? BAD : WARN) : DIM }}>
                      {m['max_dd_pct'] !== undefined ? `${fmt(m['max_dd_pct'], 1)}%` : '—'}
                    </td>
                    <td style={{ padding: '7px 10px', textAlign: 'center', color: DIM }}>
                      {fmtElapsed(row.params)}
                    </td>
                    <td style={{ padding: '7px 10px', textAlign: 'center', color: DIM, whiteSpace: 'nowrap', fontSize: 11 }}>
                      {fmtDate(row.started_at)}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="bt-cards" style={{ display: 'none', flexDirection: 'column', gap: 10 }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 16, color: DIM, fontStyle: 'italic', textAlign: 'center' }}>
            Aucun run trouvé avec ces filtres.
          </div>
        ) : (
          filtered.map(row => {
            const m = row.metrics ?? {}
            const sharpe = m['sharpe'] !== undefined ? Number(m['sharpe']) : null
            const sc = sharpeColor(sharpe)
            return (
              <div key={row.id} style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '12px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ color: FG, fontWeight: 700, fontSize: 13 }}>{extractSymbol(row)}</span>
                  {statusBadge(row.status)}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, fontSize: 11 }}>
                  <Metric label="Sharpe" value={sharpe !== null ? sharpe.toFixed(3) : '—'} color={sc} />
                  <Metric label="Return" value={fmtPct(m['return_pct'])} color={m['return_pct'] !== undefined ? (Number(m['return_pct']) >= 0 ? GOOD : BAD) : DIM} />
                  <Metric label="Trades" value={m['trades'] !== undefined ? String(m['trades']) : '—'} />
                  <Metric label="Win%" value={m['win_rate'] !== undefined ? `${fmt(m['win_rate'], 1)}%` : '—'} />
                  <Metric label="MaxDD" value={m['max_dd_pct'] !== undefined ? `${fmt(m['max_dd_pct'], 1)}%` : '—'} />
                  <Metric label="TF" value={row.timeframe ?? '—'} />
                </div>
                <div style={{ marginTop: 8, fontSize: 10, color: DIM }}>
                  {row.strategy_id ?? '—'} · {fmtDate(row.started_at)}
                </div>
              </div>
            )
          })
        )}
      </div>

      <style>{`
        @media (min-width: 640px) {
          .bt-table { display: table !important; }
          .bt-cards { display: none !important; }
        }
        @media (max-width: 639px) {
          .bt-table { display: none !important; }
          .bt-cards { display: flex !important; }
        }
      `}</style>

      <div style={{ marginTop: 24, fontSize: 10, color: DIM }}>
        <a href="/admin/optimus/coverage" style={{ color: GOLD, textDecoration: 'none' }}>← Coverage</a>
        {' · '}
        <a href="/admin/hisoka/optimus" style={{ color: GOLD, textDecoration: 'none' }}>Cockpit Optimus</a>
        {' · '}
        Revalidation automatique toutes les 60 secondes.
      </div>
    </div>
  )
}

function Metric({ label, value, color = DIM }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ color: DIM, fontSize: 9, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 2 }}>{label}</div>
      <div style={{ color, fontWeight: 700, fontSize: 12 }}>{value}</div>
    </div>
  )
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: color }} />
      {label}
    </span>
  )
}
