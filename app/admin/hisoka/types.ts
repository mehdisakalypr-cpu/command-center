export type LeverageConfigUI = {
  label: 'bootstrap' | 'accelerated' | 'turbo' | 'overkill';
  launch_eur: number;
  workers: number;
  leverage: number;
  mrr_curve?: { m1: number; m3: number; m6: number; m12: number; m24: number; m36: number };
  irr_y3_pct?: number;
  sp500_delta_pct?: number;
  risk_score?: number;
};

export type IdeaRow = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  category: string;
  autonomy_score: number;
  score: number;
  rank: number | null;
  llc_gate: 'none' | 'needs_llc' | 'post_expat' | 'blocked';
  assets_leveraged: string[] | null;
  leverage_configs: LeverageConfigUI[] | null;
  optimal_config: LeverageConfigUI | null;
  leverage_elasticity: 'high' | 'medium' | 'flat' | null;
  mrr_median?: { m12?: number; m36?: number } | null;
  deployed_url?: string | null;
  visibility?: 'public' | 'private';
  pushed_to_minato_at?: string | null;
  minato_ticket_id?: string | null;
  build_priority?: number | null;
};

export type Envelope = {
  budgetEur: number;   // 0..5000
  workers: number;     // 1..10
};

export type Filters = {
  categories: string[] | null;   // null = all
  elasticity: 'all' | 'high' | 'exclude_flat';
  llcGate: 'all' | 'doable_now' | 'post_expat_ok';
  /** Hide ideas below Hisoka scoring thresholds (default true). */
  hideBelowThreshold: boolean;
};

/** Hisoka scoring thresholds — mirrors lib/hisoka/scoring.ts MIN_AUTONOMY. */
export const MIN_AUTONOMY_PASS = 0.9;

export const ALL_CATEGORIES = [
  'middleware_api', 'data_platform', 'productized_service',
  'marketplace', 'content_platform', 'tool_utility', 'b2b_integration',
] as const;
