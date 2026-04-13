/**
 * Bridge HTTP entre le Minato Managed Agent et les soldats locaux du VPS.
 *
 * Reçoit les custom tool calls (depuis l'agent via webhook ou polling côté Aria) et
 * les exécute sur le VPS via SSH ou directement quand CC tourne sur le VPS.
 *
 * POST { tool: string, args: object, project?: string }
 * → { ok: boolean, result: any, took_ms: number }
 */
import { createClient } from '@supabase/supabase-js'
import { exec } from 'child_process'
import { promisify } from 'util'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 600

const execp = promisify(exec)
const IS_VPS = process.env.DEPLOYMENT_ENV === 'vps'

const PROJECT_PATHS: Record<string, string> = {
  ftg: '/var/www/feel-the-gap',
  ofa: '/var/www/site-factory',
  cc: '/root/command-center',
  shift: '/var/www/shiftdynamics',
  estate: '/var/www/the-estate',
}

async function runScript(project: string, script: string, args: string[] = []): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  if (!IS_VPS) throw new Error('run_agent only available on VPS deployment')
  const cwd = PROJECT_PATHS[project]
  if (!cwd) throw new Error(`unknown project: ${project}`)
  const cmd = `cd ${cwd} && timeout 600 npx tsx ${script.startsWith('agents/') || script.startsWith('scripts/') ? script : 'scripts/' + script}.ts ${args.map((a) => JSON.stringify(a)).join(' ')}`
  try {
    const { stdout, stderr } = await execp(cmd, { maxBuffer: 10 * 1024 * 1024 })
    return { stdout: stdout.slice(-5000), stderr: stderr.slice(-2000), exitCode: 0 }
  } catch (e: unknown) {
    const err = e as { stdout?: string; stderr?: string; code?: number }
    return { stdout: (err.stdout || '').slice(-5000), stderr: (err.stderr || String(e)).slice(-2000), exitCode: err.code ?? 1 }
  }
}

async function statusCheck(project: string) {
  const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!)
  if (project === 'ofa') {
    const tables = ['commerce_leads', 'generated_sites', 'archetypes', 'image_assets']
    const counts = await Promise.all(tables.map(async (t) => {
      const { count } = await sb.from(t).select('*', { count: 'exact', head: true })
      return [t, count ?? 0]
    }))
    return Object.fromEntries(counts)
  }
  if (project === 'ftg') {
    const tables = ['opportunities', 'social_posts', 'youtube_insights', 'users_profiles']
    const counts = await Promise.all(tables.map(async (t) => {
      const { count } = await sb.from(t).select('*', { count: 'exact', head: true })
      return [t, count ?? 0]
    }))
    return Object.fromEntries(counts)
  }
  return { note: `status_check pour ${project} non implémenté encore` }
}

async function commitProgress(project: string, message: string) {
  if (!IS_VPS) throw new Error('commit_progress only on VPS')
  const cwd = PROJECT_PATHS[project]
  const safe = message.replace(/"/g, '\\"').slice(0, 200)
  const cmd = `cd ${cwd} && git add -A && git diff --cached --quiet || git commit -m "${safe}\n\nCo-Authored-By: Minato Managed Agent <noreply@anthropic.com>"`
  const { stdout, stderr } = await execp(cmd).catch((e: { stdout?: string; stderr?: string }) => ({ stdout: e.stdout || '', stderr: e.stderr || '' }))
  return { stdout: stdout.slice(-1000), stderr: stderr.slice(-500) }
}

async function updateCcInsights(project: string, metrics: Record<string, unknown>, note?: string) {
  const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!)
  const { error } = await sb.from('dashboard_insights').insert({
    project,
    metrics_json: metrics,
    note: note || null,
    created_at: new Date().toISOString(),
    source: 'minato_agent',
  })
  return { ok: !error, error: error?.message }
}

const GENKIDAMA_TARGETS: Record<string, Record<string, number>> = {
  ofa: { commerce_leads: 1_000_000, generated_sites: 1_000_000 },
  ftg: { opportunities: 1_000_000, social_posts: 5_000, youtube_insights: 500, users_profiles: 1_000 },
}

async function checkGenkidama(project: string) {
  const counts = (await statusCheck(project)) as Record<string, number>
  const targets = GENKIDAMA_TARGETS[project] || {}
  const progress: Record<string, { actual: number; target: number; pct: number }> = {}
  let totalPct = 0
  let n = 0
  for (const [table, target] of Object.entries(targets)) {
    const actual = counts[table] ?? 0
    const pct = Math.min(100, Math.round((actual / target) * 1000) / 10)
    progress[table] = { actual, target, pct }
    totalPct += pct
    n++
  }
  return { project, progress, overall_pct: n ? Math.round((totalPct / n) * 10) / 10 : 0 }
}

export async function POST(request: Request) {
  const t0 = Date.now()
  try {
    const body = await request.json()
    const { tool, args = {} } = body as { tool: string; args: Record<string, unknown> }
    console.log(`[minato] ${tool}`, JSON.stringify(args).slice(0, 200))

    let result: unknown
    switch (tool) {
      case 'status_check':
        result = await statusCheck(args.project as string)
        break
      case 'run_agent':
        result = await runScript(args.project as string, args.script as string, (args.args as string[]) || [])
        break
      case 'run_kaioken_batch': {
        const list = args.agents as { project: string; script: string; args?: string[] }[]
        const results = await Promise.all(list.map((a) => runScript(a.project, a.script, a.args || []).catch((e) => ({ error: String(e) }))))
        result = { count: list.length, results }
        break
      }
      case 'commit_progress':
        result = await commitProgress(args.project as string, args.message as string)
        break
      case 'update_cc_insights':
        result = await updateCcInsights(args.project as string, args.metrics as Record<string, unknown>, args.note as string)
        break
      case 'check_genkidama':
        result = await checkGenkidama(args.project as string)
        break
      default:
        return Response.json({ ok: false, error: `unknown tool: ${tool}` }, { status: 400 })
    }

    const took_ms = Date.now() - t0
    console.log(`[minato] ${tool} ok in ${took_ms}ms`)
    return Response.json({ ok: true, tool, result, took_ms })
  } catch (e) {
    console.error(`[minato] error after ${Date.now() - t0}ms:`, e)
    return Response.json({ ok: false, error: String(e), took_ms: Date.now() - t0 }, { status: 500 })
  }
}
