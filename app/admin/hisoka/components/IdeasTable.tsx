'use client';
import { useState } from 'react';
import type { IdeaRow } from '../types';
import DeepDiveDrawer from './DeepDiveDrawer';

export default function IdeasTable({ initialIdeas }: { initialIdeas: IdeaRow[] }) {
  const [ideas] = useState(initialIdeas);
  const [openId, setOpenId] = useState<string | null>(null);

  if (!ideas.length) {
    return (
      <div style={{ background: '#0A1A2E', padding: 24, borderRadius: 8, border: '1px solid rgba(201,168,76,.15)',
                    color: '#9BA8B8', fontSize: 14 }}>
        Aucune proie encore. Lance Hisoka avec le bouton ci-dessus.
      </div>
    );
  }

  return (
    <>
      <div style={{ background: '#0A1A2E', borderRadius: 8, border: '1px solid rgba(201,168,76,.15)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,.03)' }}>
              {['#', 'Name', 'Category', 'Autonomy', 'Score', 'Leverage@boot', 'LLC', 'Action'].map(h => (
                <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: '#C9A84C', borderBottom: '1px solid rgba(201,168,76,.15)' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ideas.map(i => {
              const leverageBoot = i.leverage_configs?.find(c => c.label === 'bootstrap')?.leverage ?? 0;
              return (
                <tr key={i.id} style={{ borderBottom: '1px solid rgba(255,255,255,.05)' }}>
                  <td style={{ padding: '8px 10px', color: '#C9A84C' }}>{i.rank}</td>
                  <td style={{ padding: '8px 10px' }}>
                    <div style={{ fontWeight: 600 }}>{i.name}</div>
                    <div style={{ color: '#9BA8B8', fontSize: 11 }}>{i.tagline}</div>
                  </td>
                  <td style={{ padding: '8px 10px', color: '#9BA8B8', fontSize: 11 }}>{i.category}</td>
                  <td style={{ padding: '8px 10px' }}>{i.autonomy_score?.toFixed(2)}</td>
                  <td style={{ padding: '8px 10px' }}>{Number(i.score).toFixed(1)}</td>
                  <td style={{ padding: '8px 10px' }}>{leverageBoot.toFixed(1)}×</td>
                  <td style={{ padding: '8px 10px' }}>
                    {i.llc_gate === 'none' ? '✓' : i.llc_gate === 'blocked' ? '🔒' : '⚠'}
                  </td>
                  <td style={{ padding: '8px 10px' }}>
                    <button onClick={() => setOpenId(i.id)}
                            style={{ background: 'transparent', border: '1px solid #C9A84C', color: '#C9A84C', padding: '4px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 11 }}>
                      👁 Deep
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {openId && <DeepDiveDrawer ideaId={openId} onClose={() => setOpenId(null)} />}
    </>
  );
}
