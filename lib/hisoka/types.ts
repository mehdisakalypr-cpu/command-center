// Shared Hisoka types. Kept flat so pipeline, API, and UI all import from here.

export type AutonomyDim =
  | 'acquisition' | 'content_ops' | 'fulfillment'
  | 'support' | 'billing' | 'compliance';

export type Category =
  | 'middleware_api' | 'data_platform' | 'productized_service'
  | 'marketplace' | 'content_platform' | 'tool_utility' | 'b2b_integration';

export type LlcGate = 'none' | 'needs_llc' | 'post_expat' | 'blocked';

export type MrrCurve = { m1: number; m3: number; m6: number; m12: number; m24: number; m36: number };

export type LeverageConfig = {
  label: 'bootstrap' | 'accelerated' | 'turbo' | 'overkill';
  launch_eur: number;
  workers: number;
  leverage: number;          // MRR_y3 / capital_cost, dimensionless
  mrr_curve: MrrCurve;
  irr_y3_pct: number;
  sp500_delta_pct: number;
  risk_score: number;        // 0..1
  notes?: string;
};

export type UnitEconomics = {
  v10:  { rev_eur_mo: number; cost_eur_mo: number; gm_pct: number };
  v100: { rev_eur_mo: number; cost_eur_mo: number; gm_pct: number };
  v1k:  { rev_eur_mo: number; cost_eur_mo: number; gm_pct: number };
  v10k: { rev_eur_mo: number; cost_eur_mo: number; gm_pct: number };
};

// Shape emitted by the Ideator / Scorer (before DB insert).
export type ScoredIdea = {
  slug: string;
  name: string;
  tagline: string;
  category: Category;
  autonomy: Record<AutonomyDim, number>;
  setup_hours_user: number;
  ongoing_user_hours_per_month: number;
  distribution_channels: string[];
  monetization_model: 'subscription' | 'usage' | 'hybrid' | 'commission';
  pricing_tiers?: Array<{ name: string; price_eur: number; limits?: string; gm_pct?: number }>;
  assets_leveraged: string[];   // brick ids
  unit_economics: UnitEconomics;
  self_funding_score: number;   // 1.0 = GM+ at every breakpoint
  infra_scaling_curve?: 'logarithmic' | 'linear' | 'breaks_at_Xk';
  llc_gate: LlcGate;
  compliance_notes?: string;
  effort_weeks: number;
  monthly_ops_cost_eur: number;
  scalability_per_worker: 'linear' | 'step' | 'capped';
  mrr_conservative: MrrCurve;
  mrr_median: MrrCurve;
  mrr_optimistic: MrrCurve;
  fleet_multipliers?: Record<string, number>;
  leverage_configs: LeverageConfig[];
  optimal_config?: LeverageConfig;
  leverage_elasticity?: 'high' | 'medium' | 'flat';
  minato_agents_assigned?: Partial<Record<AutonomyDim, string>>;
  new_minato_agents_needed?: Array<{ name: string; role: string; covers_dim: AutonomyDim; dev_weeks: number }>;
  operability_score?: number;
  sources?: Array<{ url: string; type: string }>;
  rationale: string;
};

export type GateResult = { passed: boolean; reasons: string[] };

export type HunterRunResult = {
  run_id: string;
  ideas_discovered: number;
  ideas_upserted: number;
  cost_eur: number;
  top20_slugs: string[];
};
