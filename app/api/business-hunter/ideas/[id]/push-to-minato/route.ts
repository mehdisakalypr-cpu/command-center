import { NextResponse } from 'next/server';
import { createSupabaseAdmin, isAdmin } from '@/lib/supabase-server';

export const runtime = 'nodejs';

type LeverageConfig = { label?: string; launch_eur?: number; workers?: number };

// ─── Scope synthesis ────────────────────────────────────────────────────────
// Returns greenfield paths that don't overlap with existing production code.
function synthesizeScope(category: string): string[] {
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

// ─── Body synthesis ─────────────────────────────────────────────────────────
function synthesizeBody(idea: Record<string, unknown>): string {
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

// ─── Route handler ───────────────────────────────────────────────────────────
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const admin = createSupabaseAdmin();

  // 1. Load the idea
  const { data: idea, error: loadErr } = await admin
    .from('business_ideas')
    .select('*')
    .eq('id', id)
    .single();

  if (loadErr || !idea) {
    return NextResponse.json(
      { ok: false, error: 'idea not found' },
      { status: 404 },
    );
  }

  // 2. Idempotency: if already pushed, return existing ticket
  if (idea.pushed_to_minato_at && idea.minato_ticket_id) {
    return NextResponse.json({
      ok: true,
      already_queued: true,
      ticket_id: idea.minato_ticket_id,
      pushed_at: idea.pushed_to_minato_at,
      title: `[Hisoka] ${idea.name}`,
    });
  }

  // 3. Synthesize ticket payload
  const scope = synthesizeScope(idea.category as string);
  const body = synthesizeBody(idea as Record<string, unknown>);

  const ticketPayload = {
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
    mrr_target_id: `hisoka.${idea.slug}`,
  };

  // 4. Insert ticket into Minato queue
  const { data: ticket, error: insErr } = await admin
    .from('minato_tickets')
    .insert(ticketPayload)
    .select('id')
    .single();

  if (insErr) {
    return NextResponse.json(
      {
        ok: false,
        error: `ticket insert failed: ${insErr.message}`,
        hint: 'check minato_tickets columns match payload',
        payload_keys: Object.keys(ticketPayload),
      },
      { status: 500 },
    );
  }

  // 5. Mark the idea as pushed
  const ticketId = (ticket as { id: string }).id;
  const now = new Date().toISOString();

  await admin
    .from('business_ideas')
    .update({ pushed_to_minato_at: now, minato_ticket_id: ticketId })
    .eq('id', id);

  return NextResponse.json({
    ok: true,
    already_queued: false,
    ticket_id: ticketId,
    pushed_at: now,
    title: ticketPayload.title,
  });
}
