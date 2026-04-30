'use client'

import { useEffect, useState, useCallback } from 'react'

type Job = {
  id: string
  url: string
  platform: string
  status: string
  title: string | null
  uploader: string | null
  duration_s: number | null
  language: string | null
  error: string | null
  cost_eur: number | null
  created_at: string
  finished_at: string | null
}

type JobDetail = Job & {
  transcript: string | null
  analysis: {
    summary?: string
    key_points?: string[]
    hook?: string
    cta?: string
    sentiment?: string
    audience?: string
    actionable?: string[]
    custom?: string
  } | null
  user_prompt: string | null
}

const STATUS_COLOR: Record<string, string> = {
  pending: '#6B7280',
  downloading: '#3B82F6',
  transcribing: '#8B5CF6',
  analyzing: '#F59E0B',
  done: '#10B981',
  failed: '#EF4444',
}

const PLATFORM_ICON: Record<string, string> = {
  youtube: '📺',
  tiktok: '🎵',
  vimeo: '🎬',
  twitter: '𝕏',
  instagram: '📷',
  other: '🔗',
}

function fmtDuration(s: number | null): string {
  if (!s) return '—'
  const m = Math.floor(s / 60)
  const r = s % 60
  return m ? `${m}m${String(r).padStart(2, '0')}s` : `${r}s`
}

function fmtAge(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return `${diff}s`
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return `${Math.floor(diff / 86400)}d`
}

