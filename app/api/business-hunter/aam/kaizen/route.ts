import { NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase-server';
import { withFallback } from '@/lib/ai-pool/cascade';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(req: Request) {
  if (req.headers.get('x-cron-token') !== process.env.CRON_TOKEN) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  const admin = createSupabaseAdmin();
  const since = new Date(Date.now() - 7 * 86400_000).toISOString();
  const { data: fails } = await admin.from('automation_upgrades')
    .select('idea_id, dim_targeted, chosen_candidate, verdict_reason')
    .eq('verdict', 'failed')
    .gte('started_at', since);
  if (!fails?.length) return NextResponse.json({ ok: true, summary: 'no failures this week' });

  const prompt = `Past 7 days of failed AAM forge attempts (${fails.length} rows):
${JSON.stringify(fails, null, 2).slice(0, 8000)}

Identify top 3 patterns (e.g. "candidates on dim X routinely fail because Y"). Return markdown bullets.`;

  const gen = await withFallback(
    { system: 'You are a failure-pattern analyst.', prompt, model: 'anthropic/claude-sonnet-4-6', temperature: 0.3, maxTokens: 800 },
    { project: 'cc', order: ['openrouter', 'anthropic', 'groq'] },
  );

  const firstIdea = (fails[0] as { idea_id?: string }).idea_id ?? '00000000-0000-0000-0000-000000000000';
  await admin.from('automation_upgrades').insert({
    idea_id: firstIdea,
    attempt_number: 0,
    dim_targeted: 'content_ops',
    autonomy_before: 0,
    verdict: 'needs_human',
    verdict_reason: `kaizen report week of ${since.slice(0, 10)}`,
    test_output: { kaizen_summary: gen.text },
    cost_eur: gen.costUsd ? gen.costUsd * 0.92 : 0,
  });
  return NextResponse.json({ ok: true, summary: gen.text });
}
