'use client'
/**
 * Cloudflare Turnstile widget (managed / interaction-only).
 *
 * Feature-flagged OFF when NEXT_PUBLIC_TURNSTILE_SITE_KEY is missing or
 * falsy — in that case the component renders nothing and sets no token.
 * The server-side login proxy (/api/auth/login) treats a missing token as
 * "captcha disabled" so the flow keeps working.
 *
 * Ported from FTG (commit 1e202c9) — keep the shape compatible so both
 * sites share a single verification pattern.
 *
 * Dashboard checklist (MANUAL — user action once ready to enforce):
 *  1. Cloudflare → Turnstile → create widget (Managed / interaction-only)
 *     bound to the CC prod domain (cc-dashboard.vercel.app and custom).
 *  2. Copy the Site Key into Vercel env var NEXT_PUBLIC_TURNSTILE_SITE_KEY
 *     and the Secret Key into TURNSTILE_SECRET_KEY (server-only).
 *  3. Optionally paste the secret into Supabase Dashboard → Auth → Settings
 *     → Captcha Provider (Cloudflare Turnstile) so Supabase double-verifies.
 *  4. Re-deploy. First request triggers the challenge.
 */
import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string
      remove: (id: string) => void
      reset: (id?: string) => void
    }
    __turnstileToken?: string
  }
}

interface Props {
  siteKey?: string
  onToken?: (token: string) => void
  action?: string
  className?: string
}

let scriptPromise: Promise<void> | null = null
function loadScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if (window.turnstile) return Promise.resolve()
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise<void>((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    s.async = true
    s.defer = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('Failed to load Turnstile'))
    document.head.appendChild(s)
  })
  return scriptPromise
}

export default function TurnstileWidget({ siteKey, onToken, action, className }: Props) {
  const ref = useRef<HTMLDivElement | null>(null)
  const widgetId = useRef<string | null>(null)

  useEffect(() => {
    // Feature flag: no site key = noop. Keeps the login page working when
    // the Cloudflare widget hasn't been provisioned yet.
    if (!siteKey) return

    let cancelled = false
    loadScript().then(() => {
      if (cancelled || !ref.current || !window.turnstile) return
      widgetId.current = window.turnstile.render(ref.current, {
        sitekey: siteKey,
        action,
        appearance: 'interaction-only',
        callback: (token: string) => {
          window.__turnstileToken = token
          onToken?.(token)
        },
        'error-callback': () => { window.__turnstileToken = undefined },
        'expired-callback': () => { window.__turnstileToken = undefined },
      })
    }).catch(() => { /* ignore — login still works without captcha until enforced */ })
    return () => {
      cancelled = true
      if (widgetId.current && window.turnstile) {
        try { window.turnstile.remove(widgetId.current) } catch { /* noop */ }
      }
    }
  }, [siteKey, action, onToken])

  if (!siteKey) return null
  return <div ref={ref} className={className} />
}
