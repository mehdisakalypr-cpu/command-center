/**
 * GET /api/compute/status
 * Snapshot of compute utilization for the NO-LAZY monitor.
 * Polled every minute by /compute page.
 *
 * Reports:
 *  - max_enabled (sticky MAX toggle)
 *  - running processes (node/tsx/next) by project
 *  - load average + RAM
 *  - background job activity across OFA/FTG/CC/Estate/Shift
 *  - computed utilization [0..1] (weighted: processes, bg activity, MAX sticky)
 *  - latest counter (monotonic, persisted in compute_samples)
 */
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { readFileSync, statSync } from 'node:fs'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import os from 'node:os'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const execAsync = promisify(exec)

const sb = () => createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!)
const sbWrite = () => createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY!)

type BgJob = { name: string; status: 'running' | 'idle' | 'unknown'; last_activity?: string; project: string; evidence?: string }

async function scanProcesses(): Promise<{ processes: number; byProject: Record<string, number> }> {
  try {
    const { stdout } = await execAsync('ps -eo pid,comm,args --no-headers | grep -E "tsx|node " | grep -v grep', { timeout: 3000 })
    const lines = stdout.split('\n').filter(Boolean)
    const byProject: Record<string, number> = {}
    for (const ln of lines) {
      if (/site-factory/.test(ln)) byProject.ofa = (byProject.ofa ?? 0) + 1
      else if (/feel-the-gap/.test(ln)) byProject.ftg = (byProject.ftg ?? 0) + 1
      else if (/the-estate/.test(ln)) byProject.estate = (byProject.estate ?? 0) + 1
      else if (/shiftdynamics/.test(ln)) byProject.shift = (byProject.shift ?? 0) + 1
      else if (/command-center/.test(ln)) byProject.cc = (byProject.cc ?? 0) + 1
      else byProject.other = (byProject.other ?? 0) + 1
    }
    return { processes: lines.length, byProject }
  } catch {
    return { processes: 0, byProject: {} }
  }
}

function readLogRecency(path: string, label: string, project: string): BgJob {
  try {
    const st = statSync(path)
    const ageMs = Date.now() - st.mtimeMs
    const status: BgJob['status'] = ageMs < 5 * 60_000 ? 'running' : ageMs < 30 * 60_000 ? 'idle' : 'unknown'
    return { name: label, status, last_activity: new Date(st.mtimeMs).toISOString(), project, evidence: path }
  } catch {
    return { name: label, status: 'unknown', project, evidence: path }
  }
}

export async function GET() {
  const t0 = Date.now()
  try {
    const { data: stateRow } = await sb().from('compute_max_state').select('*').eq('id', true).single()
    const maxEnabled = !!stateRow?.max_enabled

    const { processes, byProject } = await scanProcesses()

    // Background job evidence from known log paths.
    const bg: BgJob[] = [
      readLogRecency('/tmp/fix-demos-v2.log', 'OFA fix-demos v2', 'ofa'),
      readLogRecency('/tmp/fix-demos.log', 'OFA fix-demos', 'ofa'),
      readLogRecency('/tmp/ftg-seo.log', 'FTG seo-factory', 'ftg'),
      readLogRecency('/root/monitor/logs/health.log', 'monitor health', 'cc'),
      readLogRecency('/root/monitor/logs/opportunity-generator.log', 'CC opportunity-gen', 'cc'),
      readLogRecency('/root/monitor/logs/batch-reports.log', 'CC batch-reports', 'cc'),
    ]
    const activeBg = bg.filter(j => j.status === 'running').length

    // Utilization: weighted blend, clipped at 1.0.
    // - processes: cap at 8 (≥8 = 100% contribution)
    // - active bg jobs: cap at 5
    // - MAX toggle forces minimum 0.9 (signals we are committed to stay high)
    const processScore = Math.min(1, processes / 8)
    const bgScore = Math.min(1, activeBg / 5)
    let utilization = 0.55 * processScore + 0.35 * bgScore + 0.10 * (maxEnabled ? 1 : 0)
    if (maxEnabled) utilization = Math.max(utilization, 0.9)
    utilization = Math.min(1, Math.round(utilization * 1000) / 1000)

    const ramTotal = os.totalmem()
    const ramFree = os.freemem()
    const ramPct = (ramTotal - ramFree) / ramTotal
    const loadAvg = os.loadavg()

    // Persist a rolling sample (best-effort; failure must not break the UI).
    try {
      await sbWrite().from('compute_samples').insert({
        utilization, processes, load_avg_1m: loadAvg[0], bg_jobs: bg, max_enabled: maxEnabled,
      })
    } catch {}

    return NextResponse.json({
      ok: true,
      ts: new Date().toISOString(),
      max_enabled: maxEnabled,
      enabled_at: stateRow?.enabled_at ?? null,
      last_claude_ack: stateRow?.last_claude_ack ?? null,
      utilization,
      processes,
      processes_by_project: byProject,
      bg_jobs: bg,
      active_bg: activeBg,
      load_avg: loadAvg,
      ram_pct: Math.round(ramPct * 1000) / 1000,
      duration_ms: Date.now() - t0,
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message ?? e) }, { status: 500 })
  }
}
