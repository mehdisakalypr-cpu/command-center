/**
 * GET /api/cron/auth-health
 *
 * Watches auth_events for spikes that indicate an outage users can't diagnose
 * themselves — Turnstile key-mismatch, email deliverability collapse, or mass
 * login_fail from a single IP (credential stuffing or real brokenness).
 *
 * Runs every 5 min (see vercel.json). Keeps a debounce per alert code in
 * alerts_log so we don't spam Telegram during a sustained incident.
 *
 * Auth: CRON_SECRET header (Vercel Cron default).
 */
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { alert } from '@/lib/alerts/dispatch'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const WINDOW_MIN = 10
const TURNSTILE_THRESHOLD = 5
const RESET_EMAIL_FAIL_THRESHOLD = 3
const LOGIN_FAIL_PER_IP_THRESHOLD = 10

export async function GET(req: Request) {
  const auth = req.headers.get('authorization') ?? ''
  const expected = `Bearer ${process.env.CRON_SECRET ?? ''}`
  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    return NextResponse.json({ error: 'supabase env missing' }, { status: 500 })
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } })
  const since = new Date(Date.now() - WINDOW_MIN * 60_000).toISOString()

  const { data: events, error } = await supabase
    .from('auth_events')
    .select('event, site_slug, ip, meta, created_at')
    .gte('created_at', since)
    .in('event', ['login_fail', 'reset_request_failed', 'login_rate_limited'])

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const findings: Record<string, unknown> = {}

  // Turnstile spike — per site.
  const turnstileBySite = new Map<string, number>()
  for (const e of events ?? []) {
    if (e.event !== 'login_fail') continue
    const reason = (e.meta as { reason?: string })?.reason ?? ''
    if (!reason.startsWith('turnstile:')) continue
    const site = e.site_slug ?? 'unknown'
    turnstileBySite.set(site, (turnstileBySite.get(site) ?? 0) + 1)
  }
  for (const [site, count] of turnstileBySite) {
    if (count >= TURNSTILE_THRESHOLD) {
      await alert('auth_turnstile_spike', 'HIGH', {
        site, count, window_min: WINDOW_MIN,
        hint: 'Vérifier rotation atomique TURNSTILE_SECRET_KEY + NEXT_PUBLIC_TURNSTILE_SITE_KEY + redeploy forcé',
      })
      findings[`turnstile_${site}`] = count
    }
  }

  // Reset email pipeline failing — OTP email not delivered (Resend misconfig, domain de-verified, etc.)
  const resetFailBySite = new Map<string, number>()
  for (const e of events ?? []) {
    if (e.event !== 'reset_request_failed') continue
    const site = e.site_slug ?? 'unknown'
    resetFailBySite.set(site, (resetFailBySite.get(site) ?? 0) + 1)
  }
  for (const [site, count] of resetFailBySite) {
    if (count >= RESET_EMAIL_FAIL_THRESHOLD) {
      await alert('auth_reset_email_failed', 'HIGH', {
        site, count, window_min: WINDOW_MIN,
        hint: 'Vérifier Resend domaine vérifié + AUTH_EMAIL_FROM + RESEND_API_KEY',
      })
      findings[`reset_fail_${site}`] = count
    }
  }

  // Login fail from single IP — credential stuffing or broken client.
  const failByIp = new Map<string, number>()
  for (const e of events ?? []) {
    if (e.event !== 'login_fail') continue
    const ip = e.ip ?? 'unknown'
    failByIp.set(ip, (failByIp.get(ip) ?? 0) + 1)
  }
  for (const [ip, count] of failByIp) {
    if (count >= LOGIN_FAIL_PER_IP_THRESHOLD) {
      await alert('auth_login_fail_ip_spike', 'MEDIUM', {
        ip, count, window_min: WINDOW_MIN,
      })
      findings[`ip_${ip}`] = count
    }
  }

  return NextResponse.json({
    ok: true,
    window_min: WINDOW_MIN,
    events_scanned: events?.length ?? 0,
    findings,
  })
}
