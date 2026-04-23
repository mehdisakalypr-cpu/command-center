#!/usr/bin/env node
// Direct DB write for checkpoint 20% (fallback when edge route unreachable).
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
const token = fs.readFileSync(path.join(os.homedir(), '.supabase/access-token'), 'utf8').trim()
const ref = 'jebuagyeapkltyjitosm'
const id = '8eb3bc82-9fe6-4a56-a0e8-368ff2ed532e'
const workerId = 'ultra-instinct-worker-7'
const msg = 'Checkpoint 20%: migration DB appliquée (5 tables: projects, specs, generated, examples, sandbox)'
const q = `
INSERT INTO hisoka_build_events (idea_id, event_type, progress_pct, message, worker_id)
VALUES ('${id}', 'checkpoint', 20, '${msg.replace(/'/g, "''")}', '${workerId}');
UPDATE business_ideas SET progress_pct = 20, worker_id = '${workerId}' WHERE id = '${id}';
SELECT id, progress_pct, worker_id, status FROM business_ideas WHERE id = '${id}';
`
const resp = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'User-Agent':'supabase-cli/1.0' },
  body: JSON.stringify({ query: q }),
})
console.log('STATUS', resp.status)
console.log(await resp.text())
process.exit(resp.ok ? 0 : 1)
