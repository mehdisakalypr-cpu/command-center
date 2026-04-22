'use client';
import type { AttemptRow } from '../types';

const VERDICT_COLOR: Record<string, string> = {
  promoted: '#6BCB77',
  failed: '#FF6B6B',
  needs_human: '#FFB84C',
  out_of_budget: '#9BA8B8',
};

export default function AttemptsLog({ attempts }: { attempts: AttemptRow[] }) {
  if (!attempts.length) {
    return (
      <div style={{ color: '#9BA8B8', fontSize: 12 }}>
        aucune forge encore
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
            {['Time', 'Dim', 'Verdict', 'Autonomy', 'Cost', 'Reason'].map(
              (h) => (
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
              )
            )}
          </tr>
        </thead>
        <tbody>
          {attempts.map((a) => (
            <tr
              key={a.id}
              style={{ borderTop: '1px solid rgba(255,255,255,.04)' }}
            >
              <td style={{ padding: '6px 10px', color: '#9BA8B8' }}>
                {new Date(a.started_at).toLocaleString('fr-FR', {
                  dateStyle: 'short',
                  timeStyle: 'short',
                })}
              </td>
              <td style={{ padding: '6px 10px' }}>{a.dim_targeted}</td>
              <td
                style={{
                  padding: '6px 10px',
                  color: VERDICT_COLOR[a.verdict],
                }}
              >
                {a.verdict}
              </td>
              <td style={{ padding: '6px 10px' }}>
                {Number(a.autonomy_before).toFixed(2)} →{' '}
                {a.autonomy_after != null
                  ? Number(a.autonomy_after).toFixed(2)
                  : '—'}
              </td>
              <td style={{ padding: '6px 10px' }}>
                €{Number(a.cost_eur ?? 0).toFixed(3)}
              </td>
              <td
                style={{
                  padding: '6px 10px',
                  color: '#9BA8B8',
                  fontSize: 11,
                }}
              >
                {a.verdict_reason?.slice(0, 80) ?? ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
