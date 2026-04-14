import type { Platform } from '@/lib/platforms'

type Tier = { tier_name: string; pricing_url: string | null }
type Sub = { provider: string; cost_eur_month: number; infrastructure_tiers: Tier | Tier[] | null }

type Data = {
  subscriptions: unknown
}

function tierOf(t: Sub['infrastructure_tiers']): Tier | null {
  if (!t) return null
  return Array.isArray(t) ? (t[0] ?? null) : t
}

export default function AccountingTab({ platform, data }: { platform: Platform; data: Data }) {
  const subs = (data.subscriptions ?? []) as Sub[]
  const total = subs.reduce((s, r) => s + Number(r.cost_eur_month ?? 0), 0)

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
        <div className="p-4 border border-white/10 rounded-xl">
          <div className="text-[10px] tracking-wider text-gray-500 uppercase">Software</div>
          <div className="font-bold text-white mt-1">QuickBooks Online — Class {platform.key.toUpperCase()}</div>
          <div className="text-gray-400 mt-1">Essentials 37.50€/mo (promo) → Plus 99€/mo quand 2 DBAs actifs.</div>
        </div>
        <div className="p-4 border border-white/10 rounded-xl">
          <div className="text-[10px] tracking-wider text-gray-500 uppercase">CPA</div>
          <div className="font-bold text-white mt-1">James Baker CPA</div>
          <div className="text-gray-400 mt-1">Form 5472 + pro-forma 1120, deadline <strong>15 avril 2027</strong>. Pénalité $25 000 si raté.</div>
        </div>
        <div className="p-4 border border-white/10 rounded-xl">
          <div className="text-[10px] tracking-wider text-gray-500 uppercase">Bookkeeping</div>
          <div className="font-bold text-white mt-1">Self → doola Books $200/mo</div>
          <div className="text-gray-400 mt-1">Cible : ≤1h de réconciliation/mois. Déclencher doola dès que &gt;2h.</div>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold tracking-wider uppercase text-gray-400 mb-3">Abonnements infra — coût mensuel {total.toFixed(2)} €</h2>
        {subs.length === 0 ? (
          <div className="text-xs text-gray-500 p-3 border border-white/10 rounded-lg">Aucun abonnement actif tracké. Applique la migration <code>20260414180000_infrastructure_capacity.sql</code>.</div>
        ) : (
          <div className="overflow-x-auto border border-white/10 rounded-xl">
            <table className="w-full text-xs">
              <thead className="bg-white/5 text-gray-400 uppercase tracking-wider text-[10px]">
                <tr><th className="p-2 text-left">Provider</th><th className="p-2 text-left">Tier</th><th className="p-2 text-right">Coût/mo</th><th className="p-2 text-left">Pricing</th></tr>
              </thead>
              <tbody>
                {subs.map((s, i) => {
                  const t = tierOf(s.infrastructure_tiers)
                  return (
                    <tr key={i} className="border-t border-white/5">
                      <td className="p-2 font-mono text-[11px]">{s.provider}</td>
                      <td className="p-2">{t?.tier_name ?? '—'}</td>
                      <td className="p-2 text-right font-mono">{Number(s.cost_eur_month ?? 0).toFixed(2)} €</td>
                      <td className="p-2">{t?.pricing_url && <a className="text-[#C9A84C] hover:underline" href={t.pricing_url} target="_blank" rel="noopener noreferrer">↗</a>}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="p-4 border border-white/10 rounded-xl bg-white/2 text-xs text-gray-400">
        <div className="text-white font-semibold mb-2">Réconciliation Stripe ↔ Mercury</div>
        <div>
          Webhooks Stripe → <code className="bg-white/5 px-1 py-0.5 rounded">/api/webhooks/stripe</code> (à câbler sur chaque projet) alimentent <code>stripe_charges</code>, <code>stripe_payouts</code>, <code>stripe_refunds</code>.
          Cron nightly Mercury mirror → <code>mercury_transactions</code>.
          Vue SQL <code>v_reconciled_revenue</code> joint les trois ; statuts : reconciled / pending_mercury / amount_mismatch.
        </div>
        <div className="mt-2 text-[11px] text-gray-500">
          Export CPA : <code>/api/admin/documents/export?product={platform.key}&amp;year=2026&amp;format=cpa</code>
        </div>
      </section>
    </div>
  )
}
