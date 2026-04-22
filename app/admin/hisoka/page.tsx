import { createSupabaseAdmin } from '@/lib/supabase-server';
import type { IdeaRow } from './types';
import RunButton from './components/RunButton';
import IdeasTable from './components/IdeasTable';
import RunLog, { type RunRow } from './components/RunLog';
import HeaderActions from './components/HeaderActions';
import ArchitectureDiagram from '@/app/admin/_shared/ArchitectureDiagram';

export const dynamic = 'force-dynamic';

const HISOKA_ARCHITECTURE = `flowchart TD
  subgraph Discovery["🃏 Hisoka Discovery (Phases 1-2)"]
    A1[Trigger: ▶ Run or cron] --> A2[Signal Harvester<br/>HN + YC RFS + Reddit]
    A2 --> A3[Context Loader<br/>bricks + agents + prev top 20]
    A3 --> A4[Ideator LLM<br/>generates 30 candidates]
    A4 --> A5[Hard Gates code<br/>autonomy≥0.9, setup≤40h, …]
    A5 --> A6[Base Score + Rank<br/>top 20 persisted]
  end

  subgraph Analysis["Phase 3 — Portfolio + Leverage"]
    B1[Envelope sliders<br/>budget + fleet] --> B2[Client re-rank<br/>via leverage_configs]
    A6 --> B2
    A6 --> B3[Portfolio Mode<br/>capital + risk → 3-5 alloc]
    B3 --> B4[Benchmark vs<br/>HYSA / bonds / SP500]
  end

  subgraph Deep["Phase 4 — Deep Analysis + Execution Bridge"]
    A6 --> C1[Deep Dive Drawer<br/>row click]
    C1 --> C2[Monte Carlo 500 runs<br/>P10/P50/P90 × 6 horizons]
    C1 --> C3[Leverage Configs<br/>4 rows + ⭐ sweet spot]
    C1 --> C4[▶ Push to Minato<br/>creates minato_ticket]
  end

  subgraph Forge["Phase 5 — AAM Forge 💪 (lift 0.75-0.89 → ≥0.92)"]
    A6 -.archived<br/>0.75-0.89.-> D1[Forge Queue]
    D1 --> D2[Gap Analyzer]
    D2 --> D3[Mei Hatsume Scout 🔧<br/>GitHub+HN]
    D3 --> D4[Power Loader ⚒<br/>Integration plan]
    D4 --> D5[Endeavor 🔥<br/>E2B Sandbox test]
    D5 --> D6[Melissa Shield 🛡<br/>Evaluate autonomy_after]
    D6 --> D7[Nighteye 👁<br/>Promote if ≥0.92]
    D7 -.promoted.-> A6
  end

  subgraph Future["Phase 6 BACKLOG — Monetization"]
    C4 -.after Minato build.-> E1[Melissa++ : receptacle user ?]
    E1 --> E2[Mineta 🪙 scout<br/>Polar/Gumroad/NOWPayments]
    E2 --> E3[Deku 👊 — prompt user<br/>rattachement LLC ≥€500 MRR]
  end

  style A4 fill:#C9A84C,color:#0A1A2E
  style D5 fill:#FF6B6B,color:#fff
  style D7 fill:#6BCB77,color:#0A1A2E
  style C4 fill:#C9A84C,color:#0A1A2E
  style E3 fill:#9BA8B8,color:#0A1A2E,stroke-dasharray:5 5
`;

export default async function HisokaPage() {
  const admin = createSupabaseAdmin();
  const [{ data: ideas }, { data: lastRun }, { data: recentRuns }] = await Promise.all([
    admin.from('business_ideas')
      .select('id, slug, name, tagline, category, autonomy_score, score, rank, llc_gate, assets_leveraged, leverage_configs, optimal_config, leverage_elasticity, mrr_median, deployed_url')
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
      <ArchitectureDiagram title="🏗 Architecture Hisoka" mermaid={HISOKA_ARCHITECTURE} />
    </div>
  );
}
