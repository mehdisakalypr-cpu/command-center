import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
function loadEnv(p:string){try{for(const l of readFileSync(p,'utf8').split('\n')){const m=l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);if(!m)continue;let v=m[2];if((v.startsWith('"')&&v.endsWith('"'))||(v.startsWith("'")&&v.endsWith("'")))v=v.slice(1,-1);if(!process.env[m[1]])process.env[m[1]]=v}}catch{}}
loadEnv('/root/command-center/.env.local')
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function main() {
  const { data: latest } = await sb.from('creator_scores').select('captured_at, score, category, project, tier_code, session_summary, strengths, improvement_areas, criteria').order('captured_at', { ascending: false }).limit(1)
  console.log('Latest:', JSON.stringify(latest, null, 2))
  const { data: tiers } = await sb.from('saiyan_tiers').select('code, label, score_min, score_max, power_level').order('score_min')
  console.log('Tiers:', JSON.stringify(tiers, null, 2))
}
main()
