'use client';
import { useState } from 'react';
import type { ScoredIdea } from '@/lib/hisoka/types';

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
    scored: ScoredIdea;
  };
};

const VERDICT_COLOR: Record<string, string> = {
  top_3: '#6BCB77', top_10: '#C9A84C', top_20: '#FFB84C',
  below_top_20: '#9BA8B8', fails_gates: '#FF6B6B',
};

const LLC_GATE_COLOR: Record<string, string> = {
  none: '#6BCB77', needs_llc: '#FFB84C', post_expat: '#FFB84C', blocked: '#FF6B6B',
};

function fmtEur(n: number | undefined): string {
  if (n == null) return '—';
  if (n >= 1000) return `€${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return `€${n.toFixed(0)}`;
}

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

  const scored = res?.result?.scored;
  const mrr = scored?.mrr_median;
  const cons = scored?.mrr_conservative;
  const opt = scored?.mrr_optimistic;

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: '#0A1A2E', padding: 24, borderRadius: 8, width: 'min(820px, 94vw)', maxHeight: '92vh', overflowY: 'auto', color: '#E6EEF7', border: '1px solid rgba(201,168,76,.2)' }}>
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

        {res && res.ok && res.result && scored && (
          <div style={{ marginTop: 16, display: 'grid', gap: 10, fontSize: 13 }}>
            <div style={{ padding: 12, background: '#112233', borderRadius: 6 }}>
              <div style={{ color: VERDICT_COLOR[res.result.verdict] ?? '#C9A84C', fontWeight: 700, marginBottom: 6, fontSize: 15 }}>
                Verdict: {res.result.verdict.toUpperCase().replace(/_/g, ' ')}
                {res.result.rank_if_added != null && ` · rank #${res.result.rank_if_added}`}
              </div>
              <div style={{ color: '#E6EEF7', marginBottom: 4 }}>
                <strong>{scored.name}</strong>
                {scored.category && <span style={{ color: '#9BA8B8', marginLeft: 6, fontSize: 11 }}>[{scored.category}]</span>}
              </div>
              <div style={{ color: '#9BA8B8', fontSize: 12, marginBottom: 6 }}>{scored.tagline}</div>
              <div style={{ fontSize: 11, color: '#9BA8B8', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                <span>Score <strong style={{ color: '#C9A84C' }}>{res.result.score.toFixed(2)}</strong></span>
                <span>Cost LLM €{res.result.cost_eur.toFixed(3)}</span>
                <span>Effort <strong>{scored.effort_weeks}w</strong></span>
                <span>Ops <strong>€{scored.monthly_ops_cost_eur}/mo</strong></span>
                <span>LLC <strong style={{ color: LLC_GATE_COLOR[scored.llc_gate] ?? '#9BA8B8' }}>{scored.llc_gate}</strong></span>
              </div>
              {!res.result.passed_gates && res.result.gate_reasons.length > 0 && (
                <div style={{ marginTop: 8, padding: 8, background: '#2a0b0b', borderLeft: '3px solid #FF6B6B', color: '#FF9B9B', fontSize: 11 }}>
                  <strong>Gates failed:</strong><br />{res.result.gate_reasons.map((r, i) => <div key={i}>· {r}</div>)}
                </div>
              )}
            </div>

            {scored.rationale && (
              <div style={{ padding: 12, background: '#112233', borderRadius: 6 }}>
                <div style={{ color: '#C9A84C', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 6 }}>Rationale Hisoka</div>
                <div style={{ color: '#E6EEF7', fontSize: 12, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{scored.rationale}</div>
              </div>
            )}

            {mrr && (
              <div style={{ padding: 12, background: '#112233', borderRadius: 6 }}>
                <div style={{ color: '#C9A84C', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 8 }}>MRR projections (€)</div>
                <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ color: '#9BA8B8', textAlign: 'right' }}>
                      <th style={{ textAlign: 'left', padding: 3 }}>Scénario</th>
                      <th style={{ padding: 3 }}>M1</th>
                      <th style={{ padding: 3 }}>M3</th>
                      <th style={{ padding: 3 }}>M6</th>
                      <th style={{ padding: 3 }}>M12</th>
                      <th style={{ padding: 3 }}>M24</th>
                      <th style={{ padding: 3 }}>M36</th>
                    </tr>
                  </thead>
                  <tbody>
                    {([['Conservateur', cons, '#9BA8B8'], ['Médian', mrr, '#C9A84C'], ['Optimiste', opt, '#6BCB77']] as const).map(([label, curve, color]) =>
                      curve ? (
                        <tr key={label} style={{ borderTop: '1px solid #1A2940' }}>
                          <td style={{ padding: 3, color }}>{label}</td>
                          <td style={{ padding: 3, textAlign: 'right' }}>{fmtEur(curve.m1)}</td>
                          <td style={{ padding: 3, textAlign: 'right' }}>{fmtEur(curve.m3)}</td>
                          <td style={{ padding: 3, textAlign: 'right' }}>{fmtEur(curve.m6)}</td>
                          <td style={{ padding: 3, textAlign: 'right' }}>{fmtEur(curve.m12)}</td>
                          <td style={{ padding: 3, textAlign: 'right' }}>{fmtEur(curve.m24)}</td>
                          <td style={{ padding: 3, textAlign: 'right', color }}>{fmtEur(curve.m36)}</td>
                        </tr>
                      ) : null
                    )}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {scored.autonomy && (
                <div style={{ padding: 12, background: '#112233', borderRadius: 6 }}>
                  <div style={{ color: '#C9A84C', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 6 }}>Autonomie (0-1)</div>
                  {Object.entries(scored.autonomy).map(([dim, val]) => (
                    <div key={dim} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#E6EEF7', padding: '2px 0' }}>
                      <span>{dim}</span>
                      <span style={{ color: val >= 0.8 ? '#6BCB77' : val >= 0.5 ? '#C9A84C' : '#FF9B9B' }}>{val.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}

              {scored.assets_leveraged && scored.assets_leveraged.length > 0 && (
                <div style={{ padding: 12, background: '#112233', borderRadius: 6 }}>
                  <div style={{ color: '#C9A84C', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 6 }}>Briques réutilisées</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {scored.assets_leveraged.map((b, i) => (
                      <span key={i} style={{ fontSize: 10, padding: '2px 6px', background: '#1A2940', color: '#6BCB77', borderRadius: 3 }}>{b}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {scored.pricing_tiers && scored.pricing_tiers.length > 0 && (
              <div style={{ padding: 12, background: '#112233', borderRadius: 6 }}>
                <div style={{ color: '#C9A84C', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 6 }}>Pricing tiers ({scored.monetization_model})</div>
                <div style={{ display: 'grid', gap: 4 }}>
                  {scored.pricing_tiers.map((t, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#E6EEF7' }}>
                      <span>{t.name} {t.limits && <span style={{ color: '#9BA8B8' }}>· {t.limits}</span>}</span>
                      <span><strong style={{ color: '#C9A84C' }}>€{t.price_eur}</strong>{t.gm_pct != null && <span style={{ color: '#9BA8B8' }}> · GM {t.gm_pct}%</span>}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {scored.new_minato_agents_needed && scored.new_minato_agents_needed.length > 0 && (
              <div style={{ padding: 12, background: '#112233', borderRadius: 6 }}>
                <div style={{ color: '#C9A84C', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 6 }}>Nouveaux agents Minato à builder</div>
                {scored.new_minato_agents_needed.map((a, i) => (
                  <div key={i} style={{ fontSize: 11, color: '#E6EEF7', padding: '3px 0', borderTop: i > 0 ? '1px solid #1A2940' : undefined }}>
                    <strong>{a.name}</strong> <span style={{ color: '#9BA8B8' }}>· {a.covers_dim} · {a.dev_weeks}w dev</span>
                    <div style={{ color: '#9BA8B8', fontSize: 10 }}>{a.role}</div>
                  </div>
                ))}
              </div>
            )}

            {scored.sources && scored.sources.length > 0 && (
              <div style={{ padding: 12, background: '#112233', borderRadius: 6 }}>
                <div style={{ color: '#C9A84C', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 6 }}>Sources</div>
                {scored.sources.slice(0, 10).map((s, i) => (
                  <a key={i} href={s.url} target="_blank" rel="noreferrer" style={{ display: 'block', fontSize: 10, color: '#6AC3E0', padding: '2px 0', wordBreak: 'break-all' }}>
                    [{s.type}] {s.url}
                  </a>
                ))}
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
