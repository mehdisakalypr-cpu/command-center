'use client';
import { useMemo, useState } from 'react';
import type { IdeaRow, LeverageConfigUI, Envelope, Filters } from '../types';
import { MIN_AUTONOMY_PASS } from '../types';
import DeepDiveDrawer from './DeepDiveDrawer';
import ControlsBar from './ControlsBar';

// Pick the highest-leverage config whose budget <= envelope.budgetEur AND workers <= envelope.workers.
// If none fit (envelope too small), fall back to the bootstrap config (always launch_eur=0).
function bestConfigForEnvelope(idea: IdeaRow, env: Envelope): LeverageConfigUI | null {
  const configs = idea.leverage_configs ?? [];
  if (configs.length === 0) return null;
  const fit = configs.filter(c => c.launch_eur <= env.budgetEur && c.workers <= env.workers);
  if (fit.length === 0) return configs.find(c => c.label === 'bootstrap') ?? configs[0];
  return fit.reduce((best, c) => (c.leverage > best.leverage ? c : best), fit[0]);
}

function passesFilters(idea: IdeaRow, f: Filters): boolean {
  if (f.hideBelowThreshold && (idea.autonomy_score ?? 0) < MIN_AUTONOMY_PASS) return false;
  if (f.categories && f.categories.length && !f.categories.includes(idea.category)) return false;
  if (f.elasticity === 'high' && idea.leverage_elasticity !== 'high') return false;
  if (f.elasticity === 'exclude_flat' && idea.leverage_elasticity === 'flat') return false;
  if (f.llcGate === 'doable_now' && idea.llc_gate !== 'none') return false;
  if (f.llcGate === 'post_expat_ok' && idea.llc_gate === 'blocked') return false;
  return true;
}

export default function IdeasTable({ initialIdeas }: { initialIdeas: IdeaRow[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [envelope, setEnvelope] = useState<Envelope>({ budgetEur: 0, workers: 1 });
  const [filters, setFilters] = useState<Filters>({ categories: null, elasticity: 'all', llcGate: 'all', hideBelowThreshold: true });

  const ranked = useMemo(() => {
    const withBest = initialIdeas
      .filter(i => passesFilters(i, filters))
      .map(i => ({ idea: i, best: bestConfigForEnvelope(i, envelope) }));
    // Sort by best leverage desc; idea.score as tiebreaker.
    withBest.sort((a, b) => {
      const la = a.best?.leverage ?? 0;
      const lb = b.best?.leverage ?? 0;
      if (lb !== la) return lb - la;
      return Number(b.idea.score ?? 0) - Number(a.idea.score ?? 0);
    });
    return withBest;
  }, [initialIdeas, envelope, filters]);

  const passingCount = initialIdeas.filter(i => (i.autonomy_score ?? 0) >= MIN_AUTONOMY_PASS).length;
  const belowCount = initialIdeas.length - passingCount;
  const emptyMsg = initialIdeas.length === 0
    ? 'Aucune proie encore. Lance Hisoka avec le bouton ci-dessus.'
    : filters.hideBelowThreshold
      ? `${belowCount} idées sous seuil masquées. Active "Inclure les insuffisants" pour les voir.`
      : `Aucune idée ne correspond aux filtres. ${initialIdeas.length} idées masquées.`;

  return (
    <>
      <ControlsBar envelope={envelope} filters={filters} onEnvelope={setEnvelope} onFilters={setFilters} />
      {ranked.length === 0 ? (
        <div style={{ background: '#0A1A2E', padding: 24, borderRadius: 8, border: '1px solid rgba(201,168,76,.15)', color: '#9BA8B8', fontSize: 14 }}>
          {emptyMsg}
        </div>
      ) : (
        <div style={{ background: '#0A1A2E', borderRadius: 8, border: '1px solid rgba(201,168,76,.15)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,.03)' }}>
                {['#', 'Name', 'Category', 'Autonomy', 'Score', 'Best@env', 'Config', 'Elasticity', 'LLC', 'Action'].map(h => (
                  <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: '#C9A84C', borderBottom: '1px solid rgba(201,168,76,.15)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ranked.map(({ idea: i, best }, idx) => {
                const origRank = i.rank;
                const rankShifted = origRank !== null && idx + 1 !== origRank;
                return (
                  <tr key={i.id} style={{ borderBottom: '1px solid rgba(255,255,255,.05)' }}>
                    <td style={{ padding: '8px 10px', color: '#C9A84C' }}>
                      {idx + 1}
                      {rankShifted && (
                        <span style={{ marginLeft: 4, fontSize: 10, color: idx + 1 < (origRank ?? 99) ? '#6BCB77' : '#FF6B6B' }}>
                          {idx + 1 < (origRank ?? 99) ? '↑' : '↓'}{Math.abs((idx + 1) - (origRank ?? 99))}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      <div style={{ fontWeight: 600 }}>{i.name}</div>
                      <div style={{ color: '#9BA8B8', fontSize: 11 }}>{i.tagline}</div>
                    </td>
                    <td style={{ padding: '8px 10px', color: '#9BA8B8', fontSize: 11 }}>{i.category}</td>
                    <td style={{ padding: '8px 10px' }}>{i.autonomy_score?.toFixed(2)}</td>
                    <td style={{ padding: '8px 10px' }}>{Number(i.score).toFixed(1)}</td>
                    <td style={{ padding: '8px 10px', fontWeight: 600 }}>{(best?.leverage ?? 0).toFixed(1)}×</td>
                    <td style={{ padding: '8px 10px', color: '#9BA8B8', fontSize: 11 }}>{best?.label ?? '—'}</td>
                    <td style={{ padding: '8px 10px', fontSize: 11 }}>
                      {i.leverage_elasticity === 'high' ? '🔥 high' :
                       i.leverage_elasticity === 'medium' ? '~ medium' :
                       i.leverage_elasticity === 'flat' ? '━ flat' : '—'}
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      {i.llc_gate === 'none' ? '✓' : i.llc_gate === 'blocked' ? '🔒' : '⚠'}
                    </td>
                    <td style={{ padding: '8px 10px', display: 'flex', gap: 6, alignItems: 'center' }}>
                      <button onClick={() => setOpenId(i.id)}
                              style={{ background: 'transparent', border: '1px solid #C9A84C', color: '#C9A84C', padding: '4px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 11 }}>
                        👁 Deep
                      </button>
                      {i.deployed_url && (
                        <a href={i.deployed_url} target="_blank" rel="noreferrer"
                           title="Voir la landing SaaS"
                           style={{ border: '1px solid #6BCB77', color: '#6BCB77', padding: '4px 8px', borderRadius: 4, fontSize: 11, textDecoration: 'none', whiteSpace: 'nowrap' }}>
                          🚀 SaaS ↗
                        </a>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {openId && <DeepDiveDrawer ideaId={openId} onClose={() => setOpenId(null)} />}
    </>
  );
}
