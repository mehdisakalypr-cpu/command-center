'use client'

// Emergency direct-to-Supabase login page. Bypasses the CC /api/auth/login
// proxy entirely so broken middleware cannot block the bootstrap.
// All auth happens client-side with the browser SDK talking directly to Supabase.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowser } from '@/lib/supabase'

export default function EmergencyLogin() {
  const router = useRouter()
  const [email, setEmail] = useState('mehdi.sakalypr@gmail.com')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const sb = createSupabaseBrowser()
      try { await sb.auth.signOut({ scope: 'local' }) } catch { /* ignore */ }
      const { data, error: signErr } = await sb.auth.signInWithPassword({ email: email.trim().toLowerCase(), password })
      if (signErr) { setError(signErr.message); setLoading(false); return }
      if (!data.session) { setError('No session returned'); setLoading(false); return }
      // Session cookie is now set. Redirect to dashboard — middleware will see the session.
      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#07090F', padding: 24 }}>
      <form onSubmit={submit} style={{ maxWidth: 420, width: '100%', background: '#0D1117', border: '1px solid rgba(201,168,76,.25)', borderRadius: 16, padding: 32, color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: '#F59E0B', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>🛟 Emergency login</div>
          <div style={{ fontSize: 13, color: '#9CA3AF' }}>Direct to Supabase · bypasses CC middleware</div>
        </div>
        <label style={{ display: 'block', fontSize: 12, color: '#9CA3AF', marginBottom: 4 }}>Email</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
          style={{ width: '100%', padding: '10px 12px', background: '#111827', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, color: '#fff', marginBottom: 14 }} />
        <label style={{ display: 'block', fontSize: 12, color: '#9CA3AF', marginBottom: 4 }}>Password</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} required autoFocus
          style={{ width: '100%', padding: '10px 12px', background: '#111827', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, color: '#fff', marginBottom: 18 }} />
        {error && <div style={{ background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)', borderRadius: 8, padding: 10, fontSize: 13, color: '#FCA5A5', marginBottom: 14 }}>{error}</div>}
        <button type="submit" disabled={loading} style={{ width: '100%', padding: 12, background: '#C9A84C', color: '#07090F', border: 0, borderRadius: 8, fontWeight: 700, cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.6 : 1 }}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
        <div style={{ marginTop: 16, fontSize: 11, color: '#6B7280', textAlign: 'center' }}>
          This page skips Turnstile + rate-limit + /api/auth/login proxy. Use only if main login is broken.
        </div>
      </form>
    </div>
  )
}
