import { createSupabaseAdmin } from '@/lib/supabase-server';
import ForgeControls from './components/ForgeControls';
import ForgeQueueTable from './components/ForgeQueueTable';
import AttemptsLog from './components/AttemptsLog';
import BudgetGauge from './components/BudgetGauge';
import type { QueueItem, AttemptRow } from './types';

export const dynamic = 'force-dynamic';

export default async function ForgePage() {
  const admin = createSupabaseAdmin();
  const [q, active, recent, budget] = await Promise.all([
    admin
      .from('business_ideas')
      .select('id,name,autonomy_score,forge_attempts,forge_status,automation_gaps')
      .eq('forge_status', 'idle')
      .gte('autonomy_score', 0.75)
      .lte('autonomy_score', 0.89)
      .lt('forge_attempts', 3)
      .order('autonomy_score', { ascending: true })
      .limit(20),
    admin
      .from('business_ideas')
      .select('id,name,autonomy_score,forge_attempts,forge_status')
      .eq('forge_status', 'forging'),
    admin
      .from('automation_upgrades')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(20),
    admin
      .from('automation_upgrades')
      .select('cost_eur')
      .gte('started_at', new Date(Date.now() - 86400_000).toISOString()),
  ]);

  const costToday = (budget.data ?? []).reduce(
    (s: number, r) => s + Number((r as { cost_eur?: number }).cost_eur ?? 0),
    0
  );

  return (
    <div style={{ padding: 24, color: '#E6EEF7' }}>
      <div style={{ marginBottom: 14 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#C9A84C' }}>
          💪 Armored All Might — Forge
        </h1>
        <div style={{ fontSize: 12, color: '#9BA8B8' }}>
          On renforce les lacunes. Budget du jour €{costToday.toFixed(2)} / €0.50 cap.
        </div>
      </div>
      <ForgeControls />
      <BudgetGauge costTodayEur={costToday} />
      <div style={{ marginTop: 16 }}>
        <div style={{ color: '#C9A84C', fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
          En cours
        </div>
        {(active.data ?? []).length === 0 ? (
          <div style={{ color: '#9BA8B8', fontSize: 12 }}>aucune forge active</div>
        ) : (
          <ul style={{ fontSize: 13 }}>
            {(active.data ?? []).map((i) => (
              <li key={(i as { id: string }).id}>
                {(i as { name: string }).name} — attempt {(i as { forge_attempts: number }).forge_attempts}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div style={{ marginTop: 20 }}>
        <div style={{ color: '#C9A84C', fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
          Queue ({(q.data ?? []).length})
        </div>
        <ForgeQueueTable items={(q.data ?? []) as QueueItem[]} />
      </div>
      <div style={{ marginTop: 20 }}>
        <div style={{ color: '#C9A84C', fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
          Derniers essais
        </div>
        <AttemptsLog attempts={(recent.data ?? []) as AttemptRow[]} />
      </div>
    </div>
  );
}
