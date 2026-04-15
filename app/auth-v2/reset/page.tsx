'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ResetV2Page() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [err, setErr] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    const res = await fetch('/api/auth-v2/reset', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ password }),
    })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setErr(j.error ?? 'reset_failed')
      return
    }
    router.push('/auth-v2/login?reset=ok')
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-black text-white p-6">
      <div className="w-full max-w-md">
        <div className="text-xs uppercase tracking-widest text-emerald-400 mb-3">Auth V2 · reset</div>
        <h1 className="text-2xl font-semibold mb-6">New password</h1>
        <form onSubmit={onSubmit} className="space-y-4">
          <input
            type="password"
            required
            minLength={12}
            placeholder="new password (min 12)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded focus:border-emerald-400 outline-none"
          />
          {err && <div className="text-red-400 text-sm">{err}</div>}
          <button type="submit" className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 rounded font-medium text-black">
            Save
          </button>
        </form>
      </div>
    </main>
  )
}
