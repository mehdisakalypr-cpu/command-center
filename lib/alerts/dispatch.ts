/**
 * lib/alerts/dispatch.ts — unified alert dispatcher (OFA + CC stack).
 *
 * Single entry point `alert(code, level, details)` that fans out to
 * Telegram and/or email according to `ALERTS_CONFIG` (env JSON or default map).
 *
 * Debouncing: each (code, level) tuple is stored in Supabase `alerts_log`
 * with a `debounce_until` timestamp to avoid flood (default 1h window).
 *
 * Env:
 *   TELEGRAM_BOT_TOKEN      — Bot API token
 *   TELEGRAM_CHAT_ID        — target chat (admin) ID
 *   RESEND_API_KEY          — Resend key for email fallback
 *   ADMIN_EMAIL             — recipient for email alerts
 *   ALERTS_CONFIG           — optional JSON: { "<code>": { "channels": ["telegram","email"], "debounceSec": 3600 } }
 */

import { createClient } from '@supabase/supabase-js'

export type AlertLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type AlertChannel = 'telegram' | 'email'

export interface AlertRule {
  channels: AlertChannel[]
  debounceSec?: number
}

// Default config: may be overridden via ALERTS_CONFIG env var.
const DEFAULT_RULES: Record<string, AlertRule> = {
  publish_gate_fail_rate: { channels: ['telegram'], debounceSec: 3600 },
  ai_provider_all_exhausted: { channels: ['telegram', 'email'], debounceSec: 1800 },
  outreach_bounce_rate: { channels: ['telegram'], debounceSec: 3600 },
  stripe_payment_failed: { channels: ['telegram'], debounceSec: 300 },
  scout_job_failed_consecutive: { channels: ['telegram'], debounceSec: 3600 },
  disk_space_low: { channels: ['email'], debounceSec: 7200 },
  test_alert: { channels: ['telegram'], debounceSec: 0 },
  auth_turnstile_spike: { channels: ['telegram', 'email'], debounceSec: 900 },
  auth_reset_email_failed: { channels: ['telegram', 'email'], debounceSec: 900 },
  auth_login_fail_ip_spike: { channels: ['telegram'], debounceSec: 1800 },
}

function loadRules(): Record<string, AlertRule> {
  const raw = process.env.ALERTS_CONFIG
  if (!raw) return DEFAULT_RULES
  try {
    return { ...DEFAULT_RULES, ...(JSON.parse(raw) as Record<string, AlertRule>) }
  } catch {
    return DEFAULT_RULES
  }
}

const LEVEL_EMOJI: Record<AlertLevel, string> = {
  LOW: 'INFO',
  MEDIUM: 'WARN',
  HIGH: 'ALERT',
  CRITICAL: 'CRITICAL',
}

function sbAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false } })
}

/** POST to Telegram Bot sendMessage. Returns ok/err. */
export async function sendTelegramAlert(text: string, level: AlertLevel = 'MEDIUM'): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) return { ok: false, error: 'missing_telegram_env' }
  const prefix = `[${LEVEL_EMOJI[level]}] `
  const body = {
    chat_id: chatId,
    text: prefix + text,
    parse_mode: 'Markdown',
    disable_web_page_preview: true,
  }
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!r.ok) {
      const err = await r.text().catch(() => '')
      return { ok: false, error: `telegram_${r.status}:${err.slice(0, 160)}` }
    }
    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: `telegram_exception:${e?.message ?? 'unknown'}` }
  }
}

/** Send email via Resend. */
export async function sendEmailAlert(subject: string, body: string): Promise<{ ok: boolean; error?: string }> {
  const key = process.env.RESEND_API_KEY
  const to = process.env.ADMIN_EMAIL
  if (!key || !to) return { ok: false, error: 'missing_email_env' }
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        from: process.env.ALERTS_FROM || 'alerts@ofaops.xyz',
        to: [to],
        subject,
        text: body,
      }),
    })
    if (!r.ok) {
      const err = await r.text().catch(() => '')
      return { ok: false, error: `resend_${r.status}:${err.slice(0, 160)}` }
    }
    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: `resend_exception:${e?.message ?? 'unknown'}` }
  }
}

