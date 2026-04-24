import { createSupabaseAdmin } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

const GOLD = '#C9A84C'
const BG = '#0A1A2E'
const FG = '#E6EEF7'
const DIM = '#9BA8B8'
const GOOD = '#6BCB77'
const WARN = '#FFB84C'
const BAD = '#FF6B6B'
const BORDER = 'rgba(201,168,76,.2)'
const CARD_BG = 'rgba(201,168,76,.06)'

const VENUES = ['binance', 'bybit', 'hyperliquid'] as const
type Venue = typeof VENUES[number]

const FEATURES = [
  { key: 'spread_bps_mean', label: 'Spread (bps)', fmt: (v: number) => v.toFixed(2), color: (v: number) => v > 5 ? BAD : v > 2 ? WARN : GOOD },
  { key: 'microprice_drift', label: 'µPrice drift', fmt: (v: number) => v.toFixed(4), color: (v: number) => Math.abs(v) > 0.001 ? WARN : GOOD },
  { key: 'imb_1_mean', label: 'Imb L1', fmt: (v: number) => v.toFixed(3), color: (v: number) => Math.abs(v) > 0.3 ? GOOD : WARN },
  { key: 'imb_5_mean', label: 'Imb L5', fmt: (v: number) => v.toFixed(3), color: (v: number) => Math.abs(v) > 0.25 ? GOOD : WARN },
  { key: 'buy_vol_ratio', label: 'Buy ratio', fmt: (v: number) => (v * 100).toFixed(1) + '%', color: (v: number) => v > 0.55 ? GOOD : v < 0.45 ? BAD : WARN },
  { key: 'realized_vol', label: 'RVol', fmt: (v: number) => v.toFixed(4), color: (v: number) => v > 0.002 ? BAD : GOOD },
  { key: 'trade_count', label: 'Trades', fmt: (v: number) => Math.round(v).toLocaleString('fr-FR'), color: (v: number) => v > 100 ? GOOD : v > 20 ? WARN : BAD },
] as const

type FeatureKey = typeof FEATURES[number]['key']

type L2Row = {
  venue_id: string
  symbol: string
  ts: string
  spread_bps_mean: number | null
  microprice_drift: number | null
  imb_1_mean: number | null
  imb_5_mean: number | null
  buy_vol_ratio: number | null
  realized_vol: number | null
  trade_count: number | null
  snapshot_count: number | null
}

type PivotEntry = {
  symbol: string
  last_ts: string | null
  age_seconds: number | null
  snapshot_count: number
  values: Partial<Record<FeatureKey, number | null>>
}

function formatAge(secs: number | null): string {
  if (secs === null) return '—'
  if (secs < 60) return `${secs}s`
  if (secs < 3600) return `${Math.floor(secs / 60)}m`
  return `${Math.floor(secs / 3600)}h`
}

function freshnessColor(age: number | null): string {
  if (age === null) return DIM
  if (age < 120) return GOOD
  if (age < 600) return WARN
  return BAD
}

