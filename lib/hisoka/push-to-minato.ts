import type { SupabaseClient } from '@supabase/supabase-js';

type LeverageConfig = { label?: string; launch_eur?: number; workers?: number };

export function synthesizeScope(category: string): string[] {
  const base = ['docs/hisoka-ideas/**', 'lib/hisoka/ideas/**'];
  switch (category) {
    case 'middleware_api':
    case 'b2b_integration':
      return [...base, 'app/api/hisoka-ideas/**'];
    case 'marketplace':
    case 'productized_service':
      return [...base, 'app/hisoka-ideas/**'];
    case 'content_platform':
    case 'tool_utility':
      return [...base, 'app/hisoka-ideas/**', 'components/hisoka-ideas/**'];
    default:
      return base;
  }
}

export function synthesizeBody(idea: Record<string, unknown>): string {
  const optimal = (
    idea.optimal_config ??
    (Array.isArray(idea.leverage_configs) ? idea.leverage_configs[0] : null)
  ) as LeverageConfig | null;

  const lines: string[] = [
    `# Hisoka-sourced business idea: ${idea.name}`,
    '',
    `**Tagline:** ${idea.tagline}`,
    `**Category:** ${idea.category}`,
    `**Autonomy score:** ${idea.autonomy_score}`,
    `**Optimal config:** ${optimal?.label ?? 'bootstrap'} (€${optimal?.launch_eur ?? 0} launch, ${optimal?.workers ?? 1}w)`,
    `**LLC gate:** ${idea.llc_gate}`,
    '',
    '## Rationale',
    (idea.rationale as string | null | undefined) ?? '(no rationale recorded)',
    '',
    '## Bricks to reuse (from Hisoka assets_leveraged)',
    ...(Array.isArray(idea.assets_leveraged)
      ? (idea.assets_leveraged as string[]).map((b) => `- ${b}`)
      : ['(none listed)']),
    '',
    '## Distribution channels (pre-validated)',
    ...(Array.isArray(idea.distribution_channels)
      ? (idea.distribution_channels as string[]).map((c) => `- ${c}`)
      : ['(none listed)']),
    '',
    '## Monetization',
    `Model: ${idea.monetization_model}`,
    idea.pricing_tiers ? `Tiers: ${JSON.stringify(idea.pricing_tiers)}` : '',
    '',
    '## Expected MRR (median)',
    idea.mrr_median
      ? `\`\`\`json\n${JSON.stringify(idea.mrr_median, null, 2)}\n\`\`\``
      : '(not recorded)',
    '',
    '---',
    `Source: hisoka:${idea.slug} (idea_id=${idea.id})`,
  ];

  return lines.filter((l) => l !== null && l !== undefined).join('\n');
}

export type PushResult = {
  idea_id: string;
  slug: string;
  ticket_id?: string;
  already_queued?: boolean;
  error?: string;
};

export async function pushIdeaToMinato(
  admin: SupabaseClient,
  idea: Record<string, unknown>,
): Promise<PushResult> {
  const ideaId = idea.id as string;
  const slug = idea.slug as string;

  if (idea.pushed_to_minato_at && idea.minato_ticket_id) {
    return { idea_id: ideaId, slug, ticket_id: idea.minato_ticket_id as string, already_queued: true };
  }

  const scope = synthesizeScope(idea.category as string);
  const body = synthesizeBody(idea);

  const { data: ticket, error: insErr } = await admin
    .from('minato_tickets')
    .insert({
      project: 'hisoka',
      type: 'feature',
      title: `[Hisoka] ${idea.name}`,
      body,
      scope,
      required_caps: [] as string[],
      forbidden_caps: [] as string[],
      priority: 80,
      assignee: 'any',
      exclusive: false,
      night_eligible: true,
      budget_tokens: 500_000,
      state: 'queued',
      mrr_target_id: `hisoka.${slug}`,
    })
    .select('id')
    .single();

  if (insErr) {
    return { idea_id: ideaId, slug, error: `ticket insert failed: ${insErr.message}` };
  }

  const ticketId = (ticket as { id: string }).id;
  await admin
    .from('business_ideas')
    .update({ pushed_to_minato_at: new Date().toISOString(), minato_ticket_id: ticketId })
    .eq('id', ideaId);

  return { idea_id: ideaId, slug, ticket_id: ticketId, already_queued: false };
}
