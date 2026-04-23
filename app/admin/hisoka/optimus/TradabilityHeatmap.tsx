'use client';
import { useEffect, useMemo, useState } from 'react';

const GOLD = '#C9A84C';
const DIM = '#9BA8B8';
const GOOD = '#6BCB77';
const WARN = '#FFB84C';
const BAD = '#FF6B6B';

type Row = {
  venue_id: string;
  symbol: string;
  timeframe: string;
  tradability_score: number;
  verdict: 'tradable' | 'marginal' | 'untradable';
  car_pct: number;
  errc: number;
  computed_at: string;
};

export default function TradabilityHeatmap() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'tradable' | 'marginal' | 'untradable'>('tradable');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/optimus/tradability/recompute')
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        if (j.ok) setRows(j.rows ?? []);
        else setError(j.error ?? 'unknown');
      })
      .catch((e) => !cancelled && setError(String(e)));
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!rows) return [];
    if (filter === 'all') return rows;
    return rows.filter((r) => r.verdict === filter);
  }, [rows, filter]);

  const counts = useMemo(() => {
    if (!rows) return { tradable: 0, marginal: 0, untradable: 0 };
    return {
      tradable: rows.filter((r) => r.verdict === 'tradable').length,
      marginal: rows.filter((r) => r.verdict === 'marginal').length,
      untradable: rows.filter((r) => r.verdict === 'untradable').length,
    };
  }, [rows]);

  function verdictColor(v: Row['verdict']) {
    return v === 'tradable' ? GOOD : v === 'marginal' ? WARN : BAD;
  }
  function verdictIcon(v: Row['verdict']) {
    return v === 'tradable' ? '🟢' : v === 'marginal' ? '🟡' : '🔴';
  }

  return (
    <div style={{ marginTop: 20 }}>
      <h2 style={{ color: GOLD, fontSize: 15, marginBottom: 8 }}>🎯 Tradabilité des marchés</h2>
      <div style={{ fontSize: 11, color: DIM, marginBottom: 10 }}>
        Score 0-100 par (venue, symbol, timeframe) — calculé sur 1000 dernières bougies.
        Le bot ne trade que verdict=tradable (≥60).
      </div>

      {error && (
        <div style={{ color: BAD, fontSize: 11, marginBottom: 10 }}>⚠ {error}</div>
      )}

      {!rows && !error && <div style={{ color: DIM, fontSize: 12 }}>Chargement…</div>}

      {rows && (
        <>
          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            {(['tradable', 'marginal', 'untradable', 'all'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setFilter(v)}
                style={{
                  background: filter === v ? GOLD : 'transparent',
                  color: filter === v ? '#0A1A2E' : DIM,
                  border: `1px solid ${filter === v ? GOLD : '#1A2940'}`,
                  padding: '3px 10px',
                  borderRadius: 3,
                  fontSize: 10,
                  cursor: 'pointer',
                }}
              >
                {v === 'all' ? `Tous (${rows.length})` : `${verdictIcon(v)} ${v} (${counts[v]})`}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div style={{ color: DIM, fontSize: 12, padding: 20, textAlign: 'center' }}>
              Aucun marché dans ce verdict — recompute cron pas encore tourné, ou pas d&apos;univers actif.
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                gap: 6,
              }}
            >
              {filtered.map((r) => (
                <div
                  key={`${r.venue_id}:${r.symbol}:${r.timeframe}`}
                  style={{
                    background: '#0A1A2E',
                    border: `1px solid ${verdictColor(r.verdict)}`,
                    borderRadius: 4,
                    padding: 8,
                    fontSize: 10,
                  }}
                  title={`CAR ${r.car_pct}% · ERRC ${r.errc}× · computed ${new Date(r.computed_at).toLocaleString('fr-FR')}`}
                >
                  <div style={{ color: DIM, fontSize: 9 }}>{r.venue_id} · {r.timeframe}</div>
                  <div style={{ color: '#E6EEF7', fontSize: 11, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.symbol}
                  </div>
                  <div
                    style={{
                      color: verdictColor(r.verdict),
                      fontSize: 16,
                      fontWeight: 700,
                      marginTop: 4,
                    }}
                  >
                    {verdictIcon(r.verdict)} {r.tradability_score.toFixed(0)}
                  </div>
                  <div style={{ color: DIM, fontSize: 9, marginTop: 2 }}>
                    CAR {r.car_pct.toFixed(0)}% · ERRC {r.errc.toFixed(1)}×
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
