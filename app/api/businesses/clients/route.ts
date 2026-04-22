import { NextResponse } from 'next/server';
import { createSupabaseAdmin, isAdmin } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const slugParam = url.searchParams.get('slug');

  const admin = createSupabaseAdmin();

  // Resolve target slugs: either the single requested one, or all active businesses.
  let targetSlugs: string[] | null = null;
  if (slugParam && slugParam !== '__all__') {
    targetSlugs = [slugParam];
  }

  const clientsQ = admin.from('saas_clients').select('*');
  const waitlistQ = admin.from('saas_waitlist').select('*');
  const eventsQ = admin.from('saas_client_events').select('*')
    .order('created_at', { ascending: false })
    .limit(200);

  if (targetSlugs) {
    clientsQ.in('idea_slug', targetSlugs);
    waitlistQ.in('idea_slug', targetSlugs);
    eventsQ.in('idea_slug', targetSlugs);
  }

  const [clientsRes, waitlistRes, eventsRes] = await Promise.all([
    clientsQ,
    waitlistQ,
    eventsQ,
  ]);

  if (clientsRes.error || waitlistRes.error || eventsRes.error) {
    return NextResponse.json({
      error: 'db_error',
      detail: clientsRes.error?.message ?? waitlistRes.error?.message ?? eventsRes.error?.message,
    }, { status: 500 });
  }

  // Per-slug aggregates for "all" view.
  const bySlug: Record<string, { clients: number; waitlist: number; events: number }> = {};
  for (const c of clientsRes.data ?? []) {
    const k = c.idea_slug as string;
    (bySlug[k] ??= { clients: 0, waitlist: 0, events: 0 }).clients++;
  }
  for (const w of waitlistRes.data ?? []) {
    const k = w.idea_slug as string;
    (bySlug[k] ??= { clients: 0, waitlist: 0, events: 0 }).waitlist++;
  }
  for (const e of eventsRes.data ?? []) {
    const k = e.idea_slug as string;
    (bySlug[k] ??= { clients: 0, waitlist: 0, events: 0 }).events++;
  }

  return NextResponse.json({
    clients: clientsRes.data ?? [],
    waitlist: waitlistRes.data ?? [],
    events: eventsRes.data ?? [],
    bySlug,
  });
}
