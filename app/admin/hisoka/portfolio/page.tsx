import { createSupabaseAdmin } from '@/lib/supabase-server';
import { PowerModeBadge } from '@/components/PowerModeBadge';
import PortfolioView from './PortfolioView';

export const dynamic = 'force-dynamic';

export default async function HisokaPortfolioPage() {
  const admin = createSupabaseAdmin();
  const [{ data: ideas }, { data: powerMode }, { data: events }] = await Promise.all([
    admin
      .from('business_ideas')
      .select(
        'id, rank, name, tagline, score, status, progress_pct, estimate_days_min, estimate_days_max, estimate_confidence, started_at, shipped_at, blocked_reason, worker_id, last_commit_sha, last_commit_at, hours_reuse, days_new_code, critical_path, human_gates, reuse_bricks, mrr_median, deployed_url',
      )
      .not('rank', 'is', null)
      .order('rank')
      .limit(20),
    admin.from('cc_power_mode').select('*').eq('id', 1).maybeSingle(),
    admin
      .from('hisoka_build_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200),
  ]);

  return (
    <div style={{ padding: 24, color: '#E6EEF7' }}>
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#C9A84C', margin: 0 }}>
          🃏 Portfolio Hisoka
        </h1>
        <PowerModeBadge />
        <div style={{ fontSize: 12, color: '#9CA3AF', fontStyle: 'italic' }}>
          Suivi E2E de la production des services du top 10 · barres de progression + estimations J-H + timeline
        </div>
      </div>
      <PortfolioView
        initial={{
          ideas: (ideas ?? []) as any,
          power_mode: (powerMode ?? null) as any,
          events: (events ?? []) as any,
        }}
      />
    </div>
  );
}
