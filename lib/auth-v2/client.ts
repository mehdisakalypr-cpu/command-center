'use client'

import { useEffect, useRef, useState } from 'react'

export function useIdleTimeout(timeoutMs = 30 * 60 * 1000, onTimeout?: () => void) {
  const [idle, setIdle] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    const reset = () => {
      setIdle(false)
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => {
        setIdle(true)
        onTimeout?.()
      }, timeoutMs)
    }
    const events = ['mousemove', 'keydown', 'click', 'touchstart', 'visibilitychange']
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }))
    reset()
    let bc: BroadcastChannel | null = null
    try {
      bc = new BroadcastChannel('auth-v2')
      bc.onmessage = (m) => {
        if (m.data === 'activity') reset()
      }
    } catch {}
    return () => {
      events.forEach((e) => window.removeEventListener(e, reset))
      if (timer.current) clearTimeout(timer.current)
      bc?.close()
    }
  }, [timeoutMs, onTimeout])
  return idle
}

export async function fetchCsrfToken(): Promise<string> {
  const res = await fetch('/api/auth-v2/csrf', { cache: 'no-store', credentials: 'same-origin' })
  const j = await res.json()
  return j.token as string
}

export async function postWithCsrf(path: string, body: unknown): Promise<Response> {
  const token = await fetchCsrfToken()
  return fetch(path, {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'content-type': 'application/json',
      'x-csrf-token': token,
    },
    body: JSON.stringify(body),
  })
}
