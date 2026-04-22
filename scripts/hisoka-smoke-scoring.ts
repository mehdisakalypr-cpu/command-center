// Smoke: feed a known-good + known-bad idea. Assert gates + ordering.

import { hardGates, baseScore, autonomyScore } from '../lib/hisoka/scoring';
import type { ScoredIdea } from '../lib/hisoka/types';

const ideaGood: ScoredIdea = {
  slug: 'good',
  name: 'Test Good',
  tagline: 't',
  category: 'middleware_api',
  autonomy: { acquisition: 0.95, content_ops: 0.95, fulfillment: 0.92, support: 0.9, billing: 1, compliance: 0.95 },
  setup_hours_user: 20,
  ongoing_user_hours_per_month: 0.5,
  distribution_channels: ['seo', 'ph_launch'],
  monetization_model: 'subscription',
  assets_leveraged: ['llm_cascade', 'auth_webauthn'],
  unit_economics: {
    v10:  { rev_eur_mo: 200,   cost_eur_mo: 50,   gm_pct: 75 },
    v100: { rev_eur_mo: 2000,  cost_eur_mo: 400,  gm_pct: 80 },
    v1k:  { rev_eur_mo: 20000, cost_eur_mo: 3000, gm_pct: 85 },
    v10k: { rev_eur_mo: 200000,cost_eur_mo: 25000,gm_pct: 87 },
  },
  self_funding_score: 1.0,
  llc_gate: 'none',
  effort_weeks: 2,
  monthly_ops_cost_eur: 20,
  scalability_per_worker: 'linear',
  mrr_conservative: { m1: 0,   m3: 100,  m6: 500,   m12: 2000,  m24: 8000,  m36: 20000 },
  mrr_median:       { m1: 100, m3: 500,  m6: 2000,  m12: 8000,  m24: 30000, m36: 70000 },
  mrr_optimistic:   { m1: 300, m3: 2000, m6: 8000,  m12: 30000, m24: 100000,m36: 250000 },
  leverage_configs: [{ label: 'bootstrap', launch_eur: 0, workers: 1, leverage: 50, mrr_curve: { m1:100,m3:500,m6:2000,m12:8000,m24:30000,m36:70000 }, irr_y3_pct: 200, sp500_delta_pct: 190, risk_score: 0.4 }],
  rationale: 'ok',
};

const ideaBadAutonomy: ScoredIdea = { ...ideaGood, slug: 'bad-autonomy',
  autonomy: { ...ideaGood.autonomy, support: 0.5 } };

const ideaBadLlc: ScoredIdea = { ...ideaGood, slug: 'bad-llc', llc_gate: 'blocked' };

const results = [
  { name: 'good passes',     r: hardGates(ideaGood).passed, expect: true },
  { name: 'bad-autonomy fails', r: hardGates(ideaBadAutonomy).passed, expect: false },
  { name: 'bad-llc fails',   r: hardGates(ideaBadLlc).passed, expect: false },
];
let failed = 0;
for (const t of results) {
  const ok = t.r === t.expect;
  console.log(ok ? 'OK  ' : 'FAIL', t.name, `(got ${t.r}, expected ${t.expect})`);
  if (!ok) failed++;
}
const sGood = baseScore(ideaGood);
console.log(`baseScore(good) = ${sGood.toFixed(2)} (should be > 0)`);
if (sGood <= 0) { console.log('FAIL baseScore not positive'); failed++; }
console.log(`autonomyScore(good) = ${autonomyScore(ideaGood.autonomy).toFixed(2)} (should be 0.90)`);
process.exit(failed ? 1 : 0);
