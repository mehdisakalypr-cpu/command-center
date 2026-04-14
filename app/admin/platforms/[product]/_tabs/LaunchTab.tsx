import type { Platform } from '@/lib/platforms'

type UtilRow = { provider: string; metric: string; value: number; limit_value: number | null; pct_used: number | null; current_tier: string }
type AlertRow = { id: number; triggered_at: string; provider: string; metric: string; severity: string; pct_used: number }

type Data = {
  utilization: unknown
  alerts: unknown
}

const CHECKLIST: { id: string; label: string; blocker: boolean }[] = [
  { id: 'llc',        label: 'LLC Wyoming formée + EIN reçu',                               blocker: true },
  { id: 'mercury',    label: 'Mercury Business approuvé + Wise backup',                      blocker: true },
  { id: 'w8bene',     label: 'W-8BEN-E Stripe signé (sinon retenue 30%)',                    blocker: true },
  { id: 'domain',     label: 'Domaines définitifs achetés + DNS + DNSSEC',                   blocker: true },
  { id: 'stripe-live',label: 'Stripe basculé en live + products + metadata.product',         blocker: true },
  { id: 'webhooks',   label: 'Webhooks Stripe endpoints live + test événements',             blocker: true },
  { id: 'migrations', label: 'Toutes migrations appliquées (5 pending)',                     blocker: true },
  { id: 'supabase',   label: 'Supabase Free → Pro ($25/mo)',                                 blocker: true },
  { id: 'vercel',     label: 'Vercel Pro ($20/mo) par projet',                               blocker: true },
  { id: 'resend',     label: 'Resend domain verified + SPF/DKIM/DMARC',                      blocker: true },
  { id: 'monitoring', label: 'Health-check + Better Stack + Slack/Telegram incident',         blocker: true },
  { id: 'secrets',    label: 'Rotation secrets + 2FA Vercel/Supabase/Stripe/Mercury',         blocker: true },
  { id: 'ratelimit',  label: 'Rate-limiting /api/checkout + /api/auth + /api/contracts/accept', blocker: true },
  { id: 'csp',        label: 'CSP + HSTS headers (SecurityHeaders grade A)',                 blocker: true },
  { id: 'legal',      label: '/legal/* placeholders remplis (EIN, WY No., Member)',          blocker: true },
  { id: 'subproc',    label: 'DPA signés avec chaque subprocessor (Vercel/Stripe/OpenAI/…)', blocker: true },
  { id: 'eurep',      label: 'EU Representative Art. 27 GDPR souscrit (VeraSafe ~600€/yr)',   blocker: false },
  { id: 'insurance',  label: 'E&O / Cyber insurance (Hiscox/Vouch) $1M limit',                blocker: false },
  { id: 'trademark',  label: 'Trademark USPTO (TEAS Plus $250/classe)',                      blocker: false },
  { id: 'loadtest',   label: 'Load test k6/Artillery 100 req/s pendant 10 min',              blocker: false },
  { id: 'runbook',    label: 'Runbook rollback DNS prêt (TTL 300s 24h avant)',               blocker: true },
]

