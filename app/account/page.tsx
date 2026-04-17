'use client'

// Account page for Command Center — password change only for now.
// Rest of the account model lives in FTG/OFA; CC is admin-only so we keep it minimal.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowser } from '@/lib/supabase'

export default function AccountPage() {
  const router = useRouter()
  const [email, setEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const sb = createSupabaseBrowser()
    sb.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push('/auth/login'); return }
      setEmail(data.user.email ?? null)
      setLoading(false)
    })
  }, [router])

  if (loading) {
    return <div style={{ minHeight: '100vh', background: '#07090F', color: '#9CA3AF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui' }}>Chargement…</div>
  }

  return (
    <div style={{ minHeight: '100vh', background: '#07090F', color: '#fff', fontFamily: 'system-ui', padding: 24 }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <Link href="/dashboard" style={{ color: '#C9A84C', fontSize: 13, textDecoration: 'none' }}>← Dashboard</Link>
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>Mon compte</h1>
        <p style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 24 }}>{email}</p>

        <div id="password" style={{ background: '#0D1117', border: '1px solid rgba(201,168,76,.15)', borderRadius: 16, padding: 24, scrollMarginTop: 80 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>🔑 Changer le mot de passe</h2>
          {email && <PasswordChangeBlock email={email} />}
        </div>

        <div style={{ marginTop: 16, padding: 16, background: 'rgba(245,158,11,.06)', border: '1px solid rgba(245,158,11,.25)', borderRadius: 12, fontSize: 12, color: '#FCD34D' }}>
          ⚠️ Command Center partage actuellement la table auth.users avec FTG / OFA / Estate.
          Un changement de password ici s'applique aux autres sites. Migration vers projets Supabase
          séparés planifiée (audit RGPD en cours).
        </div>
      </div>
    </div>
  )
}

function PasswordChangeBlock({ email }: { email: string }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [ok, setOk] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null); setOk(false)
    if (next.length < 10) { setErr('Minimum 10 caractères.'); return }
    if (next !== confirm) { setErr('Les mots de passe ne correspondent pas.'); return }
    if (next === current) { setErr('Le nouveau doit être différent de l\'actuel.'); return }
    setLoading(true)
    const sb = createSupabaseBrowser()
    // Re-authenticate first to confirm the user knows the current password.
    const { error: reErr } = await sb.auth.signInWithPassword({ email, password: current })
    if (reErr) { setLoading(false); setErr('Mot de passe actuel incorrect.'); return }
    const { error: upErr } = await sb.auth.updateUser({ password: next })
    setLoading(false)
    if (upErr) { setErr(upErr.message); return }
    setOk(true)
    setCurrent(''); setNext(''); setConfirm('')
  }

  const inputStyle = { width: '100%', padding: '10px 12px', background: '#111827', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, color: '#fff', marginBottom: 12, fontFamily: 'inherit', fontSize: 14 }

  return (
    <form onSubmit={submit}>
      <label style={{ display: 'block', fontSize: 11, color: '#9CA3AF', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Mot de passe actuel</label>
      <input type="password" value={current} onChange={e => setCurrent(e.target.value)} required style={inputStyle} autoComplete="current-password" />
      <label style={{ display: 'block', fontSize: 11, color: '#9CA3AF', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Nouveau mot de passe</label>
      <input type="password" value={next} onChange={e => setNext(e.target.value)} required style={inputStyle} autoComplete="new-password" minLength={10} />
      <label style={{ display: 'block', fontSize: 11, color: '#9CA3AF', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Confirmer</label>
      <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required style={inputStyle} autoComplete="new-password" />
      {err && <div style={{ background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)', borderRadius: 8, padding: 10, fontSize: 13, color: '#FCA5A5', marginBottom: 10 }}>{err}</div>}
      {ok && <div style={{ background: 'rgba(52,211,153,.1)', border: '1px solid rgba(52,211,153,.3)', borderRadius: 8, padding: 10, fontSize: 13, color: '#6EE7B7', marginBottom: 10 }}>✓ Mot de passe mis à jour. Ta session reste active — pas besoin de te reconnecter.</div>}
      <button type="submit" disabled={loading} style={{ width: '100%', padding: 11, background: '#C9A84C', color: '#07090F', border: 0, borderRadius: 8, fontWeight: 700, cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.6 : 1, fontFamily: 'inherit', fontSize: 14 }}>
        {loading ? 'Mise à jour…' : 'Changer le mot de passe'}
      </button>
    </form>
  )
}
