import type { SupabaseClient } from '@supabase/supabase-js';
import type { LandingContent } from './types';

export type PublishResult =
  | { ok: true; deployed_url: string; slug: string }
  | { ok: false; error: string };

export async function publishLanding(
  admin: SupabaseClient,
  params: {
    ticketId: string;
    ideaSlug: string;
    content: LandingContent;
    baseUrl: string;
  },
): Promise<PublishResult> {
  const deployedUrl = `${params.baseUrl.replace(/\/$/, '')}/saas/${params.ideaSlug}`;
  const now = new Date().toISOString();

  const { error: ideaErr } = await admin
    .from('business_ideas')
    .update({
      landing_content: params.content,
      deployed_url: deployedUrl,
      landing_rendered_at: now,
    })
    .eq('slug', params.ideaSlug);

  if (ideaErr) return { ok: false, error: `idea update failed: ${ideaErr.message}` };

  const { error: ticketErr } = await admin
    .from('minato_tickets')
    .update({
      state: 'done',
      pr_url: deployedUrl,
      updated_at: now,
    })
    .eq('id', params.ticketId);

  if (ticketErr) return { ok: false, error: `ticket update failed: ${ticketErr.message}` };

  return { ok: true, deployed_url: deployedUrl, slug: params.ideaSlug };
}

export async function failTicket(
  admin: SupabaseClient,
  ticketId: string,
  error: string,
): Promise<void> {
  await admin
    .from('minato_tickets')
    .update({
      state: 'failed',
      error_message: error.slice(0, 500),
      updated_at: new Date().toISOString(),
    })
    .eq('id', ticketId);
}