function formatTs(ts: string | null): string {
  if (!ts) return '—'
  const d = new Date(ts)
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export default async function OptimusL2FeaturesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>
}) {
  const params = await searchParams
  const venue: Venue = (VENUES.includes(params.venue as Venue) ? params.venue : 'binance') as Venue

  const admin = createSupabaseAdmin()

  const cutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString()

  const { data: raw, error } = await admin
    .from('optimus_l2_features_1m')
    .select('venue_id, symbol, ts, spread_bps_mean, microprice_drift, imb_1_mean, imb_5_mean, buy_vol_ratio, realized_vol, trade_count, snapshot_count')
    .eq('venue_id', venue)
    .gte('ts', cutoff)
    .order('ts', { ascending: false })

  const nowMs = Date.now()

  const symbolMap = new Map<string, PivotEntry>()

  if (!error && raw) {
    for (const row of raw as L2Row[]) {
      if (!symbolMap.has(row.symbol)) {
        const tsMs = row.ts ? new Date(row.ts).getTime() : null
        const age = tsMs !== null ? Math.round((nowMs - tsMs) / 1000) : null
        symbolMap.set(row.symbol, {
          symbol: row.symbol,
          last_ts: row.ts,
          age_seconds: age,
          snapshot_count: row.snapshot_count ?? 0,
          values: {
            spread_bps_mean: row.spread_bps_mean,
            microprice_drift: row.microprice_drift,
            imb_1_mean: row.imb_1_mean,
            imb_5_mean: row.imb_5_mean,
            buy_vol_ratio: row.buy_vol_ratio,
            realized_vol: row.realized_vol,
            trade_count: row.trade_count,
          },
        })
      }
    }
  }

  const pivotRows = Array.from(symbolMap.values()).sort((a, b) => a.symbol.localeCompare(b.symbol))

  const tableError = error && (error.code === '42P01' || error.code === 'PGRST116')

  return (
    <div style={{ padding: 24, color: FG, minHeight: '100vh', background: BG }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: GOLD, margin: 0 }}>
          Optimus — L2 Features (Live)
        </h1>
        <a
          href={`/admin/optimus/l2-features?venue=${venue}`}
          style={{
            display: 'inline-block',
            padding: '6px 14px',
            background: 'rgba(201,168,76,.12)',
            border: `1px solid ${BORDER}`,
            borderRadius: 6,
            color: GOLD,
            fontSize: 12,
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          Rafraichir
        </a>
      </div>

      <div style={{ fontSize: 12, color: DIM, marginBottom: 20 }}>
        Moyennes glissantes sur les 5 dernières minutes — par symbol × feature. Dernière minute ingérée.
      </div>

      {/* Venue selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {VENUES.map(v => (
          <a
            key={v}
            href={`/admin/optimus/l2-features?venue=${v}`}
            style={{
              padding: '5px 14px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 600,
              textDecoration: 'none',
              background: v === venue ? GOLD : 'transparent',
              color: v === venue ? BG : GOLD,
              border: `1px solid ${BORDER}`,
              letterSpacing: '.04em',
              textTransform: 'uppercase',
            }}
          >
            {v}
          </a>
        ))}
      </div>

      {tableError ? (
        <div style={{ padding: 16, background: 'rgba(255,107,107,.1)', color: BAD, borderRadius: 6, border: `1px solid ${BAD}`, fontSize: 13 }}>
          Table <code>optimus_l2_features_1m</code> absente ou inaccessible (code {error?.code}).
          Vérifier la migration Supabase.
        </div>
      ) : pivotRows.length === 0 ? (
        <div style={{ padding: 16, background: CARD_BG, color: DIM, borderRadius: 6, border: `1px solid ${BORDER}`, fontSize: 13, fontStyle: 'italic' }}>
          Aucune donnée pour <strong style={{ color: GOLD }}>{venue}</strong> dans les 5 dernières minutes.
          Le daemon Optimus alimente-t-il ce venue ?
        </div>
      ) : (
        <>
          {/* Légende */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap', fontSize: 11, color: DIM }}>
            <LegendDot color={GOOD} label="Bon" />
            <LegendDot color={WARN} label="Attention" />
            <LegendDot color={BAD} label="Critique" />
          </div>

          {/* Table desktop */}
          <div style={{ overflowX: 'auto' }}>
            <table
              className="optimus-l2-table"
              style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, display: 'none' }}
            >
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <th style={thStyle}>Symbol</th>
                  <th style={thStyle}>Age</th>
                  <th style={thStyle}>Heure</th>
                  <th style={thStyle}>Snapshots</th>
                  {FEATURES.map(f => (
                    <th key={f.key} style={thStyle}>{f.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pivotRows.map((row, idx) => (
                  <tr
                    key={row.symbol}
                    style={{
                      borderBottom: `1px solid rgba(201,168,76,.08)`,
                      background: idx % 2 === 0 ? 'transparent' : 'rgba(201,168,76,.03)',
                    }}
                  >
                    <td style={{ padding: '7px 12px', color: GOLD, fontWeight: 600, whiteSpace: 'nowrap', letterSpacing: '.02em' }}>
                      {row.symbol}
                    </td>
                    <td style={{ padding: '7px 10px', textAlign: 'center', color: freshnessColor(row.age_seconds), fontWeight: 700 }}>
                      {formatAge(row.age_seconds)}
                    </td>
                    <td style={{ padding: '7px 10px', textAlign: 'center', color: DIM, fontSize: 11 }}>
                      {formatTs(row.last_ts)}
                    </td>
                    <td style={{ padding: '7px 10px', textAlign: 'center', color: DIM, fontSize: 11 }}>
                      {row.snapshot_count}
                    </td>
                    {FEATURES.map(f => {
                      const val = row.values[f.key as FeatureKey]
                      return (
                        <td key={f.key} style={{ padding: '6px 10px', textAlign: 'center' }}>
                          {val !== null && val !== undefined ? (
                            <span style={{
                              color: f.color(val),
                              fontWeight: 700,
                              fontSize: 12,
                            }}>
                              {f.fmt(val)}
                            </span>
                          ) : (
                            <span style={{ color: DIM }}>—</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="optimus-l2-cards" style={{ flexDirection: 'column', gap: 12, display: 'none' }}>
            {pivotRows.map(row => (
              <div key={row.symbol} style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '12px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ color: GOLD, fontWeight: 700, fontSize: 14 }}>{row.symbol}</span>
                  <span style={{ color: freshnessColor(row.age_seconds), fontWeight: 700, fontSize: 12 }}>
                    {formatAge(row.age_seconds)} · {formatTs(row.last_ts)}
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                  {FEATURES.map(f => {
                    const val = row.values[f.key as FeatureKey]
                    return (
                      <div key={f.key}>
                        <div style={{ color: DIM, fontSize: 9, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 2 }}>{f.label}</div>
                        <div style={{ color: val !== null && val !== undefined ? f.color(val) : DIM, fontWeight: 700, fontSize: 13 }}>
                          {val !== null && val !== undefined ? f.fmt(val) : '—'}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <style>{`
        @media (min-width: 640px) {
          .optimus-l2-table { display: table !important; }
          .optimus-l2-cards { display: none !important; }
        }
        @media (max-width: 639px) {
          .optimus-l2-table { display: none !important; }
          .optimus-l2-cards { display: flex !important; }
        }
      `}</style>

      <div style={{ marginTop: 24, fontSize: 10, color: DIM }}>
        <a href="/admin/optimus/coverage" style={{ color: GOLD, textDecoration: 'none' }}>← Coverage</a>
        {' · '}
        <a href="/admin/optimus/backtests" style={{ color: GOLD, textDecoration: 'none' }}>Backtests</a>
        {' · '}
        Venue : <strong style={{ color: GOLD }}>{venue}</strong> · Fenêtre : 5 min glissantes.
      </div>
    </div>
  )
}

const thStyle: React.CSSProperties = {
  padding: '8px 10px',
  textAlign: 'center' as const,
  color: GOLD,
  fontWeight: 600,
  fontSize: 11,
  letterSpacing: '.06em',
  textTransform: 'uppercase' as const,
  whiteSpace: 'nowrap' as const,
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: color }} />
      {label}
    </span>
  )
}
