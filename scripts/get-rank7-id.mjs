#!/usr/bin/env node
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
const token = fs.readFileSync(path.join(os.homedir(), '.supabase/access-token'), 'utf8').trim()
const ref = 'jebuagyeapkltyjitosm'
const q = `SELECT id, name, slug, rank, score, status, progress_pct FROM business_ideas WHERE rank = 7 LIMIT 5;`
const resp = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'User-Agent':'supabase-cli/1.0' },
  body: JSON.stringify({ query: q }),
})
console.log(resp.status, await resp.text())
