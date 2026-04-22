// Full pipeline smoke: calls the live LLM. Costs ~€0.20-0.40. Run manually, not in CI.
// Loads the vercel-rotation secrets FIRST (has working GROQ + OPENROUTER keys),
// then falls back to .env.local for Supabase creds.
import { readFileSync } from 'node:fs';
import { createSupabaseAdmin } from '../lib/supabase-server';
import { runDiscovery } from '../lib/hisoka/pipeline';

// Helper: load .env file into process.env, overriding already-set vars.
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
  const r = await runDiscovery(admin, { trigger: 'manual', countTarget: 10 });
  const dt = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`run_id=${r.run_id} discovered=${r.ideas_discovered} upserted=${r.ideas_upserted} cost=€${r.cost_eur.toFixed(2)} dt=${dt}s`);
  if (r.ideas_upserted < 3) { console.error('FAIL: too few ideas upserted'); process.exit(1); }
  console.log('top:', r.top20_slugs.slice(0, 5));
  console.log('OK');
}

main().catch(e => { console.error(e); process.exit(1); });