const STRIPE_TESTS: { id: string; label: string; how: string; priority: 'P0' | 'P1' | 'P2' }[] = [
  { id: 'card-eu',      label: 'Paiement carte EU',                        how: '4242 4242 4242 4242 · 12/34 · 123 · ZIP 75001',    priority: 'P0' },
  { id: 'card-us',      label: 'Paiement carte US',                        how: '4242 4242 4242 4242 · 10001 ZIP',                   priority: 'P0' },
  { id: '3ds',          label: '3D Secure challenge',                      how: '4000 0027 6000 3184 · challenge success',           priority: 'P0' },
  { id: 'decline',      label: 'Carte refusée',                            how: '4000 0000 0000 0002 → vérifier message UI clair',   priority: 'P0' },
  { id: 'insufficient', label: 'Fonds insuffisants',                       how: '4000 0000 0000 9995',                                priority: 'P0' },
  { id: 'expired',      label: 'Carte expirée',                            how: '4000 0000 0000 0069',                                priority: 'P0' },
  { id: 'cvc-fail',     label: 'CVC incorrect',                            how: '4000 0000 0000 0127',                                priority: 'P0' },
  { id: 'sepa',         label: 'SEPA Direct Debit succès',                 how: 'IBAN test DE89 3704 0044 0532 0130 00',              priority: 'P0' },
  { id: 'sepa-fail',    label: 'SEPA failure',                             how: 'IBAN DE62 ... → webhook charge.failed reçu',         priority: 'P1' },
  { id: 'apple-google', label: 'Apple Pay / Google Pay',                   how: 'Device réel iOS/Android — test Stripe Mobile Wallet',priority: 'P1' },
  { id: 'radar',        label: 'Radar block carte volée',                  how: '4100 0000 0000 0019 → verify 402 + user-facing msg', priority: 'P0' },
  { id: 'refund-full',  label: 'Remboursement intégral',                   how: 'Dashboard → Refund → webhook charge.refunded',       priority: 'P0' },
  { id: 'refund-part',  label: 'Remboursement partiel',                    how: 'Refund 50% → vérif credit_note émis',                priority: 'P0' },
  { id: 'dispute',      label: 'Dispute / chargeback',                     how: 'amount=1000 puis simuler dispute depuis dashboard',  priority: 'P0' },
  { id: 'sub-create',   label: 'Subscription création',                    how: 'plan monthly → vérif `customer.subscription.created`', priority: 'P0' },
  { id: 'sub-renew',    label: 'Subscription renewal',                     how: 'Dashboard: avancer date → webhook invoice.paid',     priority: 'P0' },
  { id: 'sub-fail',     label: 'Paiement récurrent échoué',                how: '4000 0000 0000 0341 → dunning trigger',              priority: 'P0' },
  { id: 'sub-cancel',   label: 'Cancellation 3 clics AB-2273',             how: 'Dashboard client → cancel → effet fin période',       priority: 'P0' },
  { id: 'upgrade',      label: 'Upgrade subscription mid-cycle',           how: 'Pro → Elite pro-rata — vérif invoice diff',          priority: 'P1' },
  { id: 'downgrade',    label: 'Downgrade Elite → Pro auto',                how: 'SEO Boost guarantee missed → auto downgrade',       priority: 'P0' },
  { id: 'tax-eu',       label: 'Stripe Tax EU consumer (VAT)',             how: 'Client FR B2C → 20% ajouté ; facture mention TVA',    priority: 'P0' },
  { id: 'tax-us',       label: 'Stripe Tax US nexus',                      how: 'Client CA → 7.25% sales tax',                        priority: 'P1' },
  { id: 'reverse',      label: 'Reverse charge B2B EU VAT ID',              how: 'VAT ID valide VIES → 0% VAT, mention facture Art.196', priority: 'P0' },
  { id: 'webhooks-idem',label: 'Webhook idempotence',                       how: 'Renvoyer le même event 2× → DB insert 1 seule fois', priority: 'P0' },
  { id: 'payout',       label: 'Payout reçu sur Mercury',                   how: 'Stripe payout → match sur mercury_transactions',     priority: 'P0' },
  { id: 'klarna',       label: 'Klarna paiement en 4×',                    how: 'Activer 4 installments · test sur 149€',              priority: 'P2' },
  { id: 'mobile-money', label: 'Mobile Money Africa (Flutterwave bridge)', how: 'Client NG → flow mobile money test',                 priority: 'P2' },
]

const SEV_COLOR: Record<string, string> = {
  warn: '#F59E0B', critical: '#EF4444', lockout: '#B91C1C',
}

