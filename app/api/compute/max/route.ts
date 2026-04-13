/**
 * POST /api/compute/max
 * Trigger / toggle the NO-LAZY MAX mode from the Command Center.
 *
 * Body: { enabled?: boolean, trigger?: 'button' | 'sticky' | 'cron' }
 *   - If `enabled` is provided → set the sticky toggle (persisted in compute_max_state).
 *   - Always sends a MINATO push to Claude via the bridge + Telegram, listing
 *     pending tasks per project so Claude relaunches everything at max.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const sb = () => createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY!)

async function countPending(): Promise<Record<string, number>> {
  const out: Record<string, number> = {}
  const db = sb()
  // OFA: drafts + sites missing images
  try {
    const { count: ofaDrafts } = await db.from('generated_sites').select('*', { count: 'exact', head: true }).eq('status', 'draft')
    out.ofa_drafts = ofaDrafts ?? 0
  } catch {}
  try {
    const { count: ofaLeads } = await db.from('commerce_leads').select('*', { count: 'exact', head: true }).is('site_id', null)
    out.ofa_leads_unmatched = ofaLeads ?? 0
  } catch {}
  // FTG: opportunities pending, countries without reports
  try {
    const { count: ftgOpps } = await db.from('opportunities').select('*', { count: 'exact', head: true })
    out.ftg_opportunities = ftgOpps ?? 0
  } catch {}
  return out
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({} as any))
  const trigger: 'button' | 'sticky' | 'cron' = body.trigger ?? 'button'
  const db = sb()

  // Read current state
  const { data: current } = await db.from('compute_max_state').select('*').eq('id', true).single()
  let nextEnabled = body.enabled
  if (typeof nextEnabled !== 'boolean') {
    // Button-press with no explicit enabled: keep current state, just dispatch a push.
    nextEnabled = !!current?.max_enabled
  }

  const nowIso = new Date().toISOString()
  const patch: Record<string, any> = {
    max_enabled: nextEnabled,
    updated_at: nowIso,
  }
  if (nextEnabled && !current?.max_enabled) patch.enabled_at = nowIso
  if (!nextEnabled && current?.max_enabled) patch.disabled_at = nowIso

  await db.from('compute_max_state').upsert({ id: true, ...patch })

  // Count pending work for the dispatch summary.
  const pending = await countPending()
  const totalPending = Object.values(pending).reduce((s, n) => s + (n || 0), 0)

  const summary = {
    max_enabled: nextEnabled,
    trigger,
    pending,
    total_pending: totalPending,
  }

  await db.from('compute_max_dispatch').insert({ trigger, summary })

  // Craft MINATO push message for Claude (bridge + Telegram).
  const msg = [
    `🔥 MINATO MAX ${nextEnabled ? 'ON' : 'PULSE'} (${trigger})`,
    `NO LAZY MODE — relance tout au max.`,
    `Pending: ${JSON.stringify(pending)}`,
    `Total pending: ${totalPending}`,
    nextEnabled
      ? `Reste au max tant que la case MAX est cochée. Compteur CC = preuve.`
      : `Vérifie les tâches pending et relance tout en mode Minato.`,
  ].join('\n')

  // Bridge (claude_bridge table — Claude reads these at next prompt).
  try {
    await db.from('claude_bridge').insert({
      direction: 'to_claude',
      message: msg,
      status: 'unread',
    })
  } catch (e) { /* table may not exist in all envs */ }

  // Telegram notify if configured.
  const tgToken = process.env.TELEGRAM_BOT_TOKEN
  const tgChat = process.env.TELEGRAM_CHAT_ID
  if (tgToken && tgChat) {
    try {
      await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: tgChat, text: msg }),
      })
    } catch {}
  }

  return NextResponse.json({ ok: true, max_enabled: nextEnabled, summary })
}

// GET returns the current state (handy for SSR / sticky-sync on page load).
export async function GET() {
  const db = sb()
  const { data } = await db.from('compute_max_state').select('*').eq('id', true).single()
  return NextResponse.json({ ok: true, state: data ?? { max_enabled: false } })
}
