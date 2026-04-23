import { createSupabaseAdmin } from '@/lib/supabase-server'
import BacktestsClient, { type BacktestRow } from './BacktestsClient'

export const revalidate = 60

const GOLD = '#C9A84C'
const BG = '#0A1A2E'
const FG = '#E6EEF7'
const BAD = '#FF6B6B'

export default async function OptimusBacktestsPage() {
  const admin = createSupabaseAdmin()

  const { data: raw, error } = await admin
    .from('optimus_backtests')
    .select('id, strategy_id, started_at, finished_at, bar_range, symbols, timeframe, params, metrics, status')
    .order('started_at', { ascending: false })
    .limit(100)

  if (error && (error.code === '42P01' || error.code === 'PGRST116')) {
    return (
      <div style={{ padding: 24, color: FG, background: BG, minHeight: '100vh' }}>
        <h1 style={{ color: GOLD, fontSize: 22, fontWeight: 700, marginBottom: 16 }}>
          Optimus — Backtests
        </h1>
        <div style={{ padding: 16, background: 'rgba(255,107,107,.1)', color: BAD, borderRadius: 6, border: `1px solid ${BAD}`, fontSize: 13 }}>
          Table <code>optimus_backtests</code> absente. Appliquer la migration correspondante via Management API.
        </div>
        <div style={{ marginTop: 16, fontSize: 11, color: '#9BA8B8' }}>
          <a href="/admin/optimus/coverage" style={{ color: GOLD, textDecoration: 'none' }}>← Coverage</a>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: 24, color: FG, background: BG, minHeight: '100vh' }}>
        <h1 style={{ color: GOLD, fontSize: 22, fontWeight: 700, marginBottom: 16 }}>
          Optimus — Backtests
        </h1>
        <div style={{ padding: 16, background: 'rgba(255,107,107,.1)', color: BAD, borderRadius: 6, border: `1px solid ${BAD}`, fontSize: 13 }}>
          Erreur Supabase : {error.message}
        </div>
      </div>
    )
  }

  const sorted = ((raw ?? []) as BacktestRow[]).sort((a, b) => {
    const sa = a.metrics ? Number(a.metrics['sharpe']) : NaN
    const sb = b.metrics ? Number(b.metrics['sharpe']) : NaN
    if (isNaN(sa) && isNaN(sb)) return 0
    if (isNaN(sa)) return 1
    if (isNaN(sb)) return -1
    return sb - sa
  })

  return <BacktestsClient rows={sorted} />
}
