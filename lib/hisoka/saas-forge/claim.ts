import type { SupabaseClient } from '@supabase/supabase-js';

export type ClaimedTicket = {
  id: string;
  title: string;
  body: string | null;
  mrr_target_id: string | null;
};

/**
 * Atomic claim: highest-priority queued hisoka ticket → in_progress.
 * Two-phase (pick candidate, conditional flip) guards against double-claim
 * from overlapping cron invocations.
 */
export async function claimHisokaTicket(admin: SupabaseClient): Promise<ClaimedTicket | null> {
  const { data: candidate } = await admin
    .from('minato_tickets')
    .select('id')
    .eq('project', 'hisoka')
    .eq('state', 'queued')
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!candidate) return null;

  const { data: claimed, error } = await admin
    .from('minato_tickets')
    .update({
      state: 'in_progress',
      claimed_by: 'saas-forge',
      claimed_at: new Date().toISOString(),
      heartbeat_at: new Date().toISOString(),
    })
    .eq('id', (candidate as { id: string }).id)
    .eq('state', 'queued')
    .select('id, title, body, mrr_target_id')
    .maybeSingle();

  if (error || !claimed) return null;
  return claimed as ClaimedTicket;
}