/**
 * Check debounce: return true if we should skip (already alerted recently).
 * Soft-fail — if alerts_log table missing, never debounce.
 */
async function shouldDebounce(code: string, level: AlertLevel, debounceSec: number): Promise<boolean> {
  if (debounceSec <= 0) return false
  const sb = sbAdmin()
  if (!sb) return false
  try {
    const since = new Date(Date.now() - debounceSec * 1000).toISOString()
    const { data } = await sb
      .from('alerts_log')
      .select('id, created_at')
      .eq('code', code)
      .eq('level', level)
      .gte('created_at', since)
      .limit(1)
    return Array.isArray(data) && data.length > 0
  } catch {
    return false
  }
}

async function logAlert(params: {
  code: string
  level: AlertLevel
  message: string
  details?: Record<string, unknown>
  channels: AlertChannel[]
  delivered: { channel: AlertChannel; ok: boolean; error?: string }[]
  source?: string
}) {
  const sb = sbAdmin()
  if (!sb) return
  try {
    await sb.from('alerts_log').insert({
      code: params.code,
      level: params.level,
      message: params.message,
      details: params.details ?? {},
      channels: params.channels,
      delivered: params.delivered,
      source: params.source ?? (process.env.SERVICE_NAME || 'unknown'),
    })
  } catch {
    /* ignore — logging must never break the caller */
  }
}

export interface AlertOptions {
  /** Optional explicit channels override (ignores ALERTS_CONFIG). */
  channels?: AlertChannel[]
  /** Optional short human message. If absent, generated from code + details. */
  message?: string
  /** Source service tag (ofa / cc / cron). */
  source?: string
  /** If true, bypass debounce. */
  force?: boolean
}

function formatMessage(code: string, level: AlertLevel, details?: Record<string, unknown>, custom?: string) {
  const base = custom ?? `${code}`
  const lines = [base]
  if (details && Object.keys(details).length) {
    for (const [k, v] of Object.entries(details)) {
      const s = typeof v === 'object' ? JSON.stringify(v) : String(v)
      lines.push(`- ${k}: ${s.slice(0, 200)}`)
    }
  }
  lines.push(`_source: ${process.env.SERVICE_NAME ?? 'app'}_`)
  return lines.join('\n')
}

/**
 * Single entry point. Resolves channels from ALERTS_CONFIG, handles debounce,
 * dispatches, and logs the outcome. Never throws.
 */
export async function alert(
  code: string,
  level: AlertLevel,
  details?: Record<string, unknown>,
  opts: AlertOptions = {},
): Promise<{ ok: boolean; skipped?: boolean; delivered: { channel: AlertChannel; ok: boolean; error?: string }[] }> {
  const rules = loadRules()
  const rule = rules[code] ?? { channels: ['telegram'], debounceSec: 3600 }
  const channels = opts.channels ?? rule.channels
  const debounceSec = rule.debounceSec ?? 3600

  if (!opts.force && (await shouldDebounce(code, level, debounceSec))) {
    return { ok: true, skipped: true, delivered: [] }
  }

  const message = formatMessage(code, level, details, opts.message)
  const delivered: { channel: AlertChannel; ok: boolean; error?: string }[] = []

  for (const ch of channels) {
    if (ch === 'telegram') {
      const r = await sendTelegramAlert(message, level)
      delivered.push({ channel: 'telegram', ok: r.ok, error: r.error })
    } else if (ch === 'email') {
      const r = await sendEmailAlert(`[${level}] ${code}`, message)
      delivered.push({ channel: 'email', ok: r.ok, error: r.error })
    }
  }

  await logAlert({
    code,
    level,
    message,
    details,
    channels,
    delivered,
    source: opts.source,
  })

  return { ok: delivered.some(d => d.ok), delivered }
}

export { loadRules as _loadAlertsRules }
