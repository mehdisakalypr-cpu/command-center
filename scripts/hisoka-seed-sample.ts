// Inserts 1 canned idea at rank=1 so the UI has something before the first LLM run.
import { createSupabaseAdmin } from '../lib/supabase-server';

const sample = {
  slug: 'sample-ppp-pricing-api',
  name: 'PPP Pricing API',
  tagline: 'Geo-aware SaaS pricing as a service (195 countries, 4 sources).',
  category: 'middleware_api',
  autonomy_acquisition: 0.92, autonomy_content_ops: 0.95, autonomy_fulfillment: 0.98,
  autonomy_support: 0.9, autonomy_billing: 0.97, autonomy_compliance: 0.95,
  setup_hours_user: 16,
  ongoing_user_hours_per_month: 0.5,
  distribution_channels: ['seo', 'ph_launch', 'dev_tools_directories'],
  monetization_model: 'subscription',
  assets_leveraged: ['geo_pricing', 'stripe_subs_tier', 'llm_cascade'],
  asset_leverage_bonus: 1.3,
  unit_economics: {
    v10:  { rev_eur_mo: 200,   cost_eur_mo: 40,   gm_pct: 80 },
    v100: { rev_eur_mo: 2000,  cost_eur_mo: 300,  gm_pct: 85 },
    v1k:  { rev_eur_mo: 20000, cost_eur_mo: 2500, gm_pct: 87 },
    v10k: { rev_eur_mo: 200000,cost_eur_mo: 22000,gm_pct: 89 },
  },
  self_funding_score: 1.0,
  llc_gate: 'none',
  effort_weeks: 2,
  monthly_ops_cost_eur: 25,
  scalability_per_worker: 'linear',
  mrr_conservative: { m1: 50, m3: 300, m6: 900, m12: 2500, m24: 8000, m36: 18000 },
  mrr_median:       { m1: 100, m3: 800, m6: 2500, m12: 7000, m24: 25000, m36: 55000 },
  mrr_optimistic:   { m1: 200, m3: 2000, m6: 7000, m12: 20000, m24: 70000, m36: 150000 },
  leverage_configs: [
    { label: 'bootstrap',  launch_eur: 0,    workers: 1, leverage: 35, mrr_curve: { m1:100,m3:800,m6:2500,m12:7000,m24:25000,m36:55000 }, irr_y3_pct: 180, sp500_delta_pct: 170, risk_score: 0.35 },
    { label: 'accelerated',launch_eur: 1000, workers: 2, leverage: 42, mrr_curve: { m1:200,m3:1500,m6:4500,m12:12000,m24:40000,m36:85000 }, irr_y3_pct: 220, sp500_delta_pct: 210, risk_score: 0.4 },
    { label: 'turbo',      launch_eur: 3000, workers: 3, leverage: 48, mrr_curve: { m1:400,m3:3000,m6:9000,m12:22000,m24:70000,m36:140000 }, irr_y3_pct: 260, sp500_delta_pct: 250, risk_score: 0.5 },
    { label: 'overkill',   launch_eur: 5000, workers: 5, leverage: 40, mrr_curve: { m1:600,m3:4500,m6:12000,m12:28000,m24:85000,m36:165000 }, irr_y3_pct: 240, sp500_delta_pct: 230, risk_score: 0.6 },
  ],
  optimal_config: { label: 'turbo', leverage: 48 },
  leverage_elasticity: 'high',
  rationale: 'Geo-pricing brick ready, LLM + Stripe already wired. Dev-tools directories + PH launch = low-CAC distribution. GM > 80% at every tier.',
  rank: 1,
  score: 120.5,
};

async function main() {
  const admin = createSupabaseAdmin();
  const { error } = await admin.from('business_ideas').upsert(sample, { onConflict: 'slug' });
  if (error) { console.error(error); process.exit(1); }
  console.log('seeded sample idea at rank=1');
}

main().catch(e => { console.error(e); process.exit(1); });
