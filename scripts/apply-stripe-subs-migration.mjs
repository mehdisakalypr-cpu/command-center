#!/usr/bin/env node
// Apply stripe subscriptions migration via Supabase Management API.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const token = fs.readFileSync(path.join(os.homedir(), '.supabase/access-token'), 'utf8').trim()
const sql = fs.readFileSync('/root/command-center/supabase/migrations/20260423030000_stripe_subscriptions.sql', 'utf8')
const ref = 'jebuagyeapkltyjitosm'

const resp = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'User-Agent': 'supabase-cli/1.0',
  },
  body: JSON.stringify({ query: sql }),
})
const body = await resp.text()
console.log('STATUS', resp.status)
console.log(body.slice(0, 2000))
process.exit(resp.ok ? 0 : 1)
