import { readFileSync } from 'fs';
const env = readFileSync('/root/command-center/.env.local', 'utf-8');
for (const line of env.split('\n')) { const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/); if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ''); }

const { createClient } = await import('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Replicate buildKiSenseSummary inline — just the key bits
const since7d = new Date(Date.now() - 7*86400000).toISOString();
const since24h = new Date(Date.now() - 86400000).toISOString();

const [runs, upgrades, ideasNew, ideasActive, ideasPushed, top20, aiEvents] = await Promise.all([
  sb.from('business_hunter_runs').select('started_at,cost_eur,status,trigger').gte('started_at', since7d).order('started_at', { ascending: false }).limit(200),
  sb.from('automation_upgrades').select('started_at,cost_eur,verdict,dim_targeted,test_output,idea_id').gte('started_at', since7d).order('started_at', { ascending: false }).limit(500),
  sb.from('business_ideas').select('id').gte('discovered_at', since7d).limit(2000),
  sb.from('business_ideas').select('id').is('archived_at', null).limit(2000),
  sb.from('business_ideas').select('id').gte('pushed_to_minato_at', since7d).limit(2000),
  sb.from('business_ideas').select('id,name,autonomy_score,pushed_to_minato_at,rank').not('rank','is',null).order('rank').limit(20),
  sb.from('ai_key_events').select('provider,event,cost_usd').gte('created_at', since24h).limit(20000),
]);

console.log('=== KI SENSE DRY RUN ===\n');
console.log('HISOKA runs 7j:', runs.data?.length, '| last:', runs.data?.[0]?.started_at);
console.log('AAM upgrades 7j:', upgrades.data?.length);
const verdicts = {};
for (const u of (upgrades.data||[])) verdicts[u.verdict] = (verdicts[u.verdict]||0)+1;
console.log('AAM verdicts 7j:', verdicts);
console.log('\nideas created 7j:', ideasNew.data?.length);
console.log('ideas active (not archived):', ideasActive.data?.length);
console.log('ideas pushed to Minato 7j:', ideasPushed.data?.length);
console.log('top 20 rank=NOT NULL:', top20.data?.length);
console.log('high-autonomy ready (≥0.92 not pushed):', (top20.data||[]).filter(r => Number(r.autonomy_score)>=0.92 && !r.pushed_to_minato_at).length);
console.log('\nai_key_events 24h:', aiEvents.data?.length);
const byProvider = {};
for (const e of (aiEvents.data||[])) {
  byProvider[e.provider] = byProvider[e.provider] || {ok:0,fail:0,rl:0,qe:0};
  if (e.event === 'call_ok') byProvider[e.provider].ok++;
  else if (e.event === 'call_fail') byProvider[e.provider].fail++;
  else if (e.event === 'rate_limit') byProvider[e.provider].rl++;
  else if (e.event === 'quota_exhausted') byProvider[e.provider].qe++;
}
console.log('LLM pool 24h:', byProvider);
