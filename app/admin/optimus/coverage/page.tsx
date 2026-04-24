import { createSupabaseAdmin } from '@/lib/supabase-server';

export const revalidate = 30;

const GOLD = '#C9A84C';
const BG = '#0A1A2E';
const FG = '#E6EEF7';
const DIM = '#9BA8B8';
const GOOD = '#6BCB77';
const WARN = '#FFB84C';
const BAD = '#FF6B6B';
const CARD_BG = 'rgba(201,168,76,.06)';
const BORDER = 'rgba(201,168,76,.2)';

const TIMEFRAMES = ['1m', '5m', '15m', '1h', '4h', '1d'] as const;

const TF_SECONDS: Record<string, number> = {
  '1s': 1, '5s': 5, '15s': 15,
  '1m': 60, '5m': 300, '15m': 900,
  '1h': 3600, '4h': 14400, '1d': 86400,
};

type CoverageRow = {
  venue_id: string;
  symbol: string;
  timeframe: string;
  last_ts: string | null;
  row_count: number;
  age_seconds: number | null;
};

type PivotRow = {
  venue_id: string;
  symbol: string;
  cells: Record<string, CoverageRow | null>;
};

function freshnessColor(age: number | null, tf: string): string {
  if (age === null) return DIM;
  const tfSec = TF_SECONDS[tf] ?? 60;
  if (age < tfSec * 2) return GOOD;
  if (age < tfSec * 6) return WARN;
  return BAD;
}

function formatAge(age: number | null): string {
  if (age === null) return '—';
  if (age < 60) return `${age}s`;
  if (age < 3600) return `${Math.floor(age / 60)}m`;
  if (age < 86400) return `${Math.floor(age / 3600)}h`;
  return `${Math.floor(age / 86400)}j`;
}

