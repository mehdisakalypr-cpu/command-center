import { redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { isAdmin } from '@/lib/supabase-server'
import { FLEET_ENABLED } from '@/lib/cc-fleet'
import WorkerCard from './components/WorkerCard'
import QueueStats from './components/QueueStats'
import DormantBanner from './components/DormantBanner'
import RegisterWorkerForm from './components/RegisterWorkerForm'
import PendingProvisioningList from './components/PendingProvisioningList'

export const dynamic = 'force-dynamic'

const sb = () =>
  createClient(
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

export default async function CcFleetPage() {
  const ok = await isAdmin()
  if (!ok) redirect('/login?next=/admin/cc-fleet')

  const client = sb()
  const [summaryRes, queueRes, pendingRes] = await Promise.all([
    client.from('cc_fleet_summary').select('*').order('id'),
    client.from('cc_fleet_queue_stats').select('*'),
    client.from('cc_fleet_provisioning_requests')
      .select('id, kind, capabilities, quota_plan, night_eligible, notes, state, created_at')
      .in('state', ['pending', 'in_progress'])
      .order('created_at', { ascending: true }),
  ])

  const workers = (summaryRes.data ?? []) as Array<{
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
  }>

  const queue = (queueRes.data ?? []) as Array<{ state: string; cnt: number; tokens_pending: number }>

  const totalCostWeek = workers.reduce((acc, w) => acc + Number(w.cost_week_usd || 0), 0)
  const totalInProgress = workers.reduce((acc, w) => acc + (w.tickets_in_progress || 0), 0)
  const totalDone24 = workers.reduce((acc, w) => acc + (w.tickets_done_24h || 0), 0)
  const totalFailed24 = workers.reduce((acc, w) => acc + (w.tickets_failed_24h || 0), 0)

  return (
    <div style={{ padding: '24px', maxWidth: 1400, margin: '0 auto', color: '#e6e6e6' }}>
      <header style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>🔀 CC Fleet</h1>
        <p style={{ color: '#9aa', marginTop: 4, fontSize: 14 }}>
          N-worker orchestration · capability-based routing · scope-locked · {workers.length} worker{workers.length > 1 ? 's' : ''} registered
        </p>
      </header>

      {!FLEET_ENABLED && <DormantBanner />}

      {summaryRes.error && (
        <div style={errBox}>
          Erreur chargement workers: {summaryRes.error.message}
          <div style={{ color: '#bbb', marginTop: 4, fontSize: 12 }}>
            Migration probablement pas appliquée. Voir <code>infra/cc-fleet/ACTIVATION.md</code>.
          </div>
        </div>
      )}

      <section style={{ marginBottom: 28 }}>
        <h2 style={sectionH2}>Fleet aggregate (24h)</h2>
        <div style={aggGrid}>
          <Stat label="Workers online"    value={workers.filter(w => w.state === 'active').length} />
          <Stat label="In progress"       value={totalInProgress} />
          <Stat label="Done 24h"          value={totalDone24} tone="ok" />
          <Stat label="Failed 24h"        value={totalFailed24} tone={totalFailed24 > 0 ? 'warn' : 'ok'} />
          <Stat label="$ burned (week)"   value={`$${totalCostWeek.toFixed(2)}`} />
          <Stat label="Flag"              value={FLEET_ENABLED ? 'LIVE' : 'DORMANT'} tone={FLEET_ENABLED ? 'ok' : 'muted'} />
        </div>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={sectionH2}>Workers</h2>
        {workers.length === 0 ? (
          <div style={emptyBox}>
            Aucun worker enregistré. Après migration appliquée, le seed insère <code>main</code>. Si tu vois ce message, vérifie la migration.
          </div>
        ) : (
          <div style={workerGrid}>
            {workers.map(w => <WorkerCard key={w.id} worker={w as never} />)}
          </div>
        )}
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={sectionH2}>Queue</h2>
        <QueueStats rows={queue} />
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={sectionH2}>
          Demandes de provisioning en attente {pendingRes.data && pendingRes.data.length > 0 && `(${pendingRes.data.length})`}
        </h2>
        <PendingProvisioningList rows={(pendingRes.data ?? []) as never} />
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={sectionH2}>J&apos;ai acquis N nouveaux comptes Claude Code</h2>
        <RegisterWorkerForm nextIndex={workers.filter(w => w.kind === 'autonomous').length + 1} />
      </section>
    </div>
  )
}

function Stat({ label, value, tone = 'default' }: { label: string; value: string | number; tone?: 'default' | 'ok' | 'warn' | 'muted' }) {
  const color = tone === 'ok' ? '#4ade80' : tone === 'warn' ? '#f59e0b' : tone === 'muted' ? '#6b7280' : '#C9A84C'
  return (
    <div style={{ padding: 14, background: '#071425', border: '1px solid #1e2a3d', borderRadius: 8 }}>
      <div style={{ fontSize: 11, color: '#9aa', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color, marginTop: 4 }}>{value}</div>
    </div>
  )
}

const sectionH2: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 600,
  margin: '0 0 12px',
  color: '#f3f3f3',
  borderBottom: '1px solid #2a2f3a',
  paddingBottom: 6,
}

const aggGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
  gap: 12,
}

const workerGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
  gap: 14,
}

const errBox: React.CSSProperties = {
  padding: 12, background: '#4a1f1f', borderRadius: 8, marginBottom: 16, fontSize: 14,
}

const emptyBox: React.CSSProperties = {
  padding: 16, background: '#071425', borderRadius: 8, color: '#9aa', fontSize: 14,
  border: '1px dashed #2a2f3a',
}