export default function VideoAnalyzerPage() {
  const [url, setUrl] = useState('')
  const [userPrompt, setUserPrompt] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [jobs, setJobs] = useState<Job[]>([])
  const [selected, setSelected] = useState<JobDetail | null>(null)

  const refreshList = useCallback(async () => {
    const r = await fetch('/api/admin/video-analyzer', { cache: 'no-store' })
    const j = await r.json()
    setJobs(j.jobs ?? [])
  }, [])

  const refreshSelected = useCallback(async (id: string) => {
    const r = await fetch(`/api/admin/video-analyzer/${id}`, { cache: 'no-store' })
    if (!r.ok) return
    const j = await r.json()
    if (j.job) setSelected(j.job)
  }, [])

  useEffect(() => {
    refreshList()
    const iv = setInterval(refreshList, 5000)
    return () => clearInterval(iv)
  }, [refreshList])

  useEffect(() => {
    if (!selected) return
    if (selected.status === 'done' || selected.status === 'failed') return
    const iv = setInterval(() => refreshSelected(selected.id), 3000)
    return () => clearInterval(iv)
  }, [selected, refreshSelected])

  const submit = async () => {
    if (!url.trim()) return
    setSubmitting(true)
    try {
      const r = await fetch('/api/admin/video-analyzer', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), user_prompt: userPrompt.trim() || undefined }),
      })
      const j = await r.json()
      if (j.ok) {
        setUrl('')
        setUserPrompt('')
        await refreshList()
        if (j.id) await refreshSelected(j.id)
      } else {
        alert(j.error ?? 'submission failed')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const onDelete = async (id: string) => {
    if (!confirm('Supprimer cette analyse ?')) return
    await fetch(`/api/admin/video-analyzer/${id}`, { method: 'DELETE' })
    if (selected?.id === id) setSelected(null)
    await refreshList()
  }

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>📹 Video Analyzer</h1>
      <p style={{ color: '#9CA3AF', marginBottom: 24, fontSize: 14 }}>
        Colle une URL YouTube / TikTok / Vimeo / Twitter / Instagram. Le worker télécharge l'audio,
        transcrit via Groq Whisper et analyse avec Claude. Ne pas utiliser pour vidéos privées.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <section>
          <h2 style={{ fontSize: 16, marginBottom: 12 }}>Nouvelle analyse</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.tiktok.com/@user/video/123 — ou youtube.com/watch?v=..."
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) submit() }}
              style={{
                padding: 12, borderRadius: 6, border: '1px solid #374151',
                background: '#1F2937', color: '#F9FAFB', fontSize: 14,
              }}
            />
            <textarea
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              placeholder="(optionnel) angle d'analyse spécifique — ex: 'extrais les hooks marketing', 'liste les claims chiffrés', 'qu'est-ce qui rend cette vidéo virale ?'"
              rows={3}
              style={{
                padding: 12, borderRadius: 6, border: '1px solid #374151',
                background: '#1F2937', color: '#F9FAFB', fontSize: 13, resize: 'vertical',
                fontFamily: 'inherit',
              }}
            />
            <button
              onClick={submit}
              disabled={submitting || !url.trim()}
              style={{
                padding: '10px 16px', borderRadius: 6,
                background: submitting ? '#4B5563' : '#3B82F6',
                color: '#FFF', border: 'none', cursor: submitting ? 'not-allowed' : 'pointer',
                fontSize: 14, fontWeight: 600,
              }}
            >
              {submitting ? 'Soumission…' : 'Analyser'}
            </button>
          </div>

          <h2 style={{ fontSize: 16, marginTop: 32, marginBottom: 12 }}>Historique (50 derniers)</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 600, overflowY: 'auto' }}>
            {jobs.length === 0 && (
              <div style={{ color: '#6B7280', fontSize: 13, padding: 12 }}>Aucune analyse encore.</div>
            )}
            {jobs.map((j) => (
              <div
                key={j.id}
                onClick={() => refreshSelected(j.id)}
                style={{
                  padding: 10, borderRadius: 6, cursor: 'pointer',
                  background: selected?.id === j.id ? '#1E3A8A' : '#1F2937',
                  border: '1px solid #374151',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8,
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#F3F4F6', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {PLATFORM_ICON[j.platform] ?? '🔗'} {j.title ?? j.url}
                  </div>
                  <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
                    {j.uploader ? `${j.uploader} · ` : ''}
                    {fmtDuration(j.duration_s)} · {fmtAge(j.created_at)} ago
                  </div>
                </div>
                <span style={{
                  padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                  background: STATUS_COLOR[j.status] ?? '#6B7280', color: '#FFF',
                }}>
                  {j.status}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 style={{ fontSize: 16, marginBottom: 12 }}>Détail</h2>
          {!selected && (
            <div style={{ color: '#6B7280', fontSize: 13, padding: 12, border: '1px dashed #374151', borderRadius: 6 }}>
              Sélectionne un item dans l'historique.
            </div>
          )}
          {selected && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ background: '#1F2937', padding: 16, borderRadius: 8, border: '1px solid #374151' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: '#F3F4F6' }}>
                      {PLATFORM_ICON[selected.platform] ?? '🔗'} {selected.title ?? selected.url}
                    </div>
                    {selected.uploader && (
                      <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>par {selected.uploader}</div>
                    )}
                    <a href={selected.url} target="_blank" rel="noreferrer"
                       style={{ fontSize: 11, color: '#60A5FA', wordBreak: 'break-all', display: 'block', marginTop: 6 }}>
                      {selected.url}
                    </a>
                  </div>
                  <button
                    onClick={() => onDelete(selected.id)}
                    style={{ padding: '4px 10px', fontSize: 12, background: '#7F1D1D', color: '#FCA5A5', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                  >
                    Supprimer
                  </button>
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 12, fontSize: 12, color: '#9CA3AF' }}>
                  <span>Status: <strong style={{ color: STATUS_COLOR[selected.status] ?? '#6B7280' }}>{selected.status}</strong></span>
                  <span>Durée: {fmtDuration(selected.duration_s)}</span>
                  <span>Langue: {selected.language ?? '—'}</span>
                  {selected.cost_eur != null && <span>Coût: €{Number(selected.cost_eur).toFixed(4)}</span>}
                </div>
                {selected.error && (
                  <div style={{ marginTop: 12, padding: 10, background: '#7F1D1D', color: '#FECACA', borderRadius: 4, fontSize: 12 }}>
                    ⚠️ {selected.error}
                  </div>
                )}
              </div>

              {selected.user_prompt && (
                <div style={{ background: '#1E3A8A', padding: 12, borderRadius: 8, border: '1px solid #3B82F6' }}>
                  <div style={{ fontSize: 11, color: '#93C5FD', marginBottom: 4 }}>Angle demandé :</div>
                  <div style={{ fontSize: 13, color: '#F3F4F6' }}>{selected.user_prompt}</div>
                </div>
              )}

              {selected.analysis && (
                <div style={{ background: '#1F2937', padding: 16, borderRadius: 8, border: '1px solid #374151' }}>
                  <h3 style={{ fontSize: 14, marginBottom: 12, color: '#F3F4F6' }}>🧠 Analyse Claude</h3>
                  {selected.analysis.summary && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 4 }}>Résumé</div>
                      <div style={{ fontSize: 13, color: '#F3F4F6', lineHeight: 1.5 }}>{selected.analysis.summary}</div>
                    </div>
                  )}
                  {selected.analysis.hook && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 4 }}>Hook</div>
                      <div style={{ fontSize: 13, color: '#FDE68A' }}>{selected.analysis.hook}</div>
                    </div>
                  )}
                  {selected.analysis.key_points && selected.analysis.key_points.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 4 }}>Points clés</div>
                      <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: '#F3F4F6', lineHeight: 1.6 }}>
                        {selected.analysis.key_points.map((p, i) => <li key={i}>{p}</li>)}
                      </ul>
                    </div>
                  )}
                  {selected.analysis.actionable && selected.analysis.actionable.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 4 }}>Actionnable</div>
                      <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: '#A7F3D0', lineHeight: 1.6 }}>
                        {selected.analysis.actionable.map((p, i) => <li key={i}>{p}</li>)}
                      </ul>
                    </div>
                  )}
                  {selected.analysis.cta && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 4 }}>CTA détecté</div>
                      <div style={{ fontSize: 13, color: '#F3F4F6' }}>{selected.analysis.cta}</div>
                    </div>
                  )}
                  {(selected.analysis.sentiment || selected.analysis.audience) && (
                    <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#9CA3AF' }}>
                      {selected.analysis.sentiment && <span>Ton : {selected.analysis.sentiment}</span>}
                      {selected.analysis.audience && <span>Audience : {selected.analysis.audience}</span>}
                    </div>
                  )}
                  {selected.analysis.custom && (
                    <div style={{ marginTop: 16, padding: 12, background: '#1E3A8A', borderRadius: 6 }}>
                      <div style={{ fontSize: 11, color: '#93C5FD', marginBottom: 4 }}>Réponse à ton angle</div>
                      <div style={{ fontSize: 13, color: '#F3F4F6', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                        {selected.analysis.custom}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {selected.transcript && (
                <details style={{ background: '#1F2937', padding: 16, borderRadius: 8, border: '1px solid #374151' }}>
                  <summary style={{ fontSize: 14, color: '#F3F4F6', cursor: 'pointer' }}>
                    📝 Transcription brute ({selected.transcript.length.toLocaleString()} car.)
                  </summary>
                  <pre style={{ marginTop: 12, fontSize: 12, color: '#D1D5DB', whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 400, overflowY: 'auto' }}>
                    {selected.transcript}
                  </pre>
                </details>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
