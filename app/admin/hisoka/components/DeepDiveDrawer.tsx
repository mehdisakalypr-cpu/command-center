'use client';
import { useEffect, useState } from 'react';

type IdeaFull = {
  name: string;
  tagline: string;
  rationale?: string;
  autonomy_acquisition?: number;
  autonomy_content_ops?: number;
  autonomy_fulfillment?: number;
  autonomy_support?: number;
  autonomy_billing?: number;
  autonomy_compliance?: number;
  mrr_median?: unknown;
  assets_leveraged?: string[];
  leverage_configs?: unknown[];
  optimal_config?: unknown;
  leverage_elasticity?: string;
};

export default function DeepDiveDrawer({ ideaId, onClose }: { ideaId: string; onClose: () => void }) {
  const [data, setData] = useState<{ idea?: IdeaFull } | null>(null);
  useEffect(() => {
    fetch(`/api/business-hunter/ideas/${ideaId}`).then(r => r.json()).then(setData);
  }, [ideaId]);

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, width: 520, height: '100vh',
      background: '#0A1A2E', borderLeft: '1px solid rgba(201,168,76,.2)',
      padding: 20, overflowY: 'auto', color: '#E6EEF7', zIndex: 100,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ color: '#C9A84C', fontWeight: 700, fontSize: 18 }}>{data?.idea?.name ?? '…'}</h2>
        <button onClick={onClose} style={{ background: 'transparent', color: '#9BA8B8', border: 'none', fontSize: 20, cursor: 'pointer' }}>✕</button>
      </div>
      {!data && <div>Loading…</div>}
      {data?.idea && (
        <>
          <div style={{ color: '#9BA8B8', fontSize: 13, marginBottom: 12 }}>{data.idea.tagline}</div>
          <section style={{ marginBottom: 16 }}>
            <div style={{ color: '#C9A84C', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Autonomy (6 dims)</div>
            {(['acquisition', 'content_ops', 'fulfillment', 'support', 'billing', 'compliance'] as const).map(d => {
              const key = `autonomy_${d}` as keyof IdeaFull;
              const v = Number(data.idea?.[key] ?? 0);
              return (
                <div key={d} style={{ marginBottom: 4, fontSize: 12 }}>
                  <span style={{ display: 'inline-block', width: 120 }}>{d}</span>
                  <span style={{ display: 'inline-block', width: 200, background: '#112233', height: 8, borderRadius: 4, verticalAlign: 'middle' }}>
                    <span style={{ display: 'block', width: `${v * 100}%`, background: v >= 0.9 ? '#6BCB77' : '#FFB84C', height: 8, borderRadius: 4 }} />
                  </span>
                  <span style={{ marginLeft: 8 }}>{v.toFixed(2)}</span>
                </div>
              );
            })}
          </section>
          <section style={{ marginBottom: 16 }}>
            <div style={{ color: '#C9A84C', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>MRR Median (€/mo)</div>
            <pre style={{ background: '#112233', padding: 10, borderRadius: 4, fontSize: 11, overflowX: 'auto' }}>
              {JSON.stringify(data.idea.mrr_median, null, 2)}
            </pre>
          </section>
          {data.idea.leverage_configs && Array.isArray(data.idea.leverage_configs) && (
            <section style={{ marginBottom: 16 }}>
              <div style={{ color: '#C9A84C', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                Leverage Configs
                {data.idea.leverage_elasticity && (
                  <span style={{ marginLeft: 8, fontSize: 10, padding: '2px 6px', background: '#112233', borderRadius: 4, color: '#9BA8B8' }}>
                    {data.idea.leverage_elasticity} elasticity
                  </span>
                )}
              </div>
              <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ color: '#9BA8B8' }}>
                    {['', 'Launch', 'Workers', 'Leverage', 'IRR y3', 'Risk'].map(h => (
                      <th key={h} style={{ padding: '4px 6px', textAlign: 'left', fontWeight: 500 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(data.idea.leverage_configs as Array<{ label: string; launch_eur: number; workers: number; leverage: number; irr_y3_pct?: number; risk_score?: number }>).map(c => {
                    const optimalConfig = data.idea?.optimal_config as { label?: string } | undefined;
                    const isOptimal = optimalConfig != null && optimalConfig.label === c.label;
                    return (
                      <tr key={c.label} style={{ borderTop: '1px solid rgba(255,255,255,.05)', background: isOptimal ? 'rgba(201,168,76,.08)' : 'transparent' }}>
                        <td style={{ padding: '4px 6px' }}>{isOptimal ? '⭐ ' : ''}{c.label}</td>
                        <td style={{ padding: '4px 6px' }}>€{c.launch_eur}</td>
                        <td style={{ padding: '4px 6px' }}>{c.workers}</td>
                        <td style={{ padding: '4px 6px', fontWeight: 600 }}>{Number(c.leverage).toFixed(1)}×</td>
                        <td style={{ padding: '4px 6px' }}>{c.irr_y3_pct != null ? `${Number(c.irr_y3_pct).toFixed(0)}%` : '—'}</td>
                        <td style={{ padding: '4px 6px' }}>{c.risk_score != null ? Number(c.risk_score).toFixed(2) : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
          )}
          <section style={{ marginBottom: 16 }}>
            <div style={{ color: '#C9A84C', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Rationale</div>
            <div style={{ fontSize: 12, color: '#9BA8B8' }}>{data.idea.rationale}</div>
          </section>
          <section>
            <div style={{ color: '#C9A84C', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Bricks reused</div>
            <div style={{ fontSize: 11 }}>{(data.idea.assets_leveraged ?? []).map((b: string) => (
              <span key={b} style={{ display: 'inline-block', margin: '2px 4px 2px 0', padding: '2px 8px', background: '#112233', borderRadius: 4 }}>+{b}</span>
            ))}</div>
          </section>
        </>
      )}
    </div>
  );
}
