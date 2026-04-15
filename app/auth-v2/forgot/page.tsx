'use client'

import { useState } from 'react'

export default function ForgotV2Page() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    await fetch('/api/auth-v2/forgot', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    setSent(true)
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-black text-white p-6">
      <div className="w-full max-w-md">
        <div className="text-xs uppercase tracking-widest text-emerald-400 mb-3">Auth V2 · forgot</div>
        <h1 className="text-2xl font-semibold mb-6">Reset password</h1>
        {sent ? (
          <div className="text-white/70">Si cet email existe, un lien a été envoyé. Vérifie ta boîte.</div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <input
              type="email"
              required
              placeholder="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded focus:border-emerald-400 outline-none"
            />
            <button type="submit" className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 rounded font-medium text-black">
              Envoyer le lien
            </button>
          </form>
        )}
      </div>
    </main>
  )
}
