type Row = { state: string; cnt: number; tokens_pending: number }

const STATE_ORDER = ['draft', 'queued', 'claimed', 'in_progress', 'pr_open', 'merged', 'done', 'failed', 'blocked']

const STATE_TONE: Record<string, string> = {
  draft: '#6b7280', queued: '#C9A84C', claimed: '#60a5fa',
  in_progress: '#8b5cf6', pr_open: '#06b6d4',
  merged: '#4ade80', done: '#4ade80',
  failed: '#ef4444', blocked: '#f59e0b',
}

export default function QueueStats({ rows }: { rows: Row[] }) {
  const map = new Map(rows.map(r => [r.state, r]))
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8 }}>
      {STATE_ORDER.map(s => {
        const r = map.get(s)
        const cnt = r?.cnt ?? 0
        const tokens = r?.tokens_pending ?? 0
        const color = STATE_TONE[s] || '#9aa'
        return (
          <div key={s} style={{
            padding: 10, background: '#071425', border: '1px solid #1e2a3d', borderRadius: 8,
            borderLeftWidth: 3, borderLeftColor: color,
          }}>
            <div style={{ fontSize: 10, textTransform: 'uppercase', color: '#9aa', letterSpacing: 0.5 }}>
              {s.replace('_', ' ')}
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color, marginTop: 2 }}>{cnt}</div>
            {tokens > 0 && (
              <div style={{ fontSize: 10, color: '#9aa', marginTop: 2 }}>
                {(tokens / 1000).toFixed(0)}k tok
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
