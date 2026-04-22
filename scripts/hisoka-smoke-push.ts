/**
 * Smoke test for the Hisoka push-to-Minato flow.
 * Creates one real minato_tickets row and marks the idea as pushed.
 * Idempotent: if the idea is already pushed, skips the insert and exits OK.
 *
 * Run:
 *   set -a; source .env.local; set +a
 *   npx tsx scripts/hisoka-smoke-push.ts
 */

import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

// ─── Env loader ──────────────────────────────────────────────────────────────
function loadEnv(path: string, override = false) {
  try {
    const raw = readFileSync(path, 'utf8');
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      let v = m[2];
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      if (override || !process.env[m[1]]) process.env[m[1]] = v;
    }
  } catch { /* file may not exist */ }
}
loadEnv('/root/command-center/.env.local');

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
const admin = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

// ─── Scope synthesis (mirrors the route) ─────────────────────────────────────
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

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  // Pick the top-ranked idea
  const { data: ideas, error: e1 } = await admin
    .from('business_ideas')
    .select('id, slug, name, category, pushed_to_minato_at, minato_ticket_id')
    .not('rank', 'is', null)
    .order('rank')
    .limit(1);

  if (e1 || !ideas?.length) {
    console.error('No ranked idea found:', e1?.message ?? 'empty result');
    process.exit(1);
  }

  const pick = ideas[0];
  console.log('Picked idea:', pick.name, `(slug=${pick.slug})`);

  // Idempotency check
  if (pick.pushed_to_minato_at) {
    console.log('Already pushed at', pick.pushed_to_minato_at, '→ skipping (idempotent)');
    console.log('Existing ticket_id:', pick.minato_ticket_id);
    console.log('OK (idempotent)');
    process.exit(0);
  }

  // Load full row
  const { data: idea, error: e2 } = await admin
    .from('business_ideas')
    .select('*')
    .eq('id', pick.id)
    .single();

  if (e2 || !idea) {
    console.error('Failed to load full idea:', e2?.message);
    process.exit(1);
  }

  // Synthesize ticket
  const optimal = (
    idea.optimal_config ??
    (Array.isArray(idea.leverage_configs) ? idea.leverage_configs[0] : null)
  ) as { label?: string; launch_eur?: number; workers?: number } | null;

  const body = [
    `[smoke] Hisoka idea: ${idea.name}`,
    `Tagline: ${idea.tagline}`,
    `Category: ${idea.category}`,
    `Autonomy score: ${idea.autonomy_score}`,
    `Optimal config: ${optimal?.label ?? 'bootstrap'} (€${optimal?.launch_eur ?? 0} launch)`,
    `Rationale: ${idea.rationale ?? '(none)'}`,
    `Bricks: ${Array.isArray(idea.assets_leveraged) ? (idea.assets_leveraged as string[]).join(', ') : '(none)'}`,
    '',
    `Source: hisoka:${idea.slug} (idea_id=${idea.id})`,
  ].join('\n');

  const ticketPayload = {
    project: 'hisoka',
    type: 'feature',
    title: `[Hisoka smoke] ${idea.name}`,
    body,
    scope: synthesizeScope(idea.category as string),
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

  console.log('Inserting ticket with title:', ticketPayload.title);
  const { data: ticket, error: e3 } = await admin
    .from('minato_tickets')
    .insert(ticketPayload)
    .select('id')
    .single();

  if (e3) {
    console.error('Ticket insert failed:', e3.message);
    console.error('Payload keys:', Object.keys(ticketPayload).join(', '));
    process.exit(1);
  }

  const ticketId = (ticket as { id: string }).id;
  console.log('Ticket created:', ticketId);

  // Mark idea as pushed
  const now = new Date().toISOString();
  const { error: e4 } = await admin
    .from('business_ideas')
    .update({ pushed_to_minato_at: now, minato_ticket_id: ticketId })
    .eq('id', pick.id);

  if (e4) {
    console.error('Failed to mark idea as pushed:', e4.message);
    process.exit(1);
  }
  console.log('Idea marked as pushed at', now);

  // Verify idempotency: re-query and confirm columns
  const { data: after } = await admin
    .from('business_ideas')
    .select('pushed_to_minato_at, minato_ticket_id')
    .eq('id', pick.id)
    .single();

  console.log('Verification after update:', after);

  if (after?.pushed_to_minato_at && after?.minato_ticket_id === ticketId) {
    console.log('OK');
  } else {
    console.error('Verification failed — columns not set correctly');
    process.exit(1);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
