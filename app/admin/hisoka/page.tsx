import { createSupabaseAdmin } from '@/lib/supabase-server';
import type { IdeaRow } from './types';
import RunButton from './components/RunButton';
import IdeasTable from './components/IdeasTable';
import RunLog, { type RunRow } from './components/RunLog';
import HeaderActions from './components/HeaderActions';

export const dynamic = 'force-dynamic';

export default async function HisokaPage() {
  const admin = createSupabaseAdmin();
  const [{ data: ideas }, { data: lastRun }, { data: recentRuns }] = await Promise.all([
    admin.from('business_ideas')
      .select('id, slug, name, tagline, category, autonomy_score, score, rank, llc_gate, assets_leveraged, leverage_configs')
      .not('rank', 'is', null).order('rank').limit(20),
    admin.from('business_hunter_runs')
      .select('started_at, status, cost_eur, ideas_upserted')
      .order('started_at', { ascending: false }).limit(1).maybeSingle(),
    admin.from('business_hunter_runs')
      .select('id, trigger, started_at, finished_at, ideas_discovered, ideas_upserted, cost_eur, status, error')
      .order('started_at', { ascending: false }).limit(10),
  ]);

  return (
    <div style={{ padding: 24, color: '#E6EEF7' }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#C9A84C' }}>
          🃏 Hisoka — Business Hunter
        </h1>
        <div style={{ fontSize: 13, color: '#9BA8B8', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
          <em>"The predator who scores what others miss."</em>
          {' · '}
          Last hunt: {lastRun?.started_at ? new Date(lastRun.started_at).toLocaleString('fr-FR') : 'never'}
          {lastRun?.cost_eur ? ` · €${Number(lastRun.cost_eur).toFixed(2)}` : ''}
          {' · '}{ideas?.length ?? 0} preys in top 20
          <HeaderActions />
        </div>
      </div>
      <RunButton />
      <div style={{ marginTop: 16 }}>
        <IdeasTable initialIdeas={(ideas ?? []) as IdeaRow[]} />
      </div>
      <RunLog runs={(recentRuns ?? []) as RunRow[]} />
    </div>
  );
}
