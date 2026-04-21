'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type Credential = {
  id: string
  site_slug: string
  platform: string
  handle: string | null
  auth_type: string
  metadata_json: Record<string, unknown>
  created_at: string
  updated_at: string
  last_accessed_at: string | null
}

const SITES = [
  { slug: 'ftg', label: 'Feel The Gap', color: '#60A5FA' },
  { slug: 'ofa', label: 'One For All', color: '#C9A84C' },
  { slug: 'cc', label: 'Command Center', color: '#A78BFA' },
  { slug: 'estate', label: 'The Estate', color: '#F59E0B' },
  { slug: 'shift', label: 'Shift Dynamics', color: '#10B981' },
]

const PLATFORMS = [
  'email', 'linkedin', 'instagram', 'facebook', 'x_twitter', 'tiktok',
  'snapchat', 'whatsapp_business', 'youtube', 'telegram', 'reddit', 'pinterest', 'discord', 'medium', 'substack',
]

const AUTH_TYPES = ['api_key', 'oauth_token', 'refresh_token', 'bot_token', 'bearer_token', 'app_password', 'password']

const C = {
  bg: '#040D1C', card: '#071425', border: 'rgba(201,168,76,.15)',
  gold: '#C9A84C', green: '#10B981', muted: '#5A6A7A', text: '#E8E0D0', red: '#F87171',
}

