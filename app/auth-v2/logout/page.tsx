'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function LogoutV2Page() {
  const router = useRouter()
  useEffect(() => {
    fetch('/api/auth-v2/logout', { method: 'POST', credentials: 'same-origin' })
      .finally(() => router.push('/auth-v2/login'))
  }, [router])
  return (
    <main className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="text-white/60 text-sm">Signing out…</div>
    </main>
  )
}
