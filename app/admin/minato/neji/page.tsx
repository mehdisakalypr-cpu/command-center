'use client'

import { useEffect, useState } from 'react'

const C = {
  bg: '#0A1A2E', gold: '#C9A84C', text: '#E8E0D0',
  muted: '#9BA8B8', dim: '#5A6A7A', green: '#10B981',
  purple: '#A78BFA', blue: '#3B82F6', red: '#EF4444', amber: '#FBBF24',
}

const OFA_BASE = process.env.NEXT_PUBLIC_OFA_BASE_URL ?? 'https://one-for-all-app.vercel.app'

type ProviderSlack = {
  provider: string
  quotaLeft: number
  quotaTotal: number
  capacityLeftPct: number
  cooldownUntil?: number
}
type Amp = { id: string; name: string; worker: string; cmd: string; shouldRun: boolean }
type Cycle = { ts: string; slacks: ProviderSlack[]; amplifications: Amp[]; triggeredCount: number }

export default function NejiPage() {
  const [cycle, setCycle] = useState<Cycle | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function refresh() {
    setLoading(true); setError(null)
    try {
      const res = await fetch(`${OFA_BASE}/api/minato/neji`, { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erreur NEJI cycle')
      setCycle(data)
    } catch (e: any) { setError(e.message) }
    setLoading(false)
  }

  useEffect(() => { refresh() }, [])

  return (
    <div style={{ padding: 24, color: C.text, maxWidth: 1400, margin: '0 auto' }}>
      <header style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 4 }}>
          <span style={{ fontSize: '2.5rem' }}>👁️</span>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: C.purple, margin: 0 }}>
              NEJI — Zone de défense absolue 360°
            </h1>
            <p style={{ color: C.muted, fontSize: '.85rem', margin: '4px 0 0' }}>
              Superviseur Hakkeshō Kaiten. Byakugan scan les free-tiers → amplifications zero-cost déléguées à Minato.
            </p>
          </div>
        </div>

        <div style={{ marginTop: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
          <button onClick={refresh} disabled={loading}
            style={{ padding: '8px 16px', background: C.purple, color: C.bg, border: 'none', borderRadius: 4, fontWeight: 700, cursor: 'pointer', fontSize: '.85rem' }}>
            {loading ? '⏳ Scan Byakugan...' : '🔄 Refresh cycle'}
          </button>
          {cycle && (
            <span style={{ fontSize: '.8rem', color: C.muted }}>
              Dernier cycle : {new Date(cycle.ts).toLocaleTimeString('fr-FR')} ·{' '}
              <b style={{ color: C.green }}>{cycle.triggeredCount}</b> amplifications déclenchables / {cycle.amplifications.length}
            </span>
          )}
        </div>
        {error && <div style={{ marginTop: 12, padding: 10, background: `${C.red}20`, color: C.red, borderRadius: 4, fontSize: '.85rem' }}>⚠️ {error}</div>}
      </header>

      {cycle && (
        <>
          <section style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: '.95rem', fontWeight: 700, color: C.purple, margin: '0 0 12px', borderLeft: `3px solid ${C.purple}`, paddingLeft: 10 }}>
              🔎 Byakugan scan — Free-tier slack
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
              {cycle.slacks.map(s => {
                const pct = Math.round(s.capacityLeftPct * 100)
                const color = pct > 60 ? C.green : pct > 30 ? C.amber : C.red
                const cooldown = s.cooldownUntil && s.cooldownUntil > Date.now()
                return (
                  <div key={s.provider} style={{ padding: 10, background: C.bg, border: `1px solid ${color}33`, borderRadius: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.72rem', color: C.muted, marginBottom: 4 }}>
                      <span style={{ textTransform: 'uppercase', letterSpacing: '.05em' }}>{s.provider}</span>
                      {cooldown && <span style={{ color: C.red }}>⏸️ cooldown</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                      <span style={{ fontSize: '1.2rem', fontWeight: 700, color }}>{pct}%</span>
                      <span style={{ fontSize: '.7rem', color: C.dim }}>({s.quotaLeft.toLocaleString()}/{s.quotaTotal.toLocaleString()})</span>
                    </div>
                    <div style={{ height: 4, background: 'rgba(255,255,255,.05)', borderRadius: 2, marginTop: 6, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: color, transition: 'width .3s' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          <section>
            <h2 style={{ fontSize: '.95rem', fontWeight: 700, color: C.green, margin: '0 0 12px', borderLeft: `3px solid ${C.green}`, paddingLeft: 10 }}>
              🌀 Amplifications — triées par priorité
            </h2>
            <div style={{ display: 'grid', gap: 10 }}>
              {cycle.amplifications.map(a => (
                <div key={a.id} style={{
                  padding: 12, borderRadius: 6, background: C.bg,
                  border: `1px solid ${a.shouldRun ? C.green : C.dim}33`,
                  opacity: a.shouldRun ? 1 : 0.55,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ fontSize: '.72rem', padding: '2px 6px', borderRadius: 3, background: a.shouldRun ? `${C.green}30` : `${C.dim}30`, color: a.shouldRun ? C.green : C.dim, fontWeight: 700 }}>
                          {a.shouldRun ? '✅ TRIGGER' : '⏸️ SKIP'}
                        </span>
                        <span style={{ fontSize: '.72rem', color: C.purple }}>{a.worker}</span>
                        <span style={{ fontSize: '.9rem', fontWeight: 600 }}>{a.name}</span>
                      </div>
                      <code style={{ fontSize: '.7rem', color: C.muted, fontFamily: 'monospace', display: 'block', marginTop: 4 }}>
                        {a.cmd}
                      </code>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      <footer style={{ marginTop: 32, padding: 14, background: C.bg, border: `1px dashed ${C.dim}`, borderRadius: 6, fontSize: '.78rem', color: C.muted }}>
        💡 NEJI ne fait que <b>voir</b> (Byakugan) et <b>décider</b>. L&apos;exécution est déléguée aux personnages Minato (⚓ NAMI, 🦊 KURAMA, 💚 DEKU, 🐈‍⬛ BEERUS...).
        Source : <code>agents/lib/neji-defense-zone.ts</code> · API : <code>{OFA_BASE}/api/minato/neji</code>.
      </footer>
    </div>
  )
}
