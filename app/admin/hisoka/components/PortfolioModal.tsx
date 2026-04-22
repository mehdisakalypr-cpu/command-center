'use client';
import { useState } from 'react';

type PortfolioApiResult = {
  ok: boolean;
  error?: string;
  result?: {
    id: string;
    allocations: Array<{
      idea_slug: string;
      idea_name?: string;
      category?: string;
      launch_eur: number;
      workers_assigned: number;
      config_label: string;
      expected_mrr_y3_eur: number;
      rationale: string;
    }>;
    expected_arr_y3_eur: number;
    annualized_return_pct: number;
    sp500_delta_pct: number;
    max_drawdown_pct: number;
    diversification_score: number;
    comparison_table: {
      hysa:      { annual_pct: number; arr_y3_eur: number };
      bonds:     { annual_pct: number; arr_y3_eur: number };
      sp500:     { annual_pct: number; arr_y3_eur: number };
      portfolio: { annual_pct: number; arr_y3_eur: number };
    };
    rationale: string;
    cost_eur: number;
  };
};

export default function PortfolioModal({ onClose }: { onClose: () => void }) {
  const [capital, setCapital] = useState(10000);
  const [workers, setWorkers] = useState(2);
  const [risk, setRisk] = useState<'conservative' | 'balanced' | 'aggressive'>('balanced');
  const [res, setRes] = useState<PortfolioApiResult | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setRes(null);
    try {
      const r = await fetch('/api/business-hunter/portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ availableCapitalEur: capital, maxExtraWorkers: workers, riskAppetite: risk }),
      });
      setRes(await r.json() as PortfolioApiResult);
    } catch (e) {
      setRes({ ok: false, error: String(e) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: '#0A1A2E', padding: 24, borderRadius: 8, width: 720, maxHeight: '90vh', overflowY: 'auto', color: '#E6EEF7', border: '1px solid rgba(201,168,76,.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ color: '#C9A84C', margin: 0 }}>💼 Portfolio Mode</h3>
          <button onClick={onClose} style={{ background: 'transparent', color: '#9BA8B8', border: 'none', fontSize: 18, cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
          <label style={{ fontSize: 12, color: '#9BA8B8' }}>
            Available capital (€)
            <input
              type="number" min={0} max={100000} step={500} value={capital}
              onChange={e => setCapital(Number(e.target.value))}
              style={{ width: '100%', background: '#112233', color: '#E6EEF7', border: '1px solid rgba(201,168,76,.2)', padding: '6px 8px', borderRadius: 4, marginTop: 4 }}
            />
          </label>
          <label style={{ fontSize: 12, color: '#9BA8B8' }}>
            Max extra workers
            <input
              type="number" min={0} max={10} step={1} value={workers}
              onChange={e => setWorkers(Number(e.target.value))}
              style={{ width: '100%', background: '#112233', color: '#E6EEF7', border: '1px solid rgba(201,168,76,.2)', padding: '6px 8px', borderRadius: 4, marginTop: 4 }}
            />
          </label>
          <label style={{ fontSize: 12, color: '#9BA8B8' }}>
            Risk appetite
            <select
              value={risk}
              onChange={e => setRisk(e.target.value as typeof risk)}
              style={{ width: '100%', background: '#112233', color: '#E6EEF7', border: '1px solid rgba(201,168,76,.2)', padding: '6px 8px', borderRadius: 4, marginTop: 4 }}
            >
              <option value="conservative">Conservative</option>
              <option value="balanced">Balanced</option>
              <option value="aggressive">Aggressive</option>
            </select>
          </label>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <button
            onClick={onClose}
            style={{ background: 'transparent', color: '#9BA8B8', border: '1px solid #444', padding: '6px 14px', borderRadius: 4, cursor: 'pointer' }}
          >
            Annuler
          </button>
          <button
            onClick={submit}
            disabled={busy}
            style={{ background: busy ? '#555' : '#C9A84C', color: '#0A1A2E', fontWeight: 700, border: 'none', padding: '6px 14px', borderRadius: 4, cursor: busy ? 'not-allowed' : 'pointer' }}
          >
            {busy ? '💼 Optimizing…' : '▶ Propose allocation'}
          </button>
        </div>

        {res && res.ok && res.result && (
          <div style={{ marginTop: 8, padding: 14, background: '#112233', borderRadius: 6, fontSize: 12 }}>
            <div style={{ marginBottom: 10, color: '#C9A84C', fontWeight: 600 }}>
              Allocation ({res.result.allocations.length} ideas)
            </div>
            <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ color: '#9BA8B8' }}>
                  {['Idea', 'Launch', 'Workers', 'Config', 'MRR y3', 'Why'].map(h => (
                    <th key={h} style={{ padding: '4px 6px', textAlign: 'left', fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {res.result.allocations.map(a => (
                  <tr key={a.idea_slug} style={{ borderTop: '1px solid rgba(255,255,255,.05)' }}>
                    <td style={{ padding: '4px 6px', fontWeight: 600 }}>
                      {a.idea_name ?? a.idea_slug}
                      <div style={{ color: '#9BA8B8', fontSize: 10 }}>{a.category}</div>
                    </td>
                    <td style={{ padding: '4px 6px' }}>€{a.launch_eur}</td>
                    <td style={{ padding: '4px 6px' }}>{a.workers_assigned}</td>
                    <td style={{ padding: '4px 6px', color: '#9BA8B8' }}>{a.config_label}</td>
                    <td style={{ padding: '4px 6px', color: '#6BCB77' }}>
                      €{Math.round(a.expected_mrr_y3_eur).toLocaleString('fr-FR')}
                    </td>
                    <td style={{ padding: '4px 6px', color: '#9BA8B8', fontSize: 10 }}>{a.rationale}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ marginTop: 14, color: '#C9A84C', fontWeight: 600, fontSize: 12 }}>
              Benchmark vs Markets (3-year horizon)
            </div>
            <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse', marginTop: 6 }}>
              <thead>
                <tr style={{ color: '#9BA8B8' }}>
                  {['Vehicle', 'Annual', 'ARR Y3 (€)'].map(h => (
                    <th key={h} style={{ padding: '4px 6px', textAlign: 'left', fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const ct = res.result!.comparison_table;
                  const rows: [string, number, number, string][] = [
                    ['HYSA 2%',        ct.hysa.annual_pct,      ct.hysa.arr_y3_eur,      '#9BA8B8'],
                    ['Bonds 4%',       ct.bonds.annual_pct,     ct.bonds.arr_y3_eur,     '#9BA8B8'],
                    ['S&P 500',        ct.sp500.annual_pct,     ct.sp500.arr_y3_eur,     '#FFB84C'],
                    ['This portfolio', ct.portfolio.annual_pct, ct.portfolio.arr_y3_eur, '#6BCB77'],
                  ];
                  return rows.map(([label, pct, arr, color]) => (
                    <tr key={label} style={{ borderTop: '1px solid rgba(255,255,255,.05)' }}>
                      <td style={{ padding: '4px 6px', color }}>{label}</td>
                      <td style={{ padding: '4px 6px' }}>{Number(pct).toFixed(1)}%</td>
                      <td style={{ padding: '4px 6px' }}>€{Math.round(Number(arr)).toLocaleString('fr-FR')}</td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>

            <div style={{ marginTop: 8, fontSize: 11, color: '#9BA8B8' }}>
              Δ vs S&P 500:{' '}
              <strong style={{ color: res.result.sp500_delta_pct >= 0 ? '#6BCB77' : '#FF6B6B' }}>
                {res.result.sp500_delta_pct >= 0 ? '+' : ''}{res.result.sp500_delta_pct.toFixed(1)} pp
              </strong>
              {' '}· Diversification: {(res.result.diversification_score * 100).toFixed(0)}%
              {' '}· Max drawdown: {res.result.max_drawdown_pct.toFixed(0)}%
              {' '}· Cost: €{res.result.cost_eur.toFixed(3)}
            </div>

            <div style={{ marginTop: 12, fontSize: 12, color: '#E6EEF7', fontStyle: 'italic' }}>
              {res.result.rationale}
            </div>
          </div>
        )}

        {res && !res.ok && (
          <div style={{ marginTop: 12, padding: 10, background: '#330', borderRadius: 4, color: '#FF6B6B', fontSize: 12 }}>
            ✗ {res.error}
          </div>
        )}
      </div>
    </div>
  );
}
