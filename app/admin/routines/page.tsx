'use client'

import { useEffect, useState } from 'react'

type Routine = {
  id: string; name: string; schedule: string; script: string; objective: string
  phase: string[]; log: string | null; enabled: boolean
}
type Registry = {
  version: number; updated_at: string
  phases: Record<string, string>
  routines: Routine[]
  future_post_launch: { id: string; schedule: string; objective: string }[]
}
type Report = { week: string; path: string; size: number; mtime: string }

const C = { bg: '#040D1C', card: '#071425', border: 'rgba(201,168,76,.15)', gold: '#C9A84C', muted: '#5A6A7A', text: '#E8E0D0', green: '#10B981', red: '#F87171', blue: '#60A5FA' }

export default function RoutinesPage() {
  const [registry, setRegistry] = useState<Registry | null>(null)
  const [reports, setReports] = useState<Report[]>([])
  const [isVps, setIsVps] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedReport, setSelectedReport] = useState<{ week: string; content: string } | null>(null)

  useEffect(() => {
    fetch('/api/admin/routines').then(r => r.json()).then(d => {
      if (d.ok) {
        setRegistry(d.registry); setReports(d.reports); setIsVps(d.isVps)
      } else setError(d.error || 'Erreur')
      setLoading(false)
    }).catch(e => { setError(String(e)); setLoading(false) })
  }, [])

  async function loadReport(week: string) {
    const r = await fetch(`/api/admin/routines/report?week=${week}`)
    const d = await r.json()
    if (d.ok) setSelectedReport({ week, content: d.content })
  }

  if (loading) return <div style={{ padding: 24, color: C.text }}>Chargement…</div>

  return (
    <div style={{ padding: 24, color: C.text, fontFamily: "Inter, 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', 'Segoe UI Symbol', system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>🌀 Routines</h1>
      <p style={{ color: C.muted, fontSize: 13, marginBottom: 20 }}>
        Catalog des cron + scripts qui pilotent automatisation. Self-critique méta-loop weekly Sun 6am.
        {isVps === false && ' (Mode Vercel — registry visible si DEPLOYMENT_ENV=vps)'}
      </p>

      {error && <div style={{ color: C.red, padding: 12, border: `1px solid ${C.red}`, marginBottom: 16 }}>Erreur : {error}</div>}

      {registry && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 24 }}>
            <Stat label="Routines actives" value={registry.routines.filter(r => r.enabled).length} />
            <Stat label="Total registry" value={registry.routines.length} />
            <Stat label="Observables (avec log)" value={registry.routines.filter(r => r.log).length} />
            <Stat label="Reports semaine" value={reports.length} />
          </div>

          <Section title="📋 Routines actives" subtitle={`Version ${registry.version} · maj ${registry.updated_at}`}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ color: C.muted, textAlign: 'left', borderBottom: `1px solid ${C.border}` }}>
                    <th style={th}>ID</th><th style={th}>Schedule</th><th style={th}>Phase</th><th style={th}>Objectif</th><th style={th}>Log</th>
                  </tr>
                </thead>
                <tbody>
                  {registry.routines.map(r => (
                    <tr key={r.id} style={{ borderBottom: `1px solid rgba(201,168,76,.06)` }}>
                      <td style={td}>
                        <strong style={{ color: r.enabled ? C.gold : C.muted }}>{r.id}</strong>
                        <div style={{ color: C.muted, fontSize: 10 }}>{r.script}</div>
                      </td>
                      <td style={{ ...td, fontFamily: 'monospace', color: C.blue }}>{r.schedule}</td>
                      <td style={td}>
                        {r.phase.map(p => (
                          <span key={p} style={{ fontSize: 9, padding: '1px 6px', marginRight: 4, background: p === 'now' ? 'rgba(16,185,129,.15)' : 'rgba(96,165,250,.15)', color: p === 'now' ? C.green : C.blue }}>{p}</span>
                        ))}
                      </td>
                      <td style={{ ...td, color: C.text }}>{r.objective}</td>
                      <td style={{ ...td, fontSize: 10, color: r.log ? C.green : C.red }}>{r.log ?? '— invisible'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section title="🌀 Self-critique reports" subtitle="Méta-loop hebdo — propose patches routines automatiquement">
            {reports.length === 0 ? (
              <p style={{ color: C.muted, fontSize: 13 }}>Aucun report encore. Premier passage cron : dimanche 6am.</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {reports.map(r => (
                  <li key={r.week} style={{ padding: 8, borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => loadReport(r.week)}>
                    <span><strong style={{ color: C.gold }}>{r.week}</strong> <span style={{ color: C.muted, fontSize: 11, marginLeft: 8 }}>{(r.size / 1024).toFixed(1)} kB · {new Date(r.mtime).toLocaleString('fr-FR')}</span></span>
                    <span style={{ color: C.blue, fontSize: 12 }}>Voir →</span>
                  </li>
                ))}
              </ul>
            )}
            {selectedReport && (
              <div style={{ marginTop: 16, padding: 16, background: '#020817', border: `1px solid ${C.border}`, fontSize: 11, fontFamily: 'monospace', whiteSpace: 'pre-wrap', maxHeight: 500, overflowY: 'auto' }}>
                {selectedReport.content}
              </div>
            )}
          </Section>

          <Section title="🚀 Routines futures (post-launch)" subtitle="Activées quand Stripe live + MRR > 0">
            <ul style={{ fontSize: 12, color: C.muted, lineHeight: 1.8 }}>
              {registry.future_post_launch.map(r => (
                <li key={r.id}>
                  <strong style={{ color: C.text, fontFamily: 'monospace' }}>{r.id}</strong>
                  <span style={{ color: C.blue, margin: '0 8px', fontFamily: 'monospace' }}>{r.schedule}</span>
                  <span>{r.objective}</span>
                </li>
              ))}
            </ul>
          </Section>
        </>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, padding: 14 }}>
      <div style={{ color: C.muted, fontSize: 10, letterSpacing: '.18em', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
      <div style={{ color: C.gold, fontSize: 28, fontWeight: 700 }}>{value}</div>
    </div>
  )
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, padding: 20, marginBottom: 20 }}>
      <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: C.text }}>{title}</h2>
      {subtitle && <p style={{ color: C.muted, fontSize: 12, margin: '4px 0 14px' }}>{subtitle}</p>}
      {children}
    </div>
  )
}

const th: React.CSSProperties = { padding: '8px 10px', fontWeight: 600, fontSize: 11, letterSpacing: '.05em', textTransform: 'uppercase' }
const td: React.CSSProperties = { padding: '8px 10px', verticalAlign: 'top' }
