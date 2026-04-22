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
