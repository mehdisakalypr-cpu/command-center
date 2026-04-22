// Dispatcher claim logic (v2 §1, §6). No-op when CC_FLEET_ENABLED=false.
// Determines whether a given worker can claim a given ticket.

import { BUDGET_CEILINGS, CcWorker, Capability, MinatoTicket, FLEET_ENABLED } from './types'
import { scopesOverlap, touchesCriticalZone } from './scope-overlap'

export interface ClaimDecision {
  ok: boolean
  reason?: string
}

export function canClaim(
  worker: CcWorker,
  ticket: MinatoTicket,
  inProgress: MinatoTicket[],
): ClaimDecision {
  if (!FLEET_ENABLED) return { ok: false, reason: 'fleet disabled' }

  if (worker.state !== 'active') return { ok: false, reason: `worker state=${worker.state}` }

  // Concurrency cap
  const mine = inProgress.filter(t => t.claimed_by === worker.id).length
  if (mine >= worker.max_concurrent_tickets) {
    return { ok: false, reason: `concurrency cap ${worker.max_concurrent_tickets}` }
  }

  // Assignee pinning
  if (ticket.assignee && ticket.assignee !== 'any' && ticket.assignee !== worker.id) {
    return { ok: false, reason: `assigned to ${ticket.assignee}` }
  }

  // Capability check
  const caps = new Set<Capability>(worker.capabilities)
  for (const req of ticket.required_caps) {
    if (!caps.has(req)) return { ok: false, reason: `missing capability ${req}` }
  }
  for (const forb of ticket.forbidden_caps) {
    if (caps.has(forb)) return { ok: false, reason: `forbidden capability ${forb}` }
  }

  // Budget ceiling
  const ceiling = BUDGET_CEILINGS[ticket.type]
  if (ticket.budget_tokens == null) {
    return { ok: false, reason: 'budget_tokens missing' }
  }
  if (ceiling && ticket.budget_tokens > ceiling) {
    return { ok: false, reason: `budget ${ticket.budget_tokens} > ceiling ${ceiling} for type ${ticket.type}` }
  }

  // Quota runway — freeze claims below 20% remaining (v1 §Quota management)
  if (worker.quota_used_pct >= 80) {
    return { ok: false, reason: `quota ${worker.quota_used_pct}% used` }
  }

  // Night eligibility — if in night window and ticket not night-safe, refuse
  if (isNightWindow() && !ticket.night_eligible && worker.kind === 'autonomous') {
    return { ok: false, reason: 'night window requires night_eligible' }
  }

  // Scope overlap with in_progress tickets
  const criticalMe = touchesCriticalZone(ticket.scope) || ticket.exclusive
  for (const other of inProgress) {
    if (other.id === ticket.id) continue
    if (!scopesOverlap(ticket.scope, other.scope)) continue
    const criticalOther = touchesCriticalZone(other.scope) || other.exclusive
    if (criticalMe || criticalOther) {
      return { ok: false, reason: `scope overlap (critical) with ${other.id}` }
    }
  }

  return { ok: true }
}

// Night window: 00h-08h France (TZ Europe/Paris). Uses server UTC; Paris is UTC+1/+2.
// We don't have date-fns-tz; rough approximation is fine for dispatcher — if node TZ is UTC,
// 00h-08h Paris = 23h-07h UTC (winter) or 22h-06h UTC (summer). We use local Date.
export function isNightWindow(now: Date = new Date()): boolean {
  // Simple heuristic on server local hour; ops can override via env TZ.
  const h = now.getHours()
  return h >= 0 && h < 8
}
