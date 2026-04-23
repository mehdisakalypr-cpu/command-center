/**
 * Bridge client CC → FTG Ad Factory.
 *
 * FTG tourne dans `/var/www/feel-the-gap/` (prod: https://feel-the-gap.vercel.app)
 * et partage le même Supabase que CC. On reste HTTP pour garder les deux repos
 * découplés. Header `x-cc-bridge-secret` négocié en parallèle côté FTG.
 *
 * Si `FTG_BASE_URL` ou `CC_BRIDGE_SECRET` absents, ou si FTG répond 401/404,
 * on retourne un stub `pending_bridge_setup` pour débloquer le pipeline local.
 */

import type { Scene } from './types'

const DEFAULT_FTG_BASE = 'https://feel-the-gap.vercel.app'

type EnqueueInput = {
  job_id: string
  scenes: Scene[]
  language: string
  resolution: string
  ratio: string
}

type EnqueueResponse = {
  ftg_job_id: string
  status?: string
}

type StatusResponse = {
  status: string
  output_url?: string
  progress_pct: number
  error?: string
}

function getConfig(): { baseUrl: string; secret: string | null } {
  const baseUrl = process.env.FTG_BASE_URL || DEFAULT_FTG_BASE
  const secret = process.env.CC_BRIDGE_SECRET ?? null
  return { baseUrl, secret }
}

function stubEnqueue(job_id: string): EnqueueResponse {
  return { ftg_job_id: `stub-${job_id}`, status: 'pending_bridge_setup' }
}

function stubStatus(ftg_job_id: string): StatusResponse {
  if (ftg_job_id.startsWith('stub-')) {
    return { status: 'pending_bridge_setup', progress_pct: 0 }
  }
  return { status: 'unknown', progress_pct: 0 }
}

export async function enqueueFTGJob(input: EnqueueInput): Promise<EnqueueResponse> {
  const { baseUrl, secret } = getConfig()
  if (!secret) return stubEnqueue(input.job_id)

  try {
    const res = await fetch(`${baseUrl}/api/admin/ad-factory/bridge/enqueue`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-cc-bridge-secret': secret,
      },
      body: JSON.stringify(input),
      cache: 'no-store',
    })
    if (res.status === 401 || res.status === 404) {
      return stubEnqueue(input.job_id)
    }
    if (!res.ok) {
      throw new Error(`FTG enqueue ${res.status}: ${(await res.text()).slice(0, 200)}`)
    }
    const data = (await res.json()) as Partial<EnqueueResponse>
    if (!data.ftg_job_id) throw new Error('FTG enqueue: missing ftg_job_id')
    return { ftg_job_id: data.ftg_job_id, status: data.status ?? 'pending' }
  } catch (e) {
    if ((e as Error).message.startsWith('FTG enqueue')) throw e
    return stubEnqueue(input.job_id)
  }
}

export async function getFTGJobStatus(ftg_job_id: string): Promise<StatusResponse> {
  const { baseUrl, secret } = getConfig()
  if (!secret || ftg_job_id.startsWith('stub-')) return stubStatus(ftg_job_id)

  try {
    const res = await fetch(
      `${baseUrl}/api/admin/ad-factory/bridge/status?ftg_job_id=${encodeURIComponent(ftg_job_id)}`,
      {
        headers: { 'x-cc-bridge-secret': secret },
        cache: 'no-store',
      },
    )
    if (res.status === 401 || res.status === 404) return stubStatus(ftg_job_id)
    if (!res.ok) {
      return { status: 'unknown', progress_pct: 0, error: `FTG status ${res.status}` }
    }
    const data = (await res.json()) as Partial<StatusResponse>
    return {
      status: data.status ?? 'unknown',
      output_url: data.output_url,
      progress_pct: typeof data.progress_pct === 'number' ? data.progress_pct : 0,
      error: data.error,
    }
  } catch {
    return stubStatus(ftg_job_id)
  }
}
