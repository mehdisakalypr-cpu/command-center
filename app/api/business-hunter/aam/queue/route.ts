import { NextResponse } from 'next/server';
import { createSupabaseAdmin, isAdmin } from '@/lib/supabase-server';

export const runtime = 'nodejs';

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  const admin = createSupabaseAdmin();
  const [q, active, recent, budget] = await Promise.all([
    admin.from('business_ideas').select('id,name,autonomy_score,forge_attempts,forge_status,automation_gaps').eq('forge_status','idle').gte('autonomy_score',0.75).lte('autonomy_score',0.89).lt('forge_attempts',3).order('autonomy_score',{ascending:true}).limit(20),
    admin.from('business_ideas').select('id,name,autonomy_score,forge_attempts').eq('forge_status','forging'),
    admin.from('automation_upgrades').select('*').order('started_at',{ascending:false}).limit(20),
    admin.from('automation_upgrades').select('cost_eur').gte('started_at', new Date(Date.now()-86400_000).toISOString()),
  ]);
  const costToday = (budget.data ?? []).reduce((s: number, r: { cost_eur?: number }) => s + Number(r.cost_eur ?? 0), 0);
  return NextResponse.json({ ok: true, queued: q.data ?? [], active: active.data ?? [], recent: recent.data ?? [], cost_today_eur: costToday });
}
