#!/usr/bin/env node
import fs from 'node:fs'
const env = fs.readFileSync('/root/command-center/.env.local', 'utf8')
const cronSecret = env.match(/^CRON_SECRET=(.+)$/m)?.[1]?.trim()
if (!cronSecret) throw new Error('CRON_SECRET missing')
const id = '8eb3bc82-9fe6-4a56-a0e8-368ff2ed532e'
const url = `https://command-center01.duckdns.org/api/business-hunter/portfolio/${id}/progress`
const body = {
  event_type: 'checkpoint',
  progress_pct: 20,
  message: 'Checkpoint 20%: migration DB appliquée (5 tables: projects, specs, generated, examples, sandbox)',
  worker_id: 'ultra-instinct-worker-7',
}
const resp = await fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-cron-secret': cronSecret },
  body: JSON.stringify(body),
})
console.log('STATUS', resp.status)
console.log(await resp.text())
process.exit(resp.ok ? 0 : 1)
