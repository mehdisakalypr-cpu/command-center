'use client';
import type { QueueItem } from '../types';

export default function ForgeQueueTable({ items }: { items: QueueItem[] }) {
  if (!items.length) {
    return (
      <div style={{ color: '#9BA8B8', fontSize: 12 }}>
        queue vide (aucune idée 0.75-0.89 avec attempts &lt; 3)
      </div>
    );
  }

  return (
    <div
      style={{
        background: '#0A1A2E',
        borderRadius: 6,
        border: '1px solid rgba(201,168,76,.15)',
        overflow: 'hidden',
      }}
    >
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ background: 'rgba(255,255,255,.03)' }}>
            {['Idea', 'Autonomy', 'Attempts', 'Biggest gap'].map((h) => (
              <th
                key={h}
                style={{
                  padding: '6px 10px',
                  textAlign: 'left',
                  color: '#C9A84C',
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((i) => {
            const gaps = (i.automation_gaps ?? [])
              .filter((g) => g.forgeable)
              .sort((a, b) => a.current_autonomy - b.current_autonomy);
            const top = gaps[0];

            return (
              <tr
                key={i.id}
                style={{ borderTop: '1px solid rgba(255,255,255,.04)' }}
              >
                <td style={{ padding: '6px 10px' }}>{i.name}</td>
                <td style={{ padding: '6px 10px' }}>
                  {Number(i.autonomy_score).toFixed(2)}
                </td>
                <td style={{ padding: '6px 10px' }}>
                  {i.forge_attempts}/3
                </td>
                <td
                  style={{
                    padding: '6px 10px',
                    color: '#9BA8B8',
                    fontSize: 11,
                  }}
                >
                  {top
                    ? `${top.dim} (${top.current_autonomy.toFixed(2)}): ${top.description.slice(0, 80)}`
                    : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
