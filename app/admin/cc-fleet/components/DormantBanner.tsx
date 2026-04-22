export default function DormantBanner() {
  return (
    <div style={{
      padding: 14, background: '#1a1f2e', border: '1px solid #C9A84C44', borderRadius: 8,
      marginBottom: 20, display: 'flex', alignItems: 'center', gap: 14,
    }}>
      <div style={{ fontSize: 28 }}>💤</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, color: '#C9A84C' }}>DORMANT MODE</div>
        <div style={{ fontSize: 13, color: '#cbd5e1', marginTop: 2 }}>
          Dashboard read-only · dispatcher no-op · aucun worker autonome n&apos;est en cours d&apos;exécution.
          Activation : set <code style={code}>CC_FLEET_ENABLED=true</code> dans Vercel env, redeploy, puis register workers.
          Voir <code style={code}>infra/cc-fleet/ACTIVATION.md</code>.
        </div>
      </div>
    </div>
  )
}

const code: React.CSSProperties = {
  background: '#040d1c', padding: '1px 6px', borderRadius: 4, color: '#C9A84C',
  fontSize: 12, fontFamily: 'monospace',
}
