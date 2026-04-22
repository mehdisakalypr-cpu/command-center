// CC Fleet public API. Dormant by default — FLEET_ENABLED=false means no-op.
// Blueprint: memory/project_cc_dual_account_architecture.md (v2 N-ready)

export * from './types'
export { canClaim, isNightWindow } from './claim'
export type { ClaimDecision } from './claim'
export { scoreTicket, sortByScore } from './score'
export { scopesOverlap, touchesCriticalZone } from './scope-overlap'
export { antiLoopCheck, MAX_TOOL_ERRORS, MAX_SAME_FILE_EDITS, HEARTBEAT_STALE_MS } from './anti-loop'
export type { AntiLoopState } from './anti-loop'
export {
  OUTPUT_PER_WORKER_PER_DAY, WORKER_COST_USD_PER_MONTH, FUNNEL_RATES,
  fleetCapacityPerDay, estimateEffortGap, revenueFromAdditionalAccounts,
} from './throughput'
