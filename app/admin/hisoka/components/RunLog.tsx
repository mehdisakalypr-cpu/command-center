'use client';

export type RunRow = {
  id: string;
  trigger: 'cron' | 'manual' | 'benchmark';
  started_at: string;
  finished_at: string | null;
  ideas_discovered: number | null;
  ideas_upserted: number | null;
  cost_eur: number | null;
  status: 'running' | 'success' | 'failed';
  error: string | null;
};

function durationSec(started: string, finished: string | null): string {
  if (!finished) return '—';
  const dt = (new Date(finished).getTime() - new Date(started).getTime()) / 1000;
  return `${dt.toFixed(0)}s`;
}

function statusIcon(s: RunRow['status']): string {
  return s === 'success' ? '✓' : s === 'failed' ? '✗' : '⏳';
}

function statusColor(s: RunRow['status']): string {
  return s === 'success' ? '#6BCB77' : s === 'failed' ? '#FF6B6B' : '#FFB84C';
}

export default function RunLog({ runs }: { runs: RunRow[] }) {
  if (!runs.length) {
    return (
      <div style={{ color: '#9BA8B8', fontSize: 12, marginTop: 20 }}>
        No runs yet. Click ▶ Hisoka, run to start the first hunt.
      </div>
    );
  }
  return (
    <div style={{ marginTop: 24, background: '#0A1A2E', borderRadius: 8, border: '1px solid rgba(201,168,76,.15)', overflow: 'hidden' }}>
      <div style={{ padding: '10px 14px', color: '#C9A84C', fontSize: 13, fontWeight: 600, borderBottom: '1px solid rgba(201,168,76,.15)' }}>
        Last 10 runs
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ background: 'rgba(255,255,255,.03)' }}>
            {['Time', 'Trigger', 'Status', 'Ideas ↑', 'Cost', 'Duration'].map(h => (
              <th key={h} style={{ padding: '6px 10px', textAlign: 'left', color: '#9BA8B8', fontWeight: 500 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {runs.map(r => (
            <tr key={r.id} style={{ borderTop: '1px solid rgba(255,255,255,.04)' }}>
              <td style={{ padding: '6px 10px', color: '#9BA8B8' }}>{new Date(r.started_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</td>
              <td style={{ padding: '6px 10px' }}>{r.trigger}</td>
              <td style={{ padding: '6px 10px', color: statusColor(r.status) }}>
                {statusIcon(r.status)} {r.status}
                {r.error && <span title={r.error} style={{ marginLeft: 6, color: '#FF6B6B', cursor: 'help' }}>ℹ</span>}
              </td>
              <td style={{ padding: '6px 10px' }}>{r.ideas_upserted ?? '—'}/{r.ideas_discovered ?? '—'}</td>
              <td style={{ padding: '6px 10px' }}>{r.cost_eur != null ? `€${Number(r.cost_eur).toFixed(2)}` : '—'}</td>
              <td style={{ padding: '6px 10px', color: '#9BA8B8' }}>{durationSec(r.started_at, r.finished_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
