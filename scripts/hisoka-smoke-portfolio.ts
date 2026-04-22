// Smoke: portfolio mode end-to-end. ~€0.001 via Groq free.
import { readFileSync } from 'node:fs';
import { createSupabaseAdmin } from '../lib/supabase-server';
import { proposePortfolio } from '../lib/hisoka/portfolio';

// Helper: load .env file, overrides already-set vars.
function loadEnvFileOverride(path: string) {
  try {
    const raw = readFileSync(path, 'utf8');
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      let v = m[2];
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      process.env[m[1]] = v;
    }
  } catch { /* file may not exist */ }
}

// Helper: load .env file, does NOT override already-set vars.
function loadEnvFile(path: string) {
  try {
    const raw = readFileSync(path, 'utf8');
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      let v = m[2];
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      if (!process.env[m[1]]) process.env[m[1]] = v;
    }
  } catch { /* file may not exist */ }
}

// Load rotation secrets first (has working GROQ + OPENROUTER keys).
loadEnvFileOverride('/root/security/vercel-rotation-20260420/new-secrets.env');
// Then load .env.local for Supabase/other creds (won't override AI keys already set above).
loadEnvFile('/root/command-center/.env.local');

async function main() {
  const admin = createSupabaseAdmin();
  const t0 = Date.now();
  const r = await proposePortfolio(admin, {
    availableCapitalEur: 10000,
    maxExtraWorkers: 2,
    riskAppetite: 'balanced',
  });
  const dt = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`portfolio_id=${r.id} allocations=${r.allocations.length} arr_y3=€${Math.round(r.expected_arr_y3_eur)} annualized=${r.annualized_return_pct.toFixed(1)}% sp500_delta=${r.sp500_delta_pct.toFixed(1)}pp diversification=${(r.diversification_score * 100).toFixed(0)}% cost=€${r.cost_eur.toFixed(3)} dt=${dt}s`);
  console.log('allocations:');
  r.allocations.forEach(a =>
    console.log(`  - ${a.idea_name ?? a.idea_slug} [${a.category}] €${a.launch_eur} launch + ${a.workers_assigned}w → MRR y3 €${Math.round(a.expected_mrr_y3_eur)}`)
  );
  console.log('rationale:', r.rationale);
  if (r.allocations.length < 3) {
    console.error('FAIL: <3 allocations');
    process.exit(1);
  }
  console.log('OK');
}

main().catch(e => { console.error(e); process.exit(1); });
