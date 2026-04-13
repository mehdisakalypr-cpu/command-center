/**
 * replay-active-scenarios — read every row in `agent_targets` and re-launch
 * the matching product agents with the DB-driven batch size. Used after a
 * scenario activation from /admin/simulator when the user wants to push the
 * new objective to agents immediately instead of waiting for their next cron.
 *
 * Usage: npx tsx scripts/replay-active-scenarios.ts [--product=ofa,ftg] [--dry]
 */
import { createClient } from '@supabase/supabase-js'
import { spawn } from 'node:child_process'
import * as fs from 'node:fs'
import * as path from 'node:path'

function loadEnv() {
  const p = path.join(process.cwd(), '.env.local')
  if (!fs.existsSync(p)) return
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m) process.env[m[1]] ??= m[2].replace(/^["']|["']$/g, '')
  }
}
loadEnv()

const args = process.argv.slice(2)
const dry = args.includes('--dry')
const productFilter = args.find(a => a.startsWith('--product='))?.split('=')[1]?.split(',')

// Product → (project path, agent command template). target=<N> is substituted
// from the scenario's leadsNeeded (capped for sanity).
const AGENTS: Record<string, { cwd: string; cmd: string[]; flag: string; cap: number }[]> = {
  ofa: [
    { cwd: '/var/www/site-factory',  cmd: ['npx', 'tsx', 'agents/hyperscale.ts'],        flag: '--target', cap: 10000 },
  ],
  ftg: [
    { cwd: '/var/www/feel-the-gap',  cmd: ['npx', 'tsx', 'agents/entrepreneur-scout.ts'], flag: '--count',  cap: 2000 },
  ],
  estate: [],
  shiftdynamics: [],
}

async function main() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
  const { data: targets, error } = await sb.from('agent_targets').select('product, target_json, updated_at')
  if (error) { console.error('DB error:', error.message); process.exit(1) }
  if (!targets?.length) { console.log('No active scenarios — nothing to replay'); return }

  for (const t of targets as any[]) {
    if (productFilter && !productFilter.includes(t.product)) continue
    const tj = t.target_json ?? {}
    const leads = tj.results?.leadsNeeded ?? tj.objectiveValue
    const agents = AGENTS[t.product] ?? []
    if (!agents.length) { console.log(`[${t.product}] no agents wired, skip`); continue }
    console.log(`\n[${t.product}] scenario=${tj.scenarioId?.slice(0,8) ?? '?'} leads=${leads} updated=${t.updated_at}`)
    for (const a of agents) {
      const batch = Math.min(Math.max(1, Math.ceil(leads ?? 0)), a.cap)
      const cmd = [...a.cmd, `${a.flag}=${batch}`]
      console.log(`  → ${a.cwd} · ${cmd.join(' ')}${dry ? ' (dry)' : ''}`)
      if (dry) continue
      const child = spawn(cmd[0], cmd.slice(1), { cwd: a.cwd, stdio: 'inherit', detached: true })
      child.unref()
    }
  }
  console.log('\n=== replay dispatched ===')
}

main().catch(e => { console.error(e); process.exit(1) })