export default function CredentialsClient() {
  const [creds, setCreds] = useState<Credential[]>([])
  const [selectedSite, setSelectedSite] = useState<string>('ftg')
  const [loading, setLoading] = useState(true)
  const [revealed, setRevealed] = useState<Record<string, string>>({})
  const [editing, setEditing] = useState<Credential | null>(null)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => { loadCreds() }, [selectedSite])

  async function loadCreds() {
    setLoading(true)
    const r = await fetch(`/api/admin/credentials?site=${selectedSite}`)
    const j = await r.json()
    setCreds(j.credentials || [])
    setLoading(false)
  }

  async function reveal(id: string) {
    if (revealed[id]) {
      setRevealed(prev => { const n = { ...prev }; delete n[id]; return n })
      return
    }
    const r = await fetch(`/api/admin/credentials/${id}/reveal`, { method: 'POST' })
    const j = await r.json()
    if (j.credential) setRevealed(prev => ({ ...prev, [id]: j.credential }))
  }

  async function del(id: string) {
    if (!confirm('Supprimer ce credential ?')) return
    await fetch('/api/admin/credentials', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    loadCreds()
  }

  const siteCreds = creds.filter(c => c.site_slug === selectedSite)

  return (
    <div style={{ padding: 24, color: C.text, fontFamily: "Inter, 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', 'Segoe UI Symbol', system-ui, sans-serif" }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>🔐 Coffre-fort Credentials Sociaux</h1>
          <p style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>Credentials chiffrés (pgcrypto) · Utilisés par les agents de post automatique</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href="/admin/campaigns" style={{ fontSize: 12, color: C.gold, padding: '6px 12px', border: `1px solid ${C.border}`, borderRadius: 6, textDecoration: 'none' }}>← Campagnes</Link>
          <button onClick={() => { setEditing(null); setShowForm(true) }} style={{ fontSize: 12, color: '#000', background: C.gold, padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 700 }}>+ Ajouter</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 16, flexWrap: 'wrap' }}>
        {SITES.map(s => (
          <button key={s.slug} onClick={() => setSelectedSite(s.slug)} style={{
            padding: '6px 14px', fontSize: 12, cursor: 'pointer',
            background: selectedSite === s.slug ? `${s.color}22` : 'rgba(255,255,255,.03)',
            border: `1px solid ${selectedSite === s.slug ? `${s.color}66` : C.border}`,
            color: selectedSite === s.slug ? s.color : C.muted,
            borderRadius: 6, fontWeight: selectedSite === s.slug ? 700 : 400,
          }}>{s.label} ({creds.filter(c => c.site_slug === s.slug).length})</button>
        ))}
      </div>

      {loading ? <p style={{ color: C.muted }}>Chargement…</p> : (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead style={{ background: 'rgba(255,255,255,.03)' }}>
              <tr>
                <th style={th}>Plateforme</th>
                <th style={th}>Handle</th>
                <th style={th}>Type</th>
                <th style={th}>Credential</th>
                <th style={th}>Mis à jour</th>
                <th style={th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {siteCreds.length === 0 ? (
                <tr><td colSpan={6} style={{ ...td, textAlign: 'center', color: C.muted, padding: 24 }}>Aucun credential — clique « Ajouter »</td></tr>
              ) : siteCreds.map(c => (
                <tr key={c.id} style={{ borderTop: '1px solid rgba(255,255,255,.04)' }}>
                  <td style={td}><span style={{ color: C.gold, fontWeight: 600 }}>{c.platform}</span></td>
                  <td style={td}>{c.handle || '—'}</td>
                  <td style={td}><span style={{ fontSize: 10, padding: '2px 6px', background: 'rgba(255,255,255,.05)', borderRadius: 4 }}>{c.auth_type}</span></td>
                  <td style={{ ...td, fontFamily: 'monospace' }}>
                    <span style={{ color: revealed[c.id] ? C.text : C.muted }}>
                      {revealed[c.id] || '••••••••••••••••'}
                    </span>
                    <button onClick={() => reveal(c.id)} title={revealed[c.id] ? 'Masquer' : 'Afficher'} style={iconBtn}>
                      {revealed[c.id] ? '🙈' : '👁'}
                    </button>
                    {revealed[c.id] && (
                      <button onClick={() => navigator.clipboard.writeText(revealed[c.id])} title="Copier" style={iconBtn}>📋</button>
                    )}
                  </td>
                  <td style={{ ...td, color: C.muted }}>{c.updated_at?.slice(0, 10)}</td>
                  <td style={td}>
                    <button onClick={() => { setEditing(c); setShowForm(true) }} style={actionBtn}>Éditer</button>
                    <button onClick={() => del(c.id)} style={{ ...actionBtn, color: C.red }}>Supprimer</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <CredentialForm
          initial={editing}
          defaultSite={selectedSite}
          onClose={() => { setShowForm(false); setEditing(null); loadCreds() }}
        />
      )}
    </div>
  )
}

function CredentialForm({ initial, defaultSite, onClose }: { initial: Credential | null; defaultSite: string; onClose: () => void }) {
  const [site_slug, setSite] = useState(initial?.site_slug || defaultSite)
  const [platform, setPlatform] = useState(initial?.platform || 'email')
  const [handle, setHandle] = useState(initial?.handle || '')
  const [auth_type, setAuthType] = useState(initial?.auth_type || 'api_key')
  const [credential, setCredential] = useState('')
  const [showCred, setShowCred] = useState(false)
  const [metadata, setMetadata] = useState(JSON.stringify(initial?.metadata_json || {}, null, 2))
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function save() {
    setErr(null)
    if (!initial && !credential) { setErr('Credential requis'); return }
    let metadata_json = {}
    try { metadata_json = metadata ? JSON.parse(metadata) : {} } catch { setErr('JSON metadata invalide'); return }
    setSaving(true)
    const body: Record<string, unknown> = { site_slug, platform, handle, auth_type, metadata_json }
    if (initial) body.id = initial.id
    if (credential) body.credential = credential
    const r = await fetch('/api/admin/credentials', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const j = await r.json()
    setSaving(false)
    if (!r.ok) { setErr(j.error || 'Erreur'); return }
    onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={onClose}>
      <div style={{ background: '#071425', border: '1px solid rgba(201,168,76,.2)', borderRadius: 8, padding: 20, width: 480, maxWidth: '90vw' }} onClick={e => e.stopPropagation()}>
        <h2 style={{ margin: 0, marginBottom: 16, fontSize: 16 }}>{initial ? 'Éditer credential' : 'Ajouter credential'}</h2>
        <Field label="Site">
          <select value={site_slug} onChange={e => setSite(e.target.value)} style={input}>
            {['ftg','ofa','cc','estate','shift'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Plateforme">
          <select value={platform} onChange={e => setPlatform(e.target.value)} style={input}>
            {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </Field>
        <Field label="Handle / identifiant public"><input value={handle} onChange={e => setHandle(e.target.value)} style={input} placeholder="@compte ou contact@..." /></Field>
        <Field label="Type d'auth">
          <select value={auth_type} onChange={e => setAuthType(e.target.value)} style={input}>
            {AUTH_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Field label={initial ? 'Credential (laisser vide pour conserver)' : 'Credential (token, API key, password)'}>
          <div style={{ position: 'relative' }}>
            <input type={showCred ? 'text' : 'password'} value={credential} onChange={e => setCredential(e.target.value)} style={{ ...input, paddingRight: 36 }} />
            <button type="button" onClick={() => setShowCred(s => !s)} style={{ position: 'absolute', right: 8, top: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#9BA8B8' }}>{showCred ? '🙈' : '👁'}</button>
          </div>
        </Field>
        <Field label="Metadata (JSON)"><textarea value={metadata} onChange={e => setMetadata(e.target.value)} style={{ ...input, minHeight: 80, fontFamily: 'monospace', fontSize: 11 }} /></Field>
        {err && <p style={{ color: '#F87171', fontSize: 12, marginBottom: 8 }}>{err}</p>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
          <button onClick={onClose} style={{ ...btn, background: 'rgba(255,255,255,.05)', color: '#E8E0D0' }}>Annuler</button>
          <button onClick={save} disabled={saving} style={{ ...btn, background: '#C9A84C', color: '#000' }}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
        </div>
      </div>
    </div>
  )
}

const th: React.CSSProperties = { textAlign: 'left', padding: '10px 12px', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.08em', color: '#9BA8B8', fontWeight: 600 }
const td: React.CSSProperties = { padding: '10px 12px', verticalAlign: 'middle' }
const iconBtn: React.CSSProperties = { marginLeft: 6, background: 'transparent', border: 'none', cursor: 'pointer', color: '#9BA8B8', fontSize: 13 }
const actionBtn: React.CSSProperties = { background: 'transparent', border: 'none', color: '#C9A84C', fontSize: 11, cursor: 'pointer', marginRight: 8 }
const input: React.CSSProperties = { width: '100%', padding: '8px 10px', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(201,168,76,.2)', borderRadius: 6, color: '#fff', fontSize: 12 }
const btn: React.CSSProperties = { padding: '8px 16px', borderRadius: 6, border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer' }

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label style={{ display: 'block', marginBottom: 10 }}><div style={{ fontSize: 10, color: '#9BA8B8', marginBottom: 4 }}>{label}</div>{children}</label>
}
