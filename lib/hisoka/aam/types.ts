// Shared AAM types. Flat so every sub-agent imports from here.

export type ForgeableDim = 'acquisition' | 'content_ops' | 'fulfillment' | 'support';

export type AutomationGap = {
  dim: ForgeableDim | 'compliance' | 'billing';
  current_autonomy: number;  // 0..1
  description: string;
  forgeable: boolean;         // false for compliance/billing (humain obligatoire)
};

export type Candidate = {
  source: 'github' | 'youtube' | 'hn' | 'npm' | 'pypi';
  url: string;
  title: string;
  stars?: number;
  last_commit_at?: string;
  views?: number;
  score?: number;
  language?: string;
  reason: string;
};

export type IntegrationPlan = {
  candidate: Candidate;
  install_script: string;
  entry_point: string;
  entry_code: string;
  required_env_keys: string[];
  notes?: string;
};

export type TestOutput = {
  sandbox_run_id: string;
  exited_cleanly: boolean;
  stdout: string;
  stderr: string;
  duration_ms: number;
  raw_metrics: Record<string, unknown>;
};

export type EvaluationResult = {
  autonomy_after: number;
  passed_threshold: boolean;
  score_per_case: Array<{ case_id: string; score: number; passed: boolean }>;
  human_params_needed: Array<{ param: string; optional: boolean }>;
  notes: string;
};

export type ForgeVerdict = 'promoted' | 'failed' | 'needs_human' | 'out_of_budget';

export type ForgeResult = {
  attempt_id: string;
  idea_id: string;
  attempt_number: number | null;
  dim_targeted: ForgeableDim;
  autonomy_before: number;
  autonomy_after: number | null;
  verdict: ForgeVerdict;
  verdict_reason: string;
  cost_eur: number;
};
