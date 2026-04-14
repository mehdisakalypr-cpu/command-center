import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

function loadEnv(path: string) {
  try {
    const raw = readFileSync(path, 'utf8')
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (!m) continue
      let v = m[2]
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
      if (!process.env[m[1]]) process.env[m[1]] = v
    }
  } catch {}
}
loadEnv('/root/command-center/.env.local')

const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const sql = readFileSync('/root/command-center/supabase/migrations/20260414110000_potential_raises.sql', 'utf8')

async function main() {
  const stmts = sql.split(/;\s*\n/).map(s => s.trim()).filter(s => s && !s.startsWith('--'))
  let ok = 0, ko = 0
  for (const s of stmts) {
    try {
      const { error } = await sb.rpc('exec_sql', { query: s + ';' })
      if (error) { ko++; console.log('KO:', error.message?.slice(0, 160)) }
      else { ok++; console.log('OK:', s.slice(0, 70)) }
    } catch (e) { ko++; console.log('EX:', (e as Error).message?.slice(0, 160)) }
  }
  console.log(`done ok=${ok} ko=${ko}`)
}
main().catch(e => { console.error(e); process.exit(1) })
