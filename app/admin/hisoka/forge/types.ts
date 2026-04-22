export type QueueItem = {
  id: string;
  name: string;
  autonomy_score: number;
  forge_attempts: number;
  forge_status: string;
  automation_gaps?: Array<{
    dim: string;
    current_autonomy: number;
    description: string;
    forgeable: boolean;
  }>;
};

export type AttemptRow = {
  id: string;
  idea_id: string;
  attempt_number: number;
  dim_targeted: string;
  autonomy_before: number;
  autonomy_after: number | null;
  verdict: 'promoted' | 'failed' | 'needs_human' | 'out_of_budget';
  verdict_reason: string | null;
  cost_eur: number | null;
  started_at: string;
  finished_at: string | null;
};
