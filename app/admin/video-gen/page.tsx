'use client'

import { useEffect, useState } from 'react'
import { authFetch } from '@/lib/auth-v2/client-fetch'
import type { VideoRatio, VideoResolution, VideoTier } from '@/lib/video-gen/types'

const GOLD = '#C9A84C'
const BG = '#040D1C'
const FG = '#E8E0D0'
const DIM = '#7D8BA0'

type JobRow = {
  id: string
  status: string
  brief: string
  language: string
  resolution: VideoResolution
  ratio: VideoRatio
  tier: VideoTier
  output_url: string | null
  error_message: string | null
  created_at: string
  finished_at: string | null
}

const STATUS_COLORS: Record<string, string> = {
  pending: '#7D8BA0',
  scripting: '#6AC3E0',
  scene_gen: '#6AC3E0',
  voice_gen: '#6AC3E0',
  assembling: '#C9A84C',
  completed: '#7CE073',
  failed: '#E06A6A',
  cancelled: '#C9A84C',
}

export default function VideoGenAdmin() {
  const [jobs, setJobs] = useState<JobRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const [brief, setBrief] = useState('')
  const [tone, setTone] = useState('clair et dynamique')
  const [duration, setDuration] = useState(45)
  const [language, setLanguage] = useState('fr')
  const [resolution, setResolution] = useState<VideoResolution>('480p')
  const [ratio, setRatio] = useState<VideoRatio>('16:9')
  const [tier, setTier] = useState<VideoTier>('free')

  async function refresh() {
    try {
      const r = await authFetch('/api/video-gen/jobs')
      const j = await r.json()
      setJobs(j.jobs ?? [])
    } catch (e) {
      setError(String(e))
    }
  }

  useEffect(() => {
    refresh().finally(() => setLoading(false))
    const id = setInterval(refresh, 10_000)
    return () => clearInterval(id)
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (brief.trim().length < 10) return
    setCreating(true)
    try {
      const r = await authFetch('/api/video-gen/jobs', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          brief,
          tone,
          duration_s: duration,
          language,
          resolution,
          ratio,
          tier,
        }),
      })
      if (r.ok) {
        setBrief('')
        await refresh()
      } else {
        const j = await r.json().catch(() => ({}))
        setError(j.error ?? `HTTP ${r.status}`)
      }
    } finally {
      setCreating(false)
    }
  }

  const counts = jobs.reduce<Record<string, number>>((acc, j) => {
    acc[j.status] = (acc[j.status] ?? 0) + 1
    return acc
  }, {})

  return (
    <div
      style={{
        padding: 24,
        minHeight: '100vh',
        background: BG,
        color: FG,
        fontFamily: "Inter, 'Apple Color Emoji', 'Segoe UI Emoji', system-ui, sans-serif",
      }}
    >
      <header style={{ marginBottom: 24 }}>
        <div
          style={{
            fontSize: '.7rem',
            letterSpacing: '.18em',
            textTransform: 'uppercase',
            color: GOLD,
            fontWeight: 700,
            marginBottom: 4,
          }}
        >
          Video Gen · Hisoka #4
        </div>
        <h1 style={{ fontSize: '1.2rem', margin: 0 }}>
          Brief → explainer 30-90s (40 langs, Seedance + ElevenLabs + ffmpeg)
        </h1>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <form
          onSubmit={submit}
          style={{
            padding: 14,
            background: '#0A1628',
            border: '1px solid #1A2940',
            borderRadius: 4,
            display: 'grid',
            gap: 8,
          }}
        >
          <div style={{ fontSize: '.75rem', color: GOLD, marginBottom: 4 }}>Nouveau job</div>
          <textarea
            placeholder="Brief (sujet, audience, message clé)"
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            rows={4}
            style={inputStyle}
          />
          <input
            value={tone}
            onChange={(e) => setTone(e.target.value)}
            placeholder="Ton (ex: dynamique, corporate, humoristique)"
            style={inputStyle}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
            <input
              type="number"
              min={10}
              max={180}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              style={inputStyle}
            />
            <select value={language} onChange={(e) => setLanguage(e.target.value)} style={inputStyle}>
              {['fr', 'en', 'es', 'de', 'it', 'pt'].map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
            <select value={tier} onChange={(e) => setTier(e.target.value as VideoTier)} style={inputStyle}>
              <option value="free">free</option>
              <option value="pro">pro</option>
              <option value="team">team</option>
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            <select value={resolution} onChange={(e) => setResolution(e.target.value as VideoResolution)} style={inputStyle}>
              {['480p', '720p', '1080p'].map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <select value={ratio} onChange={(e) => setRatio(e.target.value as VideoRatio)} style={inputStyle}>
              {['16:9', '9:16', '1:1'].map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <button
            type="submit"
            disabled={creating || brief.trim().length < 10}
            style={{
              background: GOLD,
              color: BG,
              border: 'none',
              padding: '8px 14px',
              borderRadius: 4,
              fontSize: '.75rem',
              cursor: creating ? 'wait' : 'pointer',
              opacity: creating || brief.trim().length < 10 ? 0.5 : 1,
            }}
          >
            {creating ? 'Création…' : 'Lancer la génération'}
          </button>
        </form>

        <div
          style={{
            padding: 14,
            background: '#0A1628',
            border: '1px solid #1A2940',
            borderRadius: 4,
          }}
        >
          <div style={{ fontSize: '.75rem', color: GOLD, marginBottom: 8 }}>État pipeline</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, fontSize: '.7rem' }}>
            {Object.entries(counts).length === 0 ? (
              <div style={{ color: DIM }}>Aucun job pour l&apos;instant.</div>
            ) : (
              Object.entries(counts).map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: STATUS_COLORS[k] ?? FG }}>{k}</span>
                  <span>{v}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {loading && <div style={{ color: DIM }}>Chargement…</div>}
      {error && <div style={{ color: '#E06A6A', marginBottom: 12 }}>Erreur: {error}</div>}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', fontSize: '.7rem', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ color: GOLD, textAlign: 'left' }}>
              <th style={{ padding: 6 }}>Brief</th>
              <th style={{ padding: 6 }}>Lang</th>
              <th style={{ padding: 6 }}>Res</th>
              <th style={{ padding: 6 }}>Ratio</th>
              <th style={{ padding: 6 }}>Tier</th>
              <th style={{ padding: 6 }}>Statut</th>
              <th style={{ padding: 6 }}>Output</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((j) => (
              <tr key={j.id} style={{ borderTop: '1px solid #1A2940' }}>
                <td style={{ padding: 6, maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {j.brief}
                </td>
                <td style={{ padding: 6 }}>{j.language}</td>
                <td style={{ padding: 6 }}>{j.resolution}</td>
                <td style={{ padding: 6 }}>{j.ratio}</td>
                <td style={{ padding: 6 }}>{j.tier}</td>
                <td style={{ padding: 6, color: STATUS_COLORS[j.status] ?? FG }}>
                  {j.status}
                  {j.error_message && (
                    <div style={{ fontSize: '.6rem', color: '#E06A6A' }}>{j.error_message.slice(0, 60)}</div>
                  )}
                </td>
                <td style={{ padding: 6 }}>
                  {j.output_url ? (
                    <a href={j.output_url} target="_blank" rel="noreferrer" style={{ color: GOLD }}>
                      voir
                    </a>
                  ) : (
                    <span style={{ color: DIM }}>—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  background: '#040D1C',
  border: '1px solid #1A2940',
  color: '#E8E0D0',
  padding: '6px 8px',
  fontSize: '.72rem',
  borderRadius: 4,
  fontFamily: 'inherit',
}
