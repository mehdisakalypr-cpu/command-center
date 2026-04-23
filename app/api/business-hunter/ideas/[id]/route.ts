import { NextResponse } from 'next/server';
import { createSupabaseAdmin, isAdmin } from '@/lib/supabase-server';
import { translateIdea, isSupportedLocale } from '@/lib/hisoka/translate-idea';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, error: 'admin only' }, { status: 403 });
  }
  const { id } = await params;
  const admin = createSupabaseAdmin();
  const [{ data: idea, error: e1 }, { data: deep, error: e2 }] = await Promise.all([
    admin.from('business_ideas').select('*').eq('id', id).single(),
    admin.from('business_idea_deep').select('*').eq('idea_id', id).order('version', { ascending: false }).limit(1),
  ]);
  if (e1 || !idea) return NextResponse.json({ ok: false, error: e1?.message ?? 'not found' }, { status: 404 });

  const url = new URL(req.url);
  const locale = url.searchParams.get('locale');
  let finalIdea = idea as Record<string, unknown>;
  let translatedLocale: string | null = null;

  if (locale && isSupportedLocale(locale) && locale !== 'en') {
    try {
      finalIdea = await translateIdea(admin, finalIdea, locale);
      translatedLocale = locale;
    } catch (err) {
      console.error('[ideas/[id]] translate failed', err);
    }
  }

  return NextResponse.json({
    ok: true,
    idea: finalIdea,
    deep: deep?.[0] ?? null,
    deep_err: e2?.message ?? null,
    locale: translatedLocale,
  });
}
