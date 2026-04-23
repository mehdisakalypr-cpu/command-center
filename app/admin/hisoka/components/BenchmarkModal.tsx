'use client';
import { useState } from 'react';

type BenchmarkApiResult = {
  ok: boolean;
  error?: string;
  result?: {
    id: string;
    passed_gates: boolean;
    gate_reasons: string[];
    score: number;
    rank_if_added: number | null;
    verdict: 'top_3' | 'top_10' | 'top_20' | 'below_top_20' | 'fails_gates';
    cost_eur: number;
    scored: { name?: string; tagline?: string; category?: string };
  };
};

const VERDICT_COLOR: Record<string, string> = {
  top_3: '#6BCB77', top_10: '#C9A84C', top_20: '#FFB84C',
  below_top_20: '#9BA8B8', fails_gates: '#FF6B6B',
};

export default function BenchmarkModal({ onClose }: { onClose: () => void }) {
  const [text, setText] = useState('');
  const [res, setRes] = useState<BenchmarkApiResult | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setRes(null);
    try {
      const r = await fetch('/api/business-hunter/benchmark', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      setRes(await r.json() as BenchmarkApiResult);
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
      <div style={{ background: '#0A1A2E', padding: 24, borderRadius: 8, width: 'min(720px, 92vw)', maxHeight: '90vh', overflowY: 'auto', color: '#E6EEF7', border: '1px solid rgba(201,168,76,.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ color: '#C9A84C', margin: 0 }}>📝 Benchmark My Idea</h3>
          <button onClick={onClose} style={{ background: 'transparent', color: '#9BA8B8', border: 'none', fontSize: 18, cursor: 'pointer' }}>✕</button>
        </div>
        <textarea
          value={text}
          onChange={e => setText(e.target.value.slice(0, 5000))}
          rows={14}
          placeholder="Décris ton idée en détail (10–5000 caractères). Tu peux y mettre hypothèses, mécanique, questions, sources à investiguer — plus c'est précis, meilleur le scoring."
          style={{ width: '100%', background: '#112233', color: '#E6EEF7', border: '1px solid rgba(201,168,76,.2)', padding: 10, borderRadius: 4, fontFamily: 'inherit', fontSize: 13, resize: 'vertical', minHeight: 200 }}
        />
        <div style={{ fontSize: 11, color: text.length > 4500 ? '#FFB84C' : '#9BA8B8', textAlign: 'right', marginTop: 4 }}>
          {text.length}/5000
        </div>
        <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between' }}>
          <button
            onClick={onClose}
            style={{ background: 'transparent', color: '#9BA8B8', border: '1px solid #444', padding: '6px 14px', borderRadius: 4, cursor: 'pointer' }}
          >
            Annuler
          </button>
          <button
            onClick={submit}
            disabled={busy || text.length < 10}
            style={{ background: busy || text.length < 10 ? '#555' : '#C9A84C', color: '#0A1A2E', fontWeight: 700, border: 'none', padding: '6px 14px', borderRadius: 4, cursor: busy || text.length < 10 ? 'not-allowed' : 'pointer' }}
          >
            {busy ? '🃏 Scoring…' : '▶ Analyser'}
          </button>
        </div>

        {res && res.ok && res.result && (
          <div style={{ marginTop: 16, padding: 12, background: '#112233', borderRadius: 6, fontSize: 13 }}>
            <div style={{ color: VERDICT_COLOR[res.result.verdict] ?? '#C9A84C', fontWeight: 700, marginBottom: 6 }}>
              Verdict: {res.result.verdict.toUpperCase().replace(/_/g, ' ')}
              {res.result.rank_if_added != null && ` · rank #${res.result.rank_if_added}`}
            </div>
            <div style={{ color: '#E6EEF7', marginBottom: 4 }}>
              <strong>{res.result.scored?.name}</strong>
              {res.result.scored?.category && (
                <span style={{ color: '#9BA8B8', marginLeft: 6, fontSize: 11 }}>[{res.result.scored.category}]</span>
              )}
            </div>
            <div style={{ color: '#9BA8B8', fontSize: 12, marginBottom: 6 }}>{res.result.scored?.tagline}</div>
            <div style={{ fontSize: 11, color: '#9BA8B8' }}>
              Score {res.result.score.toFixed(2)} · Cost €{res.result.cost_eur.toFixed(3)}
            </div>
            {!res.result.passed_gates && (
              <div style={{ marginTop: 6, color: '#FF6B6B', fontSize: 11 }}>
                Gates failed: {res.result.gate_reasons.join(', ')}
              </div>
            )}
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
