type Row = {
  id: string
  kind: string
  capabilities: string[]
  quota_plan: string
  night_eligible: boolean
  notes: string | null
  state: string
  created_at: string
}

export default function PendingProvisioningList({ rows }: { rows: Row[] }) {
  if (!rows.length) {
    return (
      <div style={{ padding: 16, background: '#071425', borderRadius: 8, color: '#9aa', fontSize: 13,
        border: '1px dashed #2a2f3a' }}>
        Aucune demande en attente. Crée-en une ci-dessous (formulaire) puis ouvre Claude Code en terminal.
      </div>
    )
  }
  return (
    <div style={{ padding: 14, background: '#1a1f2e', border: '1px solid #C9A84C44', borderRadius: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{ fontSize: 20 }}>🔔</div>
        <div style={{ fontWeight: 700, color: '#C9A84C', flex: 1 }}>
          {rows.length} compte{rows.length > 1 ? 's' : ''} en attente de transformation en worker
        </div>
        <code style={codeInline}>/provision-cc-fleet</code>
      </div>
      <div style={{ fontSize: 12, color: '#cbd5e1', marginBottom: 10 }}>
        Ouvre Claude Code en terminal et lance <code style={codeInline}>/provision-cc-fleet</code>.
        Il te demandera l&apos;<code style={codeInline}>ANTHROPIC_API_KEY</code> et le <code style={codeInline}>GH_TOKEN</code> de chaque compte, provisionnera les users Linux, posera les worktrees, enregistrera les rows et démarrera les services systemd.
      </div>
      <div style={{ display: 'grid', gap: 6 }}>
        {rows.map(r => (
          <div key={r.id} style={{
            padding: 10, background: '#071425', border: '1px solid #1e2a3d', borderRadius: 6,
            display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 12, alignItems: 'center',
          }}>
            <span style={{
              fontSize: 11, padding: '3px 8px', borderRadius: 10,
              background: r.state === 'pending' ? '#C9A84C22' : '#60a5fa22',
              color: r.state === 'pending' ? '#C9A84C' : '#60a5fa',
              border: `1px solid ${r.state === 'pending' ? '#C9A84C' : '#60a5fa'}`,
            }}>{r.state}</span>
            <div>
              <div style={{ fontSize: 12, color: '#e6e6e6' }}>
                {r.kind} · {r.quota_plan}{r.night_eligible ? ' · 🌙' : ''}
              </div>
              <div style={{ fontSize: 11, color: '#9aa', marginTop: 2 }}>
                caps: {r.capabilities.join(', ')}
                {r.notes && <> · <span style={{ fontStyle: 'italic' }}>{r.notes}</span></>}
              </div>
            </div>
            <div style={{ fontSize: 10, color: '#6b7280', fontFamily: 'monospace' }}>
              {r.id.slice(0, 8)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const codeInline: React.CSSProperties = {
  background: '#040d1c', padding: '1px 6px', borderRadius: 4, color: '#C9A84C',
  fontSize: 12, fontFamily: 'monospace',
}