function formatLastTs(ts: string | null): string {
  if (!ts) return '—';
  const d = new Date(ts);
  const now = Date.now();
  const diff = now - d.getTime();
  if (diff < 60000) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  return d.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default async function OptimusCoveragePage() {
  const admin = createSupabaseAdmin();

  const { data: raw, error } = await admin
    .from('optimus_coverage_summary')
    .select('venue_id, symbol, timeframe, last_ts, row_count, age_seconds')
    .order('venue_id', { ascending: true })
    .order('symbol', { ascending: true });

  if (error && error.code === '42P01') {
    return (
      <div style={{ padding: 24, color: FG, background: BG, minHeight: '100vh' }}>
        <h1 style={{ color: GOLD, fontSize: 22, fontWeight: 700, marginBottom: 16 }}>
          Optimus — Coverage
        </h1>
        <div style={{ padding: 16, background: 'rgba(255,107,107,.1)', color: BAD, borderRadius: 6, border: `1px solid ${BAD}` }}>
          Vue <code>optimus_coverage_summary</code> absente. Appliquer la migration{' '}
          <code>20260423170000_optimus_coverage_view.sql</code> via Management API.
        </div>
      </div>
    );
  }

  const rows: CoverageRow[] = (raw ?? []) as CoverageRow[];

  const totalRows = rows.reduce((s, r) => s + (r.row_count ?? 0), 0);
  const activeVenues = new Set(rows.map(r => r.venue_id)).size;
  const activeSymbols = new Set(rows.map(r => `${r.venue_id}::${r.symbol}`)).size;
  const validAges = rows.map(r => r.age_seconds).filter((a): a is number => a !== null);
  const avgLag = validAges.length > 0
    ? Math.round(validAges.reduce((s, a) => s + a, 0) / validAges.length)
    : null;

  const pivotMap = new Map<string, PivotRow>();
  for (const row of rows) {
    const key = `${row.venue_id}::${row.symbol}`;
    if (!pivotMap.has(key)) {
      pivotMap.set(key, { venue_id: row.venue_id, symbol: row.symbol, cells: {} });
    }
    pivotMap.get(key)!.cells[row.timeframe] = row;
  }

  const pivotRows = Array.from(pivotMap.values()).sort((a, b) => {
    if (a.venue_id !== b.venue_id) return a.venue_id.localeCompare(b.venue_id);
    return a.symbol.localeCompare(b.symbol);
  });

  const grouped = new Map<string, PivotRow[]>();
  for (const row of pivotRows) {
    if (!grouped.has(row.venue_id)) grouped.set(row.venue_id, []);
    grouped.get(row.venue_id)!.push(row);
  }

  return (
    <div style={{ padding: 24, color: FG, minHeight: '100vh', background: BG }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: GOLD, marginBottom: 6 }}>
        Optimus — Coverage temps réel
      </h1>
      <div style={{ fontSize: 12, color: DIM, marginBottom: 24 }}>
        Fraîcheur des bougies par venue × symbol × timeframe — actualisation ~30s.
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 28 }}>
        <KpiCard label="Total rows" value={totalRows.toLocaleString('fr-FR')} />
        <KpiCard label="Venues actives" value={String(activeVenues)} />
        <KpiCard label="Symboles actifs" value={String(activeSymbols)} />
        <KpiCard label="Lag moyen" value={formatAge(avgLag)} accent={avgLag !== null && avgLag < 120 ? GOOD : avgLag !== null && avgLag < 600 ? WARN : BAD} />
      </div>

      {/* Légende */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 18, flexWrap: 'wrap', fontSize: 11, color: DIM }}>
        <LegendDot color={GOOD} label="Frais (<2× tf)" />
        <LegendDot color={WARN} label="Retard (<6× tf)" />
        <LegendDot color={BAD} label="Obsolète (≥6× tf)" />
        <LegendDot color={DIM} label="Aucune donnée" />
      </div>

      {/* Desktop table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: 12,
          display: 'none',
        }} className="optimus-coverage-table">
          <thead>
            <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
              <th style={{ padding: '8px 12px', textAlign: 'left', color: GOLD, fontWeight: 600, fontSize: 11, letterSpacing: '.06em', textTransform: 'uppercase' }}>
                Venue
              </th>
              <th style={{ padding: '8px 12px', textAlign: 'left', color: GOLD, fontWeight: 600, fontSize: 11, letterSpacing: '.06em', textTransform: 'uppercase' }}>
                Symbole
              </th>
              {TIMEFRAMES.map(tf => (
                <th key={tf} style={{ padding: '8px 10px', textAlign: 'center', color: GOLD, fontWeight: 600, fontSize: 11, letterSpacing: '.06em', textTransform: 'uppercase', minWidth: 90 }}>
                  {tf}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pivotRows.length === 0 ? (
              <tr>
                <td colSpan={2 + TIMEFRAMES.length} style={{ padding: '24px 12px', textAlign: 'center', color: DIM, fontStyle: 'italic' }}>
                  Aucune donnée dans optimus_candles.
                </td>
              </tr>
            ) : (
              pivotRows.map((row, idx) => {
                const isFirst = idx === 0 || pivotRows[idx - 1].venue_id !== row.venue_id;
                return (
                  <tr key={`${row.venue_id}::${row.symbol}`} style={{
                    borderBottom: `1px solid rgba(201,168,76,.08)`,
                    background: idx % 2 === 0 ? 'transparent' : 'rgba(201,168,76,.03)',
                  }}>
                    <td style={{ padding: '7px 12px', color: isFirst ? GOLD : 'transparent', fontWeight: 600, fontSize: 11, whiteSpace: 'nowrap' }}>
                      {isFirst ? row.venue_id : ''}
                    </td>
                    <td style={{ padding: '7px 12px', color: FG, fontWeight: 500, whiteSpace: 'nowrap', letterSpacing: '.02em' }}>
                      {row.symbol}
                    </td>
                    {TIMEFRAMES.map(tf => {
                      const cell = row.cells[tf] ?? null;
                      const color = freshnessColor(cell?.age_seconds ?? null, tf);
                      return (
                        <td key={tf} style={{ padding: '6px 10px', textAlign: 'center' }}>
                          {cell ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                              <span style={{ color, fontWeight: 700, fontSize: 13 }}>{formatAge(cell.age_seconds)}</span>
                              <span style={{ color: DIM, fontSize: 10 }}>{cell.row_count.toLocaleString('fr-FR')} rows</span>
                              <span style={{ color: DIM, fontSize: 9 }}>{formatLastTs(cell.last_ts)}</span>
                            </div>
                          ) : (
                            <span style={{ color: DIM, fontSize: 11 }}>—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Table wrapper with CSS media query via className + style tag */}
      <style>{`
        @media (min-width: 640px) {
          .optimus-coverage-table { display: table !important; }
          .optimus-coverage-cards { display: none !important; }
        }
        @media (max-width: 639px) {
          .optimus-coverage-table { display: none !important; }
          .optimus-coverage-cards { display: flex !important; }
        }
      `}</style>

      {/* Mobile cards */}
      <div className="optimus-coverage-cards" style={{ flexDirection: 'column', gap: 12, display: 'none' }}>
        {pivotRows.length === 0 ? (
          <div style={{ padding: 16, color: DIM, fontStyle: 'italic', textAlign: 'center' }}>
            Aucune donnée dans optimus_candles.
          </div>
        ) : (
          Array.from(grouped.entries()).map(([venue, vRows]) => (
            <div key={venue} style={{ marginBottom: 8 }}>
              <div style={{ color: GOLD, fontWeight: 700, fontSize: 13, marginBottom: 8, padding: '4px 0', borderBottom: `1px solid ${BORDER}` }}>
                {venue}
              </div>
              {vRows.map(row => (
                <div key={row.symbol} style={{
                  background: CARD_BG,
                  border: `1px solid ${BORDER}`,
                  borderRadius: 8,
                  padding: '10px 14px',
                  marginBottom: 8,
                }}>
                  <div style={{ color: FG, fontWeight: 600, fontSize: 13, marginBottom: 8 }}>{row.symbol}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    {TIMEFRAMES.map(tf => {
                      const cell = row.cells[tf] ?? null;
                      const color = freshnessColor(cell?.age_seconds ?? null, tf);
                      return (
                        <div key={tf} style={{ textAlign: 'center' }}>
                          <div style={{ color: DIM, fontSize: 9, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 2 }}>{tf}</div>
                          {cell ? (
                            <>
                              <div style={{ color, fontWeight: 700, fontSize: 13 }}>{formatAge(cell.age_seconds)}</div>
                              <div style={{ color: DIM, fontSize: 9 }}>{cell.row_count.toLocaleString('fr-FR')}</div>
                            </>
                          ) : (
                            <div style={{ color: DIM, fontSize: 11 }}>—</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      <div style={{ marginTop: 20, fontSize: 10, color: DIM }}>
        <a href="/admin/hisoka/optimus" style={{ color: GOLD, textDecoration: 'none' }}>← Cockpit Optimus</a>
        {' · '}
        <a href="/admin/optimus/l2-features" style={{ color: GOLD, textDecoration: 'none' }}>L2 Features Live →</a>
        {' · '}
        Revalidation automatique toutes les 30 secondes.
      </div>
    </div>
  );
}

function KpiCard({ label, value, accent = GOLD }: { label: string; value: string; accent?: string }) {
  return (
    <div style={{ background: BG, borderRadius: 6, padding: 14, border: `1px solid ${BORDER}` }}>
      <div style={{ color: GOLD, fontSize: 10, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ color: accent, fontSize: 24, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: color }} />
      {label}
    </span>
  );
}
