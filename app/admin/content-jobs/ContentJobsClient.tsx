'use client'
import { useState, useTransition } from 'react'

const GOLD = '#C9A84C'
const BG = '#07090F'
const CARD = '#0F172A'
const BORDER = 'rgba(201,168,76,.2)'
const MUTED = '#94A3B8'

type Job = {
  id: string
  project: string
  platform: string
  job_key: string
  label: string
  description: string | null
  total_target: number
  completed: number
  pct_done: string | number
  items_per_day: string | number | null
  eta_days: string | number | null
  avg_seconds_per_item: number | null
  last_refreshed_at: string | null
  last_delta_today: number | null
  notes: string | null
}

const PROJECT_LABEL: Record<string, string> = {
  ftg: 'FTG', ofa: 'OFA', cc: 'CC', estate: 'Estate', shift: 'Shift',
  optimus: 'Optimus', hisoka: 'Hisoka', aam: 'AAM', general: 'Général',
}

export default function ContentJobsClient({ initialJobs }: { initialJobs: Job[] }) {
  const [jobs, setJobs] = useState(initialJobs)
  const [refreshing, startRefreshing] = useTransition()
  const [lastRefresh, setLastRefresh] = useState<string | null>(null)

  const byProject = jobs.reduce<Record<string, Job[]>>((acc, j) => {
    acc[j.project] = acc[j.project] ?? []
    acc[j.project].push(j)
    return acc
  }, {})

  function refresh() {
    startRefreshing(async () => {
      const res = await fetch('/api/admin/refresh-dashboards', { method: 'POST' })
      if (res.ok) {
        const reload = await fetch(window.location.pathname, { cache: 'no-store' })
        if (reload.ok) {
          // Re-fetch jobs via a lightweight endpoint; for simplicity, force full reload.
          window.location.reload()
        }
        setLastRefresh(new Date().toISOString())
      }
    })
  }

  const globalCompleted = jobs.reduce((a, j) => a + Number(j.completed ?? 0), 0)
  const globalTotal     = jobs.reduce((a, j) => a + Number(j.total_target ?? 0), 0)
  const globalPct       = globalTotal > 0 ? Math.round((globalCompleted / globalTotal) * 10000) / 100 : 0

  return (
    <div style={{ background: BG, minHeight: '100vh', color: '#E2E8F0', padding: '1.5rem 2rem', fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ maxWidth: 1300, margin: '0 auto' }}>
        <header style={{ marginBottom: 20, display: 'flex', alignItems: 'end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 28, color: GOLD, margin: 0 }}>🧱 Content Jobs</h1>
            <p style={{ color: MUTED, fontSize: 13, margin: '4px 0 0' }}>
              Progression contenu multi-projets · {globalCompleted.toLocaleString()}/{globalTotal.toLocaleString()} ({globalPct}%)
              {lastRefresh && ` · refreshed ${new Date(lastRefresh).toLocaleTimeString()}`}
            </p>
          </div>
          <button
            onClick={refresh}
            disabled={refreshing}
            style={{ padding: '0.5rem 1rem', background: refreshing ? '#555' : GOLD, color: BG, border: 0, borderRadius: 6, fontWeight: 700, cursor: refreshing ? 'wait' : 'pointer' }}
          >
            {refreshing ? '⏳ Refresh…' : '🔄 Actualiser'}
          </button>
        </header>

        {Object.entries(byProject).map(([project, projectJobs]) => (
          <section key={project} style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 14, color: GOLD, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 10px' }}>
              {PROJECT_LABEL[project] ?? project}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {projectJobs.map((j) => <JobRow key={j.id} job={j} />)}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

function JobRow({ job }: { job: Job }) {
  const pct = Number(job.pct_done)
  const completed = Number(job.completed ?? 0)
  const total = Number(job.total_target ?? 0)
  const remaining = Math.max(0, total - completed)
  const perDay = job.items_per_day != null ? Number(job.items_per_day) : null
  const eta = job.eta_days != null ? Number(job.eta_days) : null
  const delta = Number(job.last_delta_today ?? 0)
  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '0.75rem 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{job.label}</div>
          {job.description && <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>{job.description}</div>}
        </div>
        <div style={{ fontSize: 12, color: MUTED, textAlign: 'right', whiteSpace: 'nowrap' }}>
          <b style={{ color: GOLD }}>{completed.toLocaleString()}</b>
          <span style={{ opacity: 0.6 }}> / {total.toLocaleString()}</span>
          <div style={{ fontSize: 10 }}>restant: {remaining.toLocaleString()}</div>
        </div>
      </div>
      <div style={{ height: 8, background: '#1E293B', borderRadius: 4, overflow: 'hidden', marginBottom: 6 }}>
        <div style={{ width: `${Math.min(100, pct)}%`, height: '100%', background: pct >= 100 ? '#10B981' : pct >= 50 ? GOLD : '#3B82F6', transition: 'width 200ms' }} />
      </div>
      <div style={{ display: 'flex', gap: 14, fontSize: 11, color: MUTED, flexWrap: 'wrap' }}>
        <span>📊 <b style={{ color: '#E2E8F0' }}>{pct}%</b></span>
        <span>⏱ {perDay != null ? `${perDay.toFixed(1)} items/j` : 'rythme N/A'}</span>
        <span>🎯 {eta != null ? `ETA ${eta.toFixed(0)} j` : 'ETA N/A'}</span>
        {delta !== 0 && <span style={{ color: delta > 0 ? '#10B981' : '#EF4444' }}>Δ 24h: {delta > 0 ? '+' : ''}{delta}</span>}
        <span style={{ marginLeft: 'auto' }}>{job.last_refreshed_at ? `refreshed ${new Date(job.last_refreshed_at).toLocaleString('fr-FR')}` : 'jamais refresh'}</span>
      </div>
    </div>
  )
}
