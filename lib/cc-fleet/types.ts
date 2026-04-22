// CC Fleet — shared types. Blueprint: memory/project_cc_dual_account_architecture.md (v2 N-ready)

export type WorkerId = string  // 'main' | 'worker-1' | … (free-form after creation)

export type WorkerKind = 'interactive' | 'autonomous'
export type WorkerState = 'active' | 'paused' | 'offline'
export type QuotaPlan = 'max_5x' | 'max_20x' | 'team' | 'api_direct'

export type Capability =
  | 'ui' | 'feature' | 'architecture' | 'review' | 'debug'
  | 'fix' | 'refactor' | 'scout' | 'content' | 'cron'

export type Project = 'ftg' | 'ofa' | 'cc' | 'estate' | 'shift'

export type TicketType = 'feature' | 'fix' | 'refactor' | 'scout' | 'content' | 'cron'

export type TicketState =
  | 'draft' | 'queued' | 'claimed' | 'in_progress'
  | 'pr_open' | 'merged' | 'done' | 'failed' | 'blocked'

export interface CcWorker {
  id: WorkerId
  display_name: string
  kind: WorkerKind
  capabilities: Capability[]
  quota_plan: QuotaPlan
  quota_used_pct: number
  quota_window_started_at: string | null
  cost_week_usd: number
  heartbeat_at: string | null
  state: WorkerState
  night_eligible: boolean
  max_concurrent_tickets: number
  home_path: string | null
  killswitch_file: string | null
  systemd_unit: string | null
  gh_author_email: string | null
  metadata: Record<string, unknown>
}

export interface MinatoTicket {
  id: string
  project: Project
  type: TicketType
  title: string
  body: string | null
  scope: string[]             // globs
  required_caps: Capability[]
  forbidden_caps: Capability[]
  priority: number            // 0-100
  mrr_impact: number          // multiplier
  mrr_target_id: string | null
  assignee: WorkerId | 'any' | null
  exclusive: boolean
  night_eligible: boolean
  budget_tokens: number | null
  state: TicketState
  claimed_by: WorkerId | null
  claimed_at: string | null
  heartbeat_at: string | null
  last_progress: string | null
  pr_url: string | null
  branch: string | null
  commit_sha: string | null
  deps: string[]
  tokens_used: number
  cost_usd: number
  review_sampled: boolean
  oversized: boolean
  error_message: string | null
  retry_count: number
  created_at: string
  updated_at: string
}

// Budget ceilings per ticket type (v2 §1). Dispatcher rejects claim if estimate > ceiling.
export const BUDGET_CEILINGS: Record<TicketType, number> = {
  scout: 80_000,
  content: 150_000,
  refactor: 200_000,
  fix: 100_000,
  cron: 50_000,
  feature: 500_000,
}

// Critical zones force `exclusive: true` (v1 §Scope locking).
export const CRITICAL_ZONES: string[] = [
  'supabase/migrations/**',
  'lib/types/**',
  'types/**',
  'package.json',
  'pnpm-lock.yaml',
  'package-lock.json',
  '.env',
  '.env.*',
  '.github/workflows/**',
  'middleware.ts',
  'next.config.*',
]

// Feature flag. No-op everywhere when false.
export const FLEET_ENABLED = process.env.CC_FLEET_ENABLED === 'true'
