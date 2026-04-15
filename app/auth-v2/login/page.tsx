'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginV2Page() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    setLoading(true)
    try {
      const res = await fetch('/api/auth-v2/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ email, password }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (res.status === 429) setErr(`Trop de tentatives. Réessaie dans ${Math.ceil((j.retryInMs || 0) / 60000)} min.`)
        else setErr('Email ou mot de passe incorrect')
        return
      }
      router.push('/admin/overview')
    } catch {
      setErr('Erreur réseau')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-black text-white p-6">
      <div className="w-full max-w-md">
        <div className="text-xs uppercase tracking-widest text-emerald-400 mb-3">Auth V2 · test</div>
        <h1 className="text-2xl font-semibold mb-6">Sign in</h1>
        <form onSubmit={onSubmit} className="space-y-4">
          <input
            type="email"
            required
            placeholder="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded focus:border-emerald-400 outline-none"
          />
          <input
            type="password"
            required
            minLength={12}
            placeholder="password (min 12)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded focus:border-emerald-400 outline-none"
          />
          {err && <div className="text-red-400 text-sm">{err}</div>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 rounded font-medium text-black"
          >
            {loading ? '...' : 'Sign in (V2)'}
          </button>
        </form>
        <div className="mt-6 text-sm text-white/60 space-y-2">
          <div><Link href="/auth-v2/forgot" className="underline hover:text-white">Mot de passe oublié</Link></div>
          <div className="pt-4 border-t border-white/10"><Link href="/auth/login" className="text-xs underline hover:text-white">← V1 legacy</Link></div>
        </div>
      </div>
    </main>
  )
}