export default function LaunchTab({ platform, data }: { platform: Platform; data: Data }) {
  const utilization = (data.utilization ?? []) as UtilRow[]
  const alerts = (data.alerts ?? []) as AlertRow[]
  const blockerCount = CHECKLIST.filter(c => c.blocker).length

  return (
    <div className="space-y-6">
      {/* Capacité infra pour cette plateforme */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold tracking-wider uppercase text-gray-400">Capacité infra — {platform.name}</h2>
          {alerts.length > 0 && <span className="text-[10px] text-red-400">⚠ {alerts.length} alerte{alerts.length > 1 ? 's' : ''}</span>}
        </div>
        {utilization.length === 0 ? (
          <div className="text-xs text-gray-500 p-3 border border-white/10 rounded-lg">Aucun sample. Lancer <code>/root/monitor/infra-ingest.sh</code>.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {utilization.map(u => {
              const pct = Number(u.pct_used ?? 0)
              const color = pct >= 90 ? '#EF4444' : pct >= 70 ? '#F59E0B' : '#10B981'
              return (
                <div key={`${u.provider}-${u.metric}`} className="p-3 border border-white/10 rounded-lg">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-mono">{u.provider} · {u.metric}</span>
                    <span style={{ color }} className="font-bold">{pct.toFixed(1)}%</span>
                  </div>
                  <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                    <div style={{ width: `${Math.min(100, pct)}%`, background: color }} className="h-full" />
                  </div>
                  <div className="text-[10px] text-gray-500 mt-1">{u.value.toLocaleString()} / {u.limit_value?.toLocaleString() ?? '∞'} · tier {u.current_tier}</div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Checklist */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold tracking-wider uppercase text-gray-400">Checklist prod launch</h2>
          <span className="text-[10px] text-gray-500">{blockerCount} bloquants · cible {platform.launch_target ?? '—'}</span>
        </div>
        <div className="border border-white/10 rounded-xl overflow-hidden">
          {CHECKLIST.map((c, i) => (
            <div key={c.id} className={`px-4 py-2 text-xs flex items-center gap-3 ${i > 0 ? 'border-t border-white/5' : ''}`}>
              <input type="checkbox" className="w-3.5 h-3.5 accent-[#C9A84C]" disabled />
              <span className={c.blocker ? 'text-white' : 'text-gray-400'}>{c.label}</span>
              {c.blocker && <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-bold">BLOQUANT</span>}
            </div>
          ))}
        </div>
        <div className="text-[10px] text-gray-500 mt-2">
          Cette checklist est un extract du master — version complète : <code>/root/llc-setup/production-launch/README.md</code>
        </div>
      </section>

      {/* Stripe tests matrix */}
      <section>
        <h2 className="text-sm font-semibold tracking-wider uppercase text-gray-400 mb-3">Stripe — plan de test avant live ({STRIPE_TESTS.length})</h2>
        <div className="overflow-x-auto border border-white/10 rounded-xl">
          <table className="w-full text-xs">
            <thead className="bg-white/5 text-gray-400 uppercase tracking-wider text-[10px]">
              <tr><th className="p-2 text-left">#</th><th className="p-2 text-left">Scenario</th><th className="p-2 text-left">Comment</th><th className="p-2 text-left">Prio</th></tr>
            </thead>
            <tbody>
              {STRIPE_TESTS.map(t => (
                <tr key={t.id} className="border-t border-white/5">
                  <td className="p-2 font-mono text-gray-500">{t.id}</td>
                  <td className="p-2">{t.label}</td>
                  <td className="p-2 text-gray-400">{t.how}</td>
                  <td className="p-2">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${t.priority === 'P0' ? 'bg-red-500/20 text-red-400' : t.priority === 'P1' ? 'bg-amber-500/20 text-amber-400' : 'bg-gray-500/20 text-gray-400'}`}>{t.priority}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="text-[10px] text-gray-500 mt-2">
          P0 = bloquants launch. P1 = semaine 1 post-launch. P2 = month 2.
          Cartes test Stripe : <a className="text-[#C9A84C]" href="/admin/payments" target="_blank" rel="noopener noreferrer">/admin/payments</a>.
        </div>
      </section>
    </div>
  )
}
