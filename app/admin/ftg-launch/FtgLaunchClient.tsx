'use client'

import { useMemo, useState } from 'react'
import {
  BASE_LEVERS, BASE_SCENARIOS, BUDGET_MODEL,
  computeScenario, type Lever, type ScenarioId, type VolumeTarget,
} from '@/lib/ftg-launch-model'

export default function FtgLaunchClient({ volumeTargets }: { volumeTargets: VolumeTarget[] }) {
  const [levers, setLevers] = useState<Lever[]>(BASE_LEVERS)
  const [scenarioFocus, setScenarioFocus] = useState<ScenarioId>('median')

  const toggle = (id: string) => setLevers(levers.map((l) => l.id === id ? { ...l, enabled: !l.enabled } : l))

  const scenarios = useMemo(() => ({
    floor:  computeScenario(BASE_SCENARIOS.floor,  levers),
    median: computeScenario(BASE_SCENARIOS.median, levers),
    high:   computeScenario(BASE_SCENARIOS.high,   levers),
  }), [levers])

  const budgetT0 = BUDGET_MODEL.filter((r) => r.tier === 'T0').reduce((a, r) => a + r.eurPerMonth, 0)
  const budgetT1 = BUDGET_MODEL.filter((r) => r.tier === 'T1').reduce((a, r) => a + r.eurPerMonth, 0)
  const budgetT1plus = BUDGET_MODEL.filter((r) => r.tier === 'T1+').reduce((a, r) => a + r.eurPerMonth, 0)

  const focusScen = scenarios[scenarioFocus]

  return (
    <div className="min-h-screen bg-[#0A0E17] text-white">
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex items-center gap-3 mb-8">
          <div className="text-xs uppercase tracking-[.3em] text-[#C9A84C]">Feel The Gap · Launch 15 mai 2026</div>
          <div className="ml-auto text-xs text-gray-500">Mise à jour {new Date().toLocaleString('fr-FR')}</div>
        </div>

        <h1 className="text-4xl font-bold mb-3">Projections M1 + Budget launch</h1>
        <p className="text-gray-400 mb-10 max-w-3xl">
          3 scénarios (Floor / Médian / High) avec leviers activables. Inventaire volume data vs cibles 15 mai. Budget T0 free-tier → T1 scaling.
        </p>

        {/* Scenarios row */}
        <div className="grid md:grid-cols-3 gap-4 mb-10">
          {(['floor', 'median', 'high'] as ScenarioId[]).map((id) => {
            const s = scenarios[id]
            const focus = scenarioFocus === id
            return (
              <button
                key={id}
                onClick={() => setScenarioFocus(id)}
                className={`text-left rounded-2xl p-5 border-2 transition-all ${focus ? 'border-[#C9A84C] bg-[#C9A84C]/5' : 'border-white/10 bg-[#0D1117] hover:border-white/30'}`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs uppercase tracking-wider font-semibold text-gray-400">{s.label}</span>
                  <span className="ml-auto text-xs text-gray-500">{Math.round(s.probability * 100)}%</span>
                </div>
                <div className="text-3xl font-black mb-1" style={{ color: focus ? '#C9A84C' : '#fff' }}>
                  €{(s.mrr / 1000).toFixed(1)}K <span className="text-sm font-normal text-gray-500">MRR M1</span>
                </div>
                <div className="text-xs text-gray-500 mb-4">+ €{(s.oneOff / 1000).toFixed(1)}K hors MRR = <strong className="text-white">€{(s.caTotal / 1000).toFixed(1)}K CA M1</strong></div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <Metric label="Trafic" value={fmt(s.traffic)} />
                  <Metric label="Signups" value={fmt(s.signups)} />
                  <Metric label="Paid" value={fmt(s.paid)} />
                </div>
              </button>
            )
          })}
        </div>

        {/* Focus detail */}
        <section className="bg-[#0D1117] border border-[#C9A84C]/30 rounded-2xl p-6 mb-10">
          <h2 className="text-lg font-bold mb-4">🎯 Détail scénario <span className="text-[#C9A84C]">{focusScen.label}</span></h2>
          <div className="grid md:grid-cols-4 gap-6">
            <KpiBlock label="Trafic M1" value={fmt(focusScen.traffic)} sub="visiteurs uniques" />
            <KpiBlock label="Signups" value={fmt(focusScen.signups)} sub="comptes créés" />
            <KpiBlock label="Paid clients" value={fmt(focusScen.paid)} sub="toutes tiers" />
            <KpiBlock label="MRR M1" value={`€${fmt(focusScen.mrr)}`} sub="récurrent" accent />
          </div>
          <div className="mt-6 grid grid-cols-3 gap-3 text-sm">
            <TierBreakdown tier="Data 29€" n={focusScen.dataCustomers} revenue={focusScen.dataCustomers * 29} />
            <TierBreakdown tier="Strategy 99€" n={focusScen.strategyCustomers} revenue={focusScen.strategyCustomers * 99} />
            <TierBreakdown tier="Premium 149€" n={focusScen.premiumCustomers} revenue={focusScen.premiumCustomers * 149} />
          </div>
        </section>

        {/* Levers */}
        <section className="mb-10">
          <h2 className="text-lg font-bold mb-4">🎚 Leviers activables ({levers.filter((l) => l.enabled).length}/{levers.length})</h2>
          <div className="grid md:grid-cols-2 gap-3">
            {levers.map((l) => (
              <button
                key={l.id}
                onClick={() => toggle(l.id)}
                className={`text-left rounded-xl p-4 border transition-colors ${l.enabled ? 'bg-[#C9A84C]/5 border-[#C9A84C]/50' : 'bg-[#0D1117] border-white/10 hover:border-white/30'}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${l.enabled ? 'bg-[#C9A84C] border-[#C9A84C]' : 'border-white/30'}`}>
                    {l.enabled && <span className="text-[#07090F] text-xs">✓</span>}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-sm">{l.label}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{l.description}</div>
                    <div className="flex gap-3 mt-2 text-[10px] text-gray-400">
                      {l.trafficMult !== 1 && <span>×{l.trafficMult.toFixed(2)} trafic</span>}
                      {l.signupConvMult !== 1 && <span>×{l.signupConvMult.toFixed(2)} signup</span>}
                      {l.paidConvMult !== 1 && <span>×{l.paidConvMult.toFixed(2)} paid</span>}
                      {l.oneOffEur > 0 && <span className="text-[#C9A84C]">+€{l.oneOffEur.toLocaleString('fr-FR')} one-shot</span>}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Volume data targets */}
        <section className="mb-10">
          <h2 className="text-lg font-bold mb-4">📦 Volume data · cible 15 mai</h2>
          <div className="bg-[#0D1117] border border-white/10 rounded-xl p-4 space-y-3">
            {volumeTargets.map((v) => {
              const pct = Math.min(100, Math.round((v.current / Math.max(1, v.target)) * 100))
              return (
                <div key={v.table}>
                  <div className="flex items-center gap-3 text-xs mb-1">
                    <span className="font-semibold">{v.label}</span>
                    <span className="text-gray-500">{v.agent}</span>
                    <span className="ml-auto tabular-nums">
                      <strong className={pct >= 100 ? 'text-emerald-400' : 'text-white'}>{fmt(v.current)}</strong>
                      <span className="text-gray-500"> / {fmt(v.target)}</span>
                      <span className="ml-2 text-[#C9A84C]">{pct}%</span>
                    </span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${pct >= 100 ? 'bg-emerald-400' : pct >= 50 ? 'bg-[#C9A84C]' : 'bg-orange-400'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Budget */}
        <section className="mb-10">
          <h2 className="text-lg font-bold mb-4">💰 Budget launch</h2>
          <div className="grid md:grid-cols-3 gap-3">
            <BudgetCard tier="T0" label="Free tier (launch plancher)" amount={budgetT0} color="#34D399" lines={BUDGET_MODEL.filter((r) => r.tier === 'T0')} />
            <BudgetCard tier="T1" label="Si scaling déclenché" amount={budgetT0 + budgetT1} color="#C9A84C" lines={BUDGET_MODEL.filter((r) => r.tier === 'T1')} />
            <BudgetCard tier="T1+" label="Optionnel (ads · TTS premium)" amount={budgetT0 + budgetT1 + budgetT1plus} color="#F472B6" lines={BUDGET_MODEL.filter((r) => r.tier === 'T1+')} />
          </div>
          <p className="text-xs text-gray-500 mt-3">
            ⚠️ Stripe fees = 2.9% + €0.25/tx sur encaissements uniquement (pas de fixe). LLC Wyoming $99/an hors budget M1 (one-shot).
          </p>
        </section>

        {/* Footer summary */}
        <section className="bg-[#C9A84C]/5 border border-[#C9A84C]/30 rounded-2xl p-6">
          <h2 className="text-lg font-bold mb-3">📌 Résumé exécutif</h2>
          <ul className="space-y-2 text-sm text-gray-300">
            <li>• <strong>Plancher garanti (85%)</strong> : €{fmt(scenarios.floor.caTotal)} de CA M1 — €{fmt(scenarios.floor.mrr)} MRR</li>
            <li>• <strong>Objectif médian (50%)</strong> : €{fmt(scenarios.median.caTotal)} CA · €{fmt(scenarios.median.mrr)} MRR (valorisation 10× ARR = €{fmt(Math.round(scenarios.median.mrr * 12 * 10 / 1000))}K)</li>
            <li>• <strong>High infinite overshoot (15%)</strong> : €{fmt(scenarios.high.caTotal)} CA M1 (valorisation €{fmt(Math.round(scenarios.high.mrr * 12 * 10 / 1000))}K)</li>
            <li>• <strong>Launch plancher</strong> : €0 (tout free-tier) · Scale éventuel : ≤€{budgetT0 + budgetT1}/mo</li>
          </ul>
        </section>
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-gray-500">{label}</div>
      <div className="font-semibold tabular-nums">{value}</div>
    </div>
  )
}

function KpiBlock({ label, value, sub, accent }: { label: string; value: string; sub: string; accent?: boolean }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-gray-500 mb-1">{label}</div>
      <div className={`text-2xl font-bold ${accent ? 'text-[#C9A84C]' : 'text-white'}`}>{value}</div>
      <div className="text-xs text-gray-500">{sub}</div>
    </div>
  )
}

function TierBreakdown({ tier, n, revenue }: { tier: string; n: number; revenue: number }) {
  return (
    <div className="p-3 bg-white/5 rounded-lg">
      <div className="text-xs text-gray-500">{tier}</div>
      <div className="font-bold">{n} clients</div>
      <div className="text-[10px] text-gray-500">€{revenue.toLocaleString('fr-FR')}/mo</div>
    </div>
  )
}

function BudgetCard({ tier, label, amount, color, lines }: { tier: string; label: string; amount: number; color: string; lines: Array<{ label: string; eurPerMonth: number; trigger: string }> }) {
  return (
    <div className="bg-[#0D1117] border rounded-xl p-4" style={{ borderColor: `${color}30` }}>
      <div className="flex items-baseline gap-2 mb-3">
        <div className="text-xs uppercase tracking-wider font-bold" style={{ color }}>{tier}</div>
        <div className="text-xs text-gray-500">{label}</div>
        <div className="ml-auto text-lg font-bold" style={{ color }}>€{amount}/mo</div>
      </div>
      <ul className="space-y-1">
        {lines.map((l) => (
          <li key={l.label} className="flex items-center gap-2 text-xs">
            <span className="flex-1 text-gray-300">{l.label}</span>
            <span className="text-gray-500 text-[10px]">{l.trigger}</span>
            <span className="tabular-nums font-semibold text-gray-400 w-12 text-right">€{l.eurPerMonth}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function fmt(n: number): string {
  return n.toLocaleString('fr-FR')
}
