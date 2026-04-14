/**
 * /admin/infra — dashboard capacité infrastructure
 * Affiche par provider × scope l'utilisation, la % cap, le seuil atteint,
 * les alertes ouvertes, le coût mensuel actuel.
 */
import { createClient } from '@supabase/supabase-js'

export const metadata = { title: 'Infrastructure Capacity — Admin' }
export const dynamic = 'force-dynamic'

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

type UtilRow = { provider: string; scope: string; metric: string; value: number; limit_value: number | null; pct_used: number | null; current_tier: string; current_cost_eur: number; sampled_at: string }
type ThresholdRow = { provider: string; metric: string; warn_pct: number; critical_pct: number; lockout_pct: number; auto_scale: boolean }
type AlertRow = { id: number; triggered_at: string; provider: string; scope: string; metric: string; value: number; pct_used: number; severity: string; action_taken: string | null; resolved_at: string | null }
type SubRow = { provider: string; scope: string; cost_eur_month: number; infrastructure_tiers: { tier_name: string; pricing_url: string | null } | null }

function severityOf(pct: number, th: ThresholdRow | undefined): 'ok' | 'warn' | 'critical' | 'lockout' {
  if (!th) return 'ok'
  if (pct >= th.lockout_pct) return 'lockout'
  if (pct >= th.critical_pct) return 'critical'
  if (pct >= th.warn_pct) return 'warn'
  return 'ok'
}

const SEV_COLOR: Record<string, string> = {
  ok: '#10B981', warn: '#F59E0B', critical: '#EF4444', lockout: '#B91C1C',
}

