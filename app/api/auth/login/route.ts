import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET_KEY
// Feature flag: captcha enforcement only kicks in when TURNSTILE_SECRET_KEY
// is provisioned server-side. Missing key = skip verification (scaffold noop).
const TURNSTILE_ENFORCED = Boolean(TURNSTILE_SECRET)

/**
 * Server-side login proxy with IP rate-limiting + Cloudflare Turnstile
 * verification (feature-flagged via TURNSTILE_SECRET_KEY).
 *
 * Limits:
 *  - 5 attempts / 5 minutes per IP   (login:ip:<ip>)
 *  - 10 attempts / 15 minutes per email (login:email:<email>) — slows
 *    distributed-IP credential-stuffing against a single account.
 *
 * Captcha flow:
 *  - If TURNSTILE_SECRET_KEY is set, the request MUST include a
 *    `captchaToken` that passes Cloudflare siteverify. Failing = 401
 *    WITHOUT touching Supabase.
 *  - If not set (scaffold mode), the token is forwarded to Supabase if
 *    provided but no local verification is enforced — lets ops provision
 *    Turnstile gradually without breaking login.
 *
 * On success returns { access_token, refresh_token, user } so the client
 * hydrates the Supabase session with sb.auth.setSession(...).
 *
 * Closes security_items HIGH "CC: pas de captcha sur login admin".
 */
export async function POST(req: NextRequest) {
  let body: { email?: string; password?: string; captchaToken?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const email = (body.email || '').trim().toLowerCase()
  const password = body.password || ''
  const captchaToken = body.captchaToken

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
  }

  const ip = getClientIp(req)

  const ipRl = await rateLimit({ key: `login:ip:${ip}`, limit: 5, windowSec: 300 })
  if (!ipRl.ok) {
    return NextResponse.json(
      { error: 'Too many login attempts. Please wait and try again.', retryAfter: ipRl.retryAfter },
      { status: 429, headers: { 'Retry-After': String(ipRl.retryAfter), 'X-RateLimit-Limit': String(ipRl.limit), 'X-RateLimit-Remaining': '0' } },
    )
  }

  const emailRl = await rateLimit({ key: `login:email:${email}`, limit: 10, windowSec: 900 })
  if (!emailRl.ok) {
    return NextResponse.json(
      { error: 'Account temporarily locked. Try again in a few minutes.', retryAfter: emailRl.retryAfter },
      { status: 429, headers: { 'Retry-After': String(emailRl.retryAfter) } },
    )
  }

  // Cloudflare Turnstile server-side verification. Skipped when no secret
  // is configured (scaffold mode). When enforced, a missing or invalid
  // token is a 401 *without* any call to Supabase — this prevents the
  // credential check from happening at all if the human-check fails.
  if (TURNSTILE_ENFORCED) {
    if (!captchaToken) {
      return NextResponse.json({ error: 'Captcha required' }, { status: 401 })
    }
    const ok = await verifyTurnstile(captchaToken, ip)
    if (!ok) {
      return NextResponse.json({ error: 'Captcha verification failed' }, { status: 401 })
    }
  }

  const sb = createClient(SUPABASE_URL, SUPABASE_ANON, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data, error } = await sb.auth.signInWithPassword({
    email,
    password,
    options: captchaToken ? { captchaToken } : undefined,
  })

  if (error || !data.session) {
    return NextResponse.json(
      { error: error?.message || 'Invalid credentials' },
      { status: 401, headers: { 'X-RateLimit-Limit': String(ipRl.limit), 'X-RateLimit-Remaining': String(Math.max(0, ipRl.remaining - 1)) } },
    )
  }

  return NextResponse.json({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    user: { id: data.user?.id, email: data.user?.email },
  })
}

async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  try {
    const form = new URLSearchParams()
    form.set('secret', TURNSTILE_SECRET!)
    form.set('response', token)
    if (ip && ip !== 'unknown') form.set('remoteip', ip)
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: form,
      cache: 'no-store',
    })
    if (!res.ok) return false
    const j = await res.json() as { success?: boolean }
    return j.success === true
  } catch {
    return false
  }
}
