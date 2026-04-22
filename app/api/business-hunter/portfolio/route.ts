import { NextResponse } from 'next/server';
import { createSupabaseAdmin, isAdmin } from '@/lib/supabase-server';
import { proposePortfolio } from '@/lib/hisoka/portfolio';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  }
  let body: { availableCapitalEur?: number; maxExtraWorkers?: number; riskAppetite?: string };
  try {
    body = await req.json() as { availableCapitalEur?: number; maxExtraWorkers?: number; riskAppetite?: string };
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid JSON' }, { status: 400 });
  }

  const capital = Number(body.availableCapitalEur);
  const workers = Number(body.maxExtraWorkers);
  const risk = body.riskAppetite;

  if (!Number.isFinite(capital) || capital < 0 || capital > 100000) {
    return NextResponse.json({ ok: false, error: 'availableCapitalEur must be 0-100000' }, { status: 400 });
  }
  if (!Number.isFinite(workers) || workers < 0 || workers > 10) {
    return NextResponse.json({ ok: false, error: 'maxExtraWorkers must be 0-10' }, { status: 400 });
  }
  if (risk !== 'conservative' && risk !== 'balanced' && risk !== 'aggressive') {
    return NextResponse.json({ ok: false, error: 'riskAppetite invalid' }, { status: 400 });
  }

  try {
    const admin = createSupabaseAdmin();
    const result = await proposePortfolio(admin, {
      availableCapitalEur: capital,
      maxExtraWorkers: workers,
      riskAppetite: risk,
    });
    return NextResponse.json({ ok: true, result });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e).slice(0, 500) }, { status: 500 });
  }
}