export default async function InfraPage() {
  const sb = db()
  const [{ data: util }, { data: thresholds }, { data: alerts }, { data: subs }] = await Promise.all([
    sb.from('v_infrastructure_utilization').select('*'),
    sb.from('infrastructure_thresholds').select('*'),
    sb.from('infrastructure_alerts').select('*').is('resolved_at', null).order('triggered_at', { ascending: false }).limit(20),
    sb.from('infrastructure_subscriptions').select('provider, scope, cost_eur_month, infrastructure_tiers(tier_name, pricing_url)').is('ended_at', null),
  ])

  const utilization = ((util ?? []) as UtilRow[])
  const ths = ((thresholds ?? []) as ThresholdRow[])
  const alertsOpen = ((alerts ?? []) as AlertRow[])
  const subscriptions = ((subs ?? []) as unknown) as SubRow[]
  const totalCost = subscriptions.reduce((s, r) => s + Number(r.cost_eur_month ?? 0), 0)

  // Group utilization by provider × scope
  const groups = new Map<string, UtilRow[]>()
  for (const u of utilization) {
    const k = `${u.provider}::${u.scope}`
    if (!groups.has(k)) groups.set(k, [])
    groups.get(k)!.push(u)
  }

  return (
    <div className="min-h-screen bg-[#07090F] text-white p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-6 flex items-start justify-between gap-4">
          <div>
            <div className="text-[11px] tracking-[.15em] text-gray-500 uppercase">Giant Piccolo · Infrastructure</div>
            <h1 className="text-2xl font-bold mt-1">🟢 Infra Capacity</h1>
            <p className="text-sm text-gray-400 mt-2 max-w-2xl">
              Utilisation en temps réel par provider × projet. Seuils WARN 70-80% · CRITICAL 90% (auto-scale si autorisé) · LOCKOUT 100%.
              Chaque auto-scale propage un <code>potential_raises</code> (agent GIANT_PICCOLO, kind infra_scale_ready).
            </p>
          </div>
          <div className="text-right">
            <div className="text-[11px] tracking-wider text-gray-500 uppercase">Coût mensuel actuel</div>
            <div className="text-2xl font-bold text-[#10B981] mt-1">{totalCost.toFixed(2)} €</div>
            <div className="text-[10px] text-gray-500 mt-1">{subscriptions.length} abonnements actifs</div>
          </div>
        </header>

        {/* Alertes ouvertes */}
        {alertsOpen.length > 0 && (
          <section className="mb-6 p-4 border border-red-500/40 bg-red-500/5 rounded-xl">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-red-400 font-bold text-sm">⚠ {alertsOpen.length} alerte{alertsOpen.length > 1 ? 's' : ''} ouverte{alertsOpen.length > 1 ? 's' : ''}</span>
            </div>
            <div className="space-y-1">
              {alertsOpen.map(a => (
                <div key={a.id} className="flex items-center gap-3 text-xs">
                  <span className="px-1.5 py-0.5 rounded text-[10px]" style={{ background: `${SEV_COLOR[a.severity]}33`, color: SEV_COLOR[a.severity] }}>{a.severity}</span>
                  <span className="font-mono text-gray-300">{a.provider}:{a.scope}</span>
                  <span className="text-gray-500">{a.metric} = {a.value}</span>
                  <span className="text-gray-400">({a.pct_used}% of cap)</span>
                  <span className="text-gray-500 ml-auto">{new Date(a.triggered_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</span>
                  <span className="text-[10px] text-[#C9A84C]">{a.action_taken ?? 'notified'}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Groupes */}
        {groups.size === 0 ? (
          <div className="p-6 border border-white/10 rounded-xl text-sm text-gray-500">
            Aucun sample ingested. Le cron <code className="bg-white/5 px-1.5 py-0.5 rounded text-xs">/root/monitor/infra-ingest.sh</code> alimente cette table toutes les 30 minutes.
          </div>
        ) : (
          <div className="space-y-6">
            {Array.from(groups.entries()).map(([key, rows]) => {
              const [provider, scope] = key.split('::')
              const sub = subscriptions.find(s => s.provider === provider && s.scope === scope)
              const tierName = sub?.infrastructure_tiers?.tier_name ?? '—'
              const cost = sub?.cost_eur_month ?? 0
              return (
                <section key={key} className="border border-white/10 rounded-xl overflow-hidden">
                  <header className="px-4 py-3 flex items-center justify-between bg-white/5 border-b border-white/10">
                    <div>
                      <div className="text-xs tracking-wider text-gray-500 uppercase">{provider}</div>
                      <div className="font-bold text-white mt-0.5">{scope.toUpperCase()} · tier <span className="text-[#C9A84C]">{tierName}</span></div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">{Number(cost).toFixed(2)} €/mo</div>
                      {sub?.infrastructure_tiers?.pricing_url && (
                        <a href={sub.infrastructure_tiers.pricing_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-gray-500 hover:text-[#C9A84C]">pricing →</a>
                      )}
                    </div>
                  </header>
                  <div className="divide-y divide-white/5">
                    {rows.map(r => {
                      const pct = Number(r.pct_used ?? 0)
                      const th = ths.find(t => t.provider === r.provider && t.metric === r.metric)
                      const sev = severityOf(pct, th)
                      const color = SEV_COLOR[sev]
                      return (
                        <div key={r.metric} className="px-4 py-3">
                          <div className="flex items-center gap-3 mb-1">
                            <span className="text-sm font-mono">{r.metric}</span>
                            <span className="text-xs text-gray-500">{r.value.toLocaleString()} / {r.limit_value?.toLocaleString() ?? '∞'}</span>
                            <span className="ml-auto text-sm font-bold" style={{ color }}>{pct.toFixed(1)}%</span>
                          </div>
                          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden relative">
                            <div className="absolute top-0 left-0 h-full transition-all" style={{ width: `${Math.min(100, pct)}%`, background: color }} />
                            {th && <>
                              <div className="absolute top-0 h-full w-px bg-yellow-400/50" style={{ left: `${th.warn_pct}%` }} />
                              <div className="absolute top-0 h-full w-px bg-red-400/60" style={{ left: `${th.critical_pct}%` }} />
                            </>}
                          </div>
                          {th && (
                            <div className="text-[10px] text-gray-500 mt-1 flex items-center gap-3">
                              <span>warn {th.warn_pct}%</span>
                              <span>critical {th.critical_pct}%</span>
                              <span>{th.auto_scale ? '✓ auto-scale' : '✗ manual only'}</span>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </section>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
