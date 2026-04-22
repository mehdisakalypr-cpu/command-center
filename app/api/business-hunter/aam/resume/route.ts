import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/supabase-server';
import { promises as fs } from 'node:fs';

export const runtime = 'nodejs';

export async function POST() {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  try { await fs.unlink('/srv/shared/PAUSE_AAM'); } catch { /* not paused */ }
  return NextResponse.json({ ok: true, resumed_at: new Date().toISOString() });
}
