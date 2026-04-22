// MRR-aware dispatcher score (v2 §6).
//   score = priority × mrr_impact × (1 / max(estimated_tokens, 1))
// Used to pick next ticket to claim when several are claimable.

import { MinatoTicket } from './types'

export function scoreTicket(t: Pick<MinatoTicket, 'priority' | 'mrr_impact' | 'budget_tokens'>): number {
  const tokens = Math.max(t.budget_tokens ?? 100_000, 1)
  return (t.priority * t.mrr_impact) / tokens
}

// Convenience: sort tickets descending by score (highest first).
export function sortByScore<T extends Pick<MinatoTicket, 'priority' | 'mrr_impact' | 'budget_tokens'>>(tickets: T[]): T[] {
  return [...tickets].sort((a, b) => scoreTicket(b) - scoreTicket(a))
}
