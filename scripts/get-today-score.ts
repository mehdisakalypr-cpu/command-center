import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
function loadEnv(p:string){try{for(const l of readFileSync(p,'utf8').split('\n')){const m=l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);if(!m)continue;let v=m[2];if((v.startsWith('"')&&v.endsWith('"'))||(v.startsWith("'")&&v.endsWith("'")))v=v.slice(1,-1);if(!process.env[m[1]])process.env[m[1]]=v}}catch{}}
loadEnv('/root/command-center/.env.local')
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function main() {
  const nowIso = new Date().toISOString()
  const { data } = await sb.from('creator_scores').select('captured_at, score, category, project, tier_code, session_summary, strengths, improvement_areas, criteria').lte('captured_at', nowIso).order('captured_at', { ascending: false }).limit(3)
  console.log(JSON.stringify(data, null, 2))
}
main()
