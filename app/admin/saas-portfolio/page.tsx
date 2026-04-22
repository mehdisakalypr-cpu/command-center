import { createSupabaseAdmin } from '@/lib/supabase-server';
import PortfolioTable, { type SaasRow } from './PortfolioTable';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

export default async function SaasPortfolioPage() {
  const admin = createSupabaseAdmin();

  const { data: ideas } = await admin
    .from('business_ideas')
    .select('id, slug, name, tagline, category, autonomy_score, landing_content, deployed_url, landing_rendered_at, minato_ticket_id, pushed_to_minato_at')
    .not('deployed_url', 'is', null)
    .order('landing_rendered_at', { ascending: true });

  const rows: SaasRow[] = (ideas ?? []).map((i, idx) => ({
    num: idx + 1,
    id: i.id as string,
    slug: i.slug as string,
    name: (i.name as string) ?? i.slug,
    tagline: (i.tagline as string) ?? '',
    category: (i.category as string) ?? '',
    deployed_url: i.deployed_url as string,
    landing_rendered_at: i.landing_rendered_at as string | null,
    autonomy_score: Number(i.autonomy_score ?? 0),
    hero_title: (i.landing_content as { hero_title?: string } | null)?.hero_title ?? null,
    waitlist_count: 0,
  }));

  // Waitlist counts per slug (single round-trip: select slug, then count client-side)
  if (rows.length) {
    const slugs = rows.map((r) => r.slug);
    const { data: wl } = await admin
      .from('saas_waitlist')
      .select('idea_slug')
      .in('idea_slug', slugs);
    const counts = new Map<string, number>();
    for (const w of wl ?? []) {
      const s = (w as { idea_slug: string }).idea_slug;
      counts.set(s, (counts.get(s) ?? 0) + 1);
    }
    for (const r of rows) r.waitlist_count = counts.get(r.slug) ?? 0;
  }

  const totalWaitlist = rows.reduce((s, r) => s + r.waitlist_count, 0);

  return (
    <div style={{ padding: 24, color: '#E6EEF7' }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#6BCB77' }}>
          🚀 SaaS Portfolio
        </h1>
        <div style={{ fontSize: 13, color: '#9BA8B8' }}>
          <em>Toutes les landings Hisoka vivantes. Chaque projet = une idée promue ≥ 0.92 autonomie, rendue par saas-forge.</em>
          <br />
          {rows.length} projets live · {totalWaitlist} emails collectés · agrégats consolidés dans{' '}
          <a href="/admin/simulator" style={{ color: '#C9A84C' }}>Simulateur</a>
        </div>
      </div>
      <PortfolioTable rows={rows} />
    </div>
  );
}
