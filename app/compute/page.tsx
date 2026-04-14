"use client"

import { useEffect, useState, useCallback, useRef } from 'react'

type Status = {
  ok: boolean
  ts: string
  max_enabled: boolean
  utilization: number
  processes: number
  processes_by_project: Record<string, number>
  bg_jobs: { name: string; status: 'running' | 'idle' | 'unknown'; last_activity?: string; project: string }[]
  active_bg: number
  load_avg: number[]
  ram_pct: number
  last_claude_ack: string | null
  enabled_at: string | null
}

type Supervisor = {
  ok: boolean
  ts: string
  layer: 'C1' | 'C2' | 'C3'
  reason: string
  signals: { queue_depth: number; target_gap_pct: number; provider_slack_pct: number; utilization_pct: number }
  actions: { layer: string; kind: string; icon: string; rationale: string }[]
  budget: { monthly_cap_eur: number; spent_eur: number; remaining_eur: number; pct_used: number; tier_mode: string; allowed: boolean; usage_based: boolean }
  circuit_breaker: { paid_actions_blocked: boolean; tier_mode: string; note: string }
  hint: string
}

const REFRESH_MS = 60_000

export default function ComputePage() {
  const [status, setStatus] = useState<Status | null>(null)
  const [supervisor, setSupervisor] = useState<Supervisor | null>(null)
  const [, setLoading] = useState(false)
  const [history, setHistory] = useState<number[]>([])
  const [dispatchLog, setDispatchLog] = useState<string | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true)
      const [sr, sp] = await Promise.all([
        fetch('/api/compute/status', { cache: 'no-store' }).then(r => r.json()).catch(() => null),
        fetch('/api/minato/supervisor', { cache: 'no-store' }).then(r => r.json()).catch(() => null),
      ])
      if (sr?.ok) {
        setStatus(sr)
        setHistory(h => [...h.slice(-59), sr.utilization])
      }
      if (sp?.ok) setSupervisor(sp)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    fetchStatus()
    timerRef.current = setInterval(fetchStatus, REFRESH_MS)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [fetchStatus])

  const toggleMax = async (enabled: boolean) => {
    const r = await fetch('/api/compute/max', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled, trigger: 'sticky' }),
    })
    const d = await r.json()
    setDispatchLog(`${new Date().toLocaleTimeString()} · MAX=${d.max_enabled ? 'ON' : 'OFF'} · pending=${d.summary?.total_pending ?? '?'}`)
    fetchStatus()
  }

  const pulseMax = async () => {
    const r = await fetch('/api/compute/max', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trigger: 'button' }),
    })
    const d = await r.json()
    setDispatchLog(`${new Date().toLocaleTimeString()} · MINATO pulse envoyé · pending=${d.summary?.total_pending ?? '?'}`)
    fetchStatus()
  }

  const util = status?.utilization ?? 0
  const utilPct = Math.round(util * 100)
  const barColor = util >= 0.9 ? '#10B981' : util >= 0.6 ? '#C9A84C' : util >= 0.35 ? '#F59E0B' : '#EF4444'

  return (
    <div style={{ background: '#07090F', color: '#E2E8F0', minHeight: '100vh', fontFamily: 'system-ui, sans-serif', padding: '32px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <div style={{ color: '#C9A84C', letterSpacing: '.1em', fontSize: 12, fontWeight: 700 }}>COMMAND CENTER · NO LAZY MODE</div>
            <h1 style={{ margin: '4px 0 0', fontSize: 28, fontWeight: 600 }}>Compute Utilization</h1>
            <div style={{ color: 'rgba(226,232,240,.5)', fontSize: 13, marginTop: 4 }}>
              Refresh 1 min · dernière lecture {status ? new Date(status.ts).toLocaleTimeString() : '—'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button
              onClick={pulseMax}
              style={{ background: '#C9A84C', color: '#07090F', border: 0, padding: '12px 24px', borderRadius: 8, fontWeight: 700, letterSpacing: '.05em', cursor: 'pointer' }}
            >🔥 MAX</button>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,.05)', padding: '10px 16px', borderRadius: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={!!status?.max_enabled} onChange={e => toggleMax(e.target.checked)} />
              <span style={{ fontWeight: 600, letterSpacing: '.05em' }}>MAX sticky</span>
            </label>
          </div>
        </header>

        {supervisor && <SupervisorBandeau s={supervisor} />}

        <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 32, alignItems: 'start' }}>
          {/* Left: vertical counter (proof) */}
          <div style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 12, padding: 20, textAlign: 'center' }}>
            <div style={{ color: 'rgba(226,232,240,.5)', fontSize: 11, letterSpacing: '.15em' }}>UTILIZATION</div>
            <div style={{ fontSize: 56, fontWeight: 700, lineHeight: 1, margin: '8px 0', color: barColor }}>{utilPct}%</div>
            <div style={{ position: 'relative', height: 260, background: 'rgba(255,255,255,.05)', borderRadius: 8, overflow: 'hidden', margin: '12px 0' }}>
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${utilPct}%`, background: `linear-gradient(0deg, ${barColor} 0%, rgba(255,255,255,.15) 100%)`, transition: 'height .6s ease' }} />
              <div style={{ position: 'absolute', top: 8, left: 0, right: 0, textAlign: 'center', fontSize: 10, color: 'rgba(255,255,255,.5)', letterSpacing: '.1em' }}>MAX</div>
              <div style={{ position: 'absolute', bottom: 8, left: 0, right: 0, textAlign: 'center', fontSize: 10, color: 'rgba(255,255,255,.5)', letterSpacing: '.1em' }}>IDLE</div>
            </div>
            <div style={{ fontSize: 12, color: 'rgba(226,232,240,.5)' }}>
              {status?.max_enabled ? 'MAX STICKY · relance sur baisse' : 'MAX off — libre'}
            </div>
            {status?.last_claude_ack && (
              <div style={{ fontSize: 11, marginTop: 8, color: 'rgba(226,232,240,.4)' }}>
                Dernier ack Claude: {new Date(status.last_claude_ack).toLocaleTimeString()}
              </div>
            )}
          </div>

          {/* Right: details */}
          <div style={{ display: 'grid', gap: 16 }}>
            <Panel title="Processus actifs">
              <KV label="Total" value={`${status?.processes ?? 0}`} />
              {status && Object.entries(status.processes_by_project).map(([k, v]) => (
                <KV key={k} label={k.toUpperCase()} value={`${v}`} />
              ))}
              <KV label="Load avg 1m" value={status ? status.load_avg[0].toFixed(2) : '—'} />
              <KV label="RAM" value={status ? `${Math.round(status.ram_pct * 100)}%` : '—'} />
            </Panel>

            <Panel title={`Background jobs (${status?.active_bg ?? 0} running)`}>
              {(status?.bg_jobs ?? []).map((j, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: i < (status?.bg_jobs.length ?? 0) - 1 ? '1px solid rgba(255,255,255,.05)' : 'none' }}>
                  <span style={{ opacity: .85 }}>
                    <span style={{ color: j.status === 'running' ? '#10B981' : j.status === 'idle' ? '#F59E0B' : 'rgba(226,232,240,.3)', marginRight: 8 }}>●</span>
                    [{j.project.toUpperCase()}] {j.name}
                  </span>
                  <span style={{ fontSize: 12, color: 'rgba(226,232,240,.5)' }}>
                    {j.last_activity ? new Date(j.last_activity).toLocaleTimeString() : '—'}
                  </span>
                </div>
              ))}
            </Panel>

            <Panel title="Historique utilisation (60 dernières minutes)">
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 80 }}>
                {history.map((v, i) => (
                  <div key={i} style={{ flex: 1, height: `${Math.round(v * 100)}%`, background: v >= 0.9 ? '#10B981' : v >= 0.6 ? '#C9A84C' : v >= 0.35 ? '#F59E0B' : '#EF4444', borderRadius: 2, opacity: .8 }} />
                ))}
              </div>
            </Panel>

            {dispatchLog && (
              <Panel title="Dernier dispatch">
                <div style={{ fontSize: 13, color: 'rgba(226,232,240,.8)' }}>{dispatchLog}</div>
              </Panel>
            )}
          </div>
        </div>

        <div style={{ marginTop: 32, fontSize: 12, color: 'rgba(226,232,240,.4)', textAlign: 'center' }}>
          Règle NO LAZY MODE · le bouton MAX envoie un pulse Minato à Claude (bridge + Telegram). La case MAX sticky maintient au maximum en continu. Auto-watchdog Minato toutes les 5 min.
        </div>
      </div>
    </div>
  )
}

const LAYER_META = {
  C1: { icon: '⚡', label: 'EXÉCUTION NORMALE', color: '#10B981', sub: 'Agents en queue — Minato standard' },
  C2: { icon: '👁️', label: 'AMPLIFICATION NEJI', color: '#C9A84C', sub: 'Queue vide — défense absolue 360°, sur-amplifie l\'existant' },
  C3: { icon: '🌑', label: 'INFINITE TSUKUYOMI', color: '#A855F7', sub: 'Cibles atteintes — élève le potentiel vers l\'infini' },
} as const

function SupervisorBandeau({ s }: { s: Supervisor }) {
  const meta = LAYER_META[s.layer]
  return (
    <div style={{ background: 'rgba(255,255,255,.04)', border: `1px solid ${meta.color}55`, borderRadius: 12, padding: 20, marginBottom: 24 }}>
      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ minWidth: 220 }}>
          <div style={{ fontSize: 11, letterSpacing: '.15em', color: 'rgba(226,232,240,.5)' }}>COUCHE ACTIVE</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: meta.color, marginTop: 4 }}>{meta.icon} {s.layer}</div>
          <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2, color: meta.color }}>{meta.label}</div>
          <div style={{ fontSize: 12, color: 'rgba(226,232,240,.55)', marginTop: 4 }}>{meta.sub}</div>
        </div>
        <div style={{ flex: 1, minWidth: 280 }}>
          <div style={{ fontSize: 11, letterSpacing: '.15em', color: 'rgba(226,232,240,.5)' }}>SIGNAUX</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 8 }}>
            <MiniStat label="queue" value={`${s.signals.queue_depth}`} />
            <MiniStat label="gap cible" value={`${s.signals.target_gap_pct}%`} />
            <MiniStat label="slack" value={`${s.signals.provider_slack_pct}%`} />
            <MiniStat label="util" value={`${s.signals.utilization_pct}%`} />
          </div>
          <div style={{ fontSize: 12, color: 'rgba(226,232,240,.6)', marginTop: 12, fontStyle: 'italic' }}>{s.reason}</div>
        </div>
        <div style={{ minWidth: 200, textAlign: 'right' }}>
          <div style={{ fontSize: 11, letterSpacing: '.15em', color: 'rgba(226,232,240,.5)' }}>BUDGET</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>
            {s.budget.spent_eur.toFixed(2)}€ / {s.budget.monthly_cap_eur}€
          </div>
          <div style={{ fontSize: 11, color: 'rgba(226,232,240,.55)', marginTop: 2 }}>
            restant {s.budget.remaining_eur.toFixed(2)}€ · {s.budget.pct_used.toFixed(0)}% utilisé
          </div>
          <div style={{ fontSize: 11, marginTop: 4, color: s.circuit_breaker.paid_actions_blocked ? '#EF4444' : '#10B981', fontWeight: 600 }}>
            {s.circuit_breaker.paid_actions_blocked ? `⛔ ${s.circuit_breaker.tier_mode}` : `✓ ${s.circuit_breaker.tier_mode}`}
          </div>
        </div>
      </div>
      {s.actions.length > 0 && (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,.06)' }}>
          <div style={{ fontSize: 11, letterSpacing: '.15em', color: 'rgba(226,232,240,.5)', marginBottom: 8 }}>
            ACTIONS RECOMMANDÉES ({s.actions.length})
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 8 }}>
            {s.actions.map(a => (
              <div key={a.kind} style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{a.icon} {a.kind}</div>
                <div style={{ fontSize: 12, color: 'rgba(226,232,240,.6)', marginTop: 2 }}>{a.rationale}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div style={{ marginTop: 10, fontSize: 11, color: 'rgba(226,232,240,.4)' }}>💡 {s.hint}</div>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: 'rgba(255,255,255,.03)', borderRadius: 6, padding: '6px 10px' }}>
      <div style={{ fontSize: 10, letterSpacing: '.1em', color: 'rgba(226,232,240,.45)' }}>{label.toUpperCase()}</div>
      <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>{value}</div>
    </div>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 12, padding: 20 }}>
      <div style={{ color: '#C9A84C', fontSize: 11, letterSpacing: '.12em', marginBottom: 12, fontWeight: 700 }}>{title.toUpperCase()}</div>
      {children}
    </div>
  )
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
      <span style={{ color: 'rgba(226,232,240,.6)', fontSize: 13 }}>{label}</span>
      <span style={{ fontWeight: 600 }}>{value}</span>
    </div>
  )
}
