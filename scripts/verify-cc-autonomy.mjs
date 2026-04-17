#!/usr/bin/env node
// Verify cc_autonomy tables + last samples.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const token = fs.readFileSync(path.join(os.homedir(), '.supabase/access-token'), 'utf8').trim()
const ref = 'jebuagyeapkltyjitosm'

const q = async (sql) => {
  const r = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  })
  return [r.status, await r.text()]
}

const tables = [
  ['compute_samples', 'captured_at'],
  ['infra_samples', 'captured_at'],
  ['gitnexus_snapshots', 'captured_at'],
  ['minato_strategy_logs', 'captured_at'],
  ['remote_action_requests', 'requested_at'],
]
for (const [t, ts] of tables) {
  const [s, b] = await q(`select count(*) as n, max(${ts}) as last from ${t}`)
  console.log(t.padEnd(26), 'HTTP', s, b.slice(0, 200))
}
