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

async function main() {
  // Apply each ALTER/CREATE individually (skip BEGIN/COMMIT which exec_sql can't handle)
  const stmts = [
    `alter table public.business_ideas add column if not exists pushed_to_minato_at timestamptz`,
    `alter table public.business_ideas add column if not exists minato_ticket_id uuid`,
    `create index if not exists idx_biz_ideas_pushed on public.business_ideas(pushed_to_minato_at) where pushed_to_minato_at is not null`,
  ]

  let ok = 0, ko = 0
  for (const s of stmts) {
    const { error } = await sb.rpc('exec_sql', { query: s + ';' })
    if (error) { ko++; console.log('KO:', s.slice(0, 80), '→', error.message?.slice(0, 120)) }
    else { ok++; console.log('OK:', s.slice(0, 80)) }
  }
  console.log(`done ok=${ok} ko=${ko}`)
  if (ko > 0) process.exit(1)
}
main().catch(e => { console.error(e); process.exit(1) })
