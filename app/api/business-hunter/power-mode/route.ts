import { NextResponse } from 'next/server';
import { createSupabaseAdmin, isAdmin } from '@/lib/supabase-server';

export const runtime = 'nodejs';

const PRESETS = {
  ultra_instinct: { budget_cap_eur: 100, workers_max: 3, daily_spend_cap_eur: 4 },
  shaka_33: { budget_cap_eur: 30, workers_max: 1, daily_spend_cap_eur: 1.5 },
} as const;

export async function GET() {
  const admin = createSupabaseAdmin();
  const { data, error } = await admin.from('cc_power_mode').select('*').eq('id', 1).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? { mode: 'shaka_33', workers_max: 1, budget_cap_eur: 30, daily_spend_cap_eur: 1.5 });
}

export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  let body: { mode?: string; activated_by?: string };
  try {
    body = (await req.json()) as { mode?: string; activated_by?: string };
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }
  const mode = body.mode;
  if (mode !== 'ultra_instinct' && mode !== 'shaka_33') {
    return NextResponse.json({ error: 'mode must be ultra_instinct or shaka_33' }, { status: 400 });
  }
  const preset = PRESETS[mode];
  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from('cc_power_mode')
    .upsert({
      id: 1,
      mode,
      activated_at: new Date().toISOString(),
      activated_by: body.activated_by ?? 'admin-ui',
      ...preset,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
