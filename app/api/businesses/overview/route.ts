import { NextResponse } from 'next/server';
import { createSupabaseAdmin, isAdmin } from '@/lib/supabase-server';
import type { Business } from '@/lib/businesses/types';

export const dynamic = 'force-dynamic';

type Overview = {
  business: Business;
  clients: number;
  waitlist: number;
  events_30d: number;
  landing_live: boolean;
  landing_url: string | null;
  forge_status: string | null;
};

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const admin = createSupabaseAdmin();
  const [bizRes, clientsRes, waitlistRes, eventsRes, ideasRes] = await Promise.all([
    admin.from('businesses').select('*').order('name'),
    admin.from('saas_clients').select('idea_slug'),
    admin.from('saas_waitlist').select('idea_slug'),
    admin.from('saas_client_events').select('idea_slug, created_at')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
    admin.from('business_ideas').select('slug, deployed_url, landing_content, forge_status'),
  ]);

  if (bizRes.error) {
    return NextResponse.json({ error: 'db_error', detail: bizRes.error.message }, { status: 500 });
  }

  const clientCount: Record<string, number> = {};
  for (const c of clientsRes.data ?? []) clientCount[c.idea_slug] = (clientCount[c.idea_slug] ?? 0) + 1;
  const waitlistCount: Record<string, number> = {};
  for (const w of waitlistRes.data ?? []) waitlistCount[w.idea_slug] = (waitlistCount[w.idea_slug] ?? 0) + 1;
  const eventsCount: Record<string, number> = {};
  for (const e of eventsRes.data ?? []) eventsCount[e.idea_slug] = (eventsCount[e.idea_slug] ?? 0) + 1;
  const ideasByslug: Record<string, { deployed_url: string | null; has_landing: boolean; forge_status: string | null }> = {};
  for (const i of ideasRes.data ?? []) {
    if (!i.slug) continue;
    ideasByslug[i.slug] = {
      deployed_url: i.deployed_url ?? null,
      has_landing: i.landing_content != null,
      forge_status: i.forge_status ?? null,
    };
  }

  const overview: Overview[] = (bizRes.data as Business[]).map(b => {
    const idea = ideasByslug[b.slug];
    return {
      business: b,
      clients: clientCount[b.slug] ?? 0,
      waitlist: waitlistCount[b.slug] ?? 0,
      events_30d: eventsCount[b.slug] ?? 0,
      landing_live: idea?.has_landing ?? false,
      landing_url: idea?.deployed_url ?? null,
      forge_status: idea?.forge_status ?? null,
    };
  });

  return NextResponse.json({ overview });
}
