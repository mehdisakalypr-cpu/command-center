// Smoke: benchmark a user's idea end-to-end. ~€0.05 per call with Groq free.
import { readFileSync } from 'node:fs';
import { createSupabaseAdmin } from '../lib/supabase-server';
import { benchmarkIdea } from '../lib/hisoka/benchmark';

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
  const userText = 'API that returns PPP-adjusted SaaS prices per country, fed by World Bank data, for indie hackers to localize pricing.';
  console.log('benchmarking:', userText);
  const t0 = Date.now();
  const r = await benchmarkIdea(admin, userText);
  const dt = ((Date.now() - t0) / 1000).toFixed(1);
  console.log('verdict:', r.verdict);
  console.log('passed_gates:', r.passed_gates, 'reasons:', r.gate_reasons);
  console.log('score:', r.score.toFixed(2));
  console.log('rank_if_added:', r.rank_if_added);
  console.log('cost:', `€${r.cost_eur.toFixed(4)}`);
  console.log('cached benchmark id:', r.id);
  console.log(`dt: ${dt}s`);
  console.log('OK');
}

main().catch(e => { console.error(e); process.exit(1); });
