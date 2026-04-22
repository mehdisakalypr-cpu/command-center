type Props = {
  worker: {
    id: string
    display_name: string
    kind: string
    state: string
    quota_plan: string
    quota_used_pct: number
    cost_week_usd: number
    heartbeat_at: string | null
    capabilities: string[]
    night_eligible: boolean
    max_concurrent_tickets: number
    tickets_in_progress: number
    tickets_done_24h: number
    tickets_failed_24h: number
  }
}

export default function WorkerCard({ worker }: Props) {
  const stateColor =
    worker.state === 'active' ? '#4ade80'
    : worker.state === 'paused' ? '#f59e0b'
    : '#6b7280'

  const quotaPct = Number(worker.quota_used_pct || 0)
  const quotaBar =
    quotaPct >= 80 ? '#ef4444'
    : quotaPct >= 60 ? '#f59e0b'
    : '#4ade80'

  const hbAge = worker.heartbeat_at
    ? Math.round((Date.now() - new Date(worker.heartbeat_at).getTime()) / 60000)
    : null

  return (
    <div style={{ padding: 16, background: '#071425', border: '1px solid #1e2a3d', borderRadius: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>
            {worker.kind === 'interactive' ? '👤' : '🤖'} {worker.display_name}
          </div>
          <div style={{ fontSize: 11, color: '#9aa', marginTop: 2 }}>
            <code style={{ background: '#0b1a2e', padding: '1px 6px', borderRadius: 4 }}>{worker.id}</code>
            {' · '}
            <span style={{ color: stateColor }}>● {worker.state}</span>
            {' · '}
            {worker.quota_plan}
          </div>
        </div>
        <div style={{ textAlign: 'right', fontSize: 11, color: '#9aa' }}>
          {hbAge !== null ? `♥ ${hbAge}min` : 'no heartbeat'}
        </div>
      </div>

      <div style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#9aa', marginBottom: 4 }}>
          <span>Quota (5h)</span>
          <span>{quotaPct.toFixed(1)}%</span>
        </div>
        <div style={{ height: 6, background: '#0b1a2e', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ width: `${Math.min(quotaPct, 100)}%`, height: '100%', background: quotaBar }} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 10 }}>
        <Mini label="In progress" value={worker.tickets_in_progress} />
        <Mini label="Done 24h"    value={worker.tickets_done_24h} tone="ok" />
        <Mini label="Failed 24h"  value={worker.tickets_failed_24h} tone={worker.tickets_failed_24h > 0 ? 'warn' : 'muted'} />
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
        {worker.capabilities.map(c => (
          <span key={c} style={capChip}>{c}</span>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#9aa' }}>
        <span>max_concurrent={worker.max_concurrent_tickets}</span>
        {worker.night_eligible && <span>🌙 night-ok</span>}
        <span>${Number(worker.cost_week_usd || 0).toFixed(2)}/wk</span>
      </div>
    </div>
  )
}

function Mini({ label, value, tone = 'default' }: { label: string; value: number; tone?: 'default' | 'ok' | 'warn' | 'muted' }) {
  const color = tone === 'ok' ? '#4ade80' : tone === 'warn' ? '#f59e0b' : tone === 'muted' ? '#6b7280' : '#C9A84C'
  return (
    <div style={{ padding: 8, background: '#040d1c', borderRadius: 6, textAlign: 'center' }}>
      <div style={{ fontSize: 10, color: '#9aa', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color }}>{value}</div>
    </div>
  )
}

const capChip: React.CSSProperties = {
  fontSize: 10, padding: '2px 8px', background: '#1e2a3d', borderRadius: 10, color: '#cbd5e1',
  border: '1px solid #2a3a4f',
}
