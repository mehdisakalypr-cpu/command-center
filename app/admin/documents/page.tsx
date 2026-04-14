/**
 * /admin/documents — log central tous documents émis/reçus
 * (factures, contrats signés, Stripe, Mercury, CPA/tax).
 * Lit depuis les tables `contract_acceptances` (OFA) et `documents` (OFA+FTG).
 * Mode degraded-ok si tables pas encore appliquées.
 */
import { createClient } from '@supabase/supabase-js'

export const metadata = { title: 'Documents — Admin' }
export const dynamic = 'force-dynamic'

const GOLD = '#C9A84C'

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

type ContractRow = {
  accepted_at: string
  email: string
  contract_id: string
  contract_version: string
  product: string
  typed_name: string | null
  ip: string | null
  scroll_completed: boolean
  email_sent_at: string | null
}

type DocRow = {
  reference: string
  prefix: string
  product: string
  year: number
  issued_at: string
  counterparty_name: string | null
  amount_gross_minor: number | null
  currency: string
  status: string
  source: string
}

async function loadContracts(): Promise<{ rows: ContractRow[]; total: number; error?: string }> {
  try {
    const sb = db()
    const { data, count, error } = await sb
      .from('contract_acceptances')
      .select('accepted_at, email, contract_id, contract_version, product, typed_name, ip, scroll_completed, email_sent_at', { count: 'exact' })
      .order('accepted_at', { ascending: false })
      .limit(50)
    if (error) return { rows: [], total: 0, error: error.message }
    return { rows: (data ?? []) as ContractRow[], total: count ?? 0 }
  } catch (e) {
    return { rows: [], total: 0, error: (e as Error).message }
  }
}

async function loadDocuments(): Promise<{ rows: DocRow[]; total: number; error?: string }> {
  try {
    const sb = db()
    const { data, count, error } = await sb
      .from('documents')
      .select('reference, prefix, product, year, issued_at, counterparty_name, amount_gross_minor, currency, status, source', { count: 'exact' })
      .order('issued_at', { ascending: false })
      .limit(50)
    if (error) return { rows: [], total: 0, error: error.message }
    return { rows: (data ?? []) as DocRow[], total: count ?? 0 }
  } catch (e) {
    return { rows: [], total: 0, error: (e as Error).message }
  }
}

function fmtAmount(minor: number | null, currency: string): string {
  if (minor === null || minor === undefined) return '—'
  const n = minor / 100
  return `${n.toFixed(2)} ${currency === 'EUR' ? '€' : currency === 'USD' ? '$' : currency}`
}

function fmtDate(iso: string): string {
  try { return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) } catch { return iso }
}

export default async function DocumentsAdminPage() {
  const [contracts, documents] = await Promise.all([loadContracts(), loadDocuments()])

  return (
    <div className="min-h-screen bg-[#07090F] text-white p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-6">
          <div className="text-[11px] tracking-[.15em] text-gray-500 uppercase">Legal &amp; Accounting</div>
          <h1 className="text-2xl font-bold mt-1">📑 Documents</h1>
          <p className="text-sm text-gray-400 mt-2">
            Journal central : contrats signés + factures + reçus + docs fournisseurs.
            Conservation 10 ans (Code de commerce FR L.123-22).
            Export CPA : <code className="text-[10px] bg-white/5 px-1.5 py-0.5 rounded">/api/admin/documents/export?year=2026&amp;format=cpa</code>
          </p>
        </header>

        {/* Nomenclature reminder */}
        <div className="mb-6 p-4 border border-[#C9A84C]/30 rounded-xl bg-[#C9A84C]/5 text-sm">
          <div className="text-[#C9A84C] font-bold mb-2">📐 Nomenclature</div>
          <div className="text-xs text-gray-300 grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1 font-mono">
            <div><strong>INV</strong> · facture client</div>
            <div><strong>CN</strong> · avoir</div>
            <div><strong>CTR</strong> · contrat signé</div>
            <div><strong>QUO</strong> · devis</div>
            <div><strong>RCP</strong> · reçu</div>
            <div><strong>VND</strong> · facture fournisseur</div>
            <div><strong>PAY</strong> · Stripe charge</div>
            <div><strong>PYT</strong> · Stripe payout</div>
            <div><strong>DEP</strong> · Mercury deposit</div>
            <div><strong>REF</strong> · Stripe refund</div>
            <div><strong>KYC</strong> · KYC B2B</div>
            <div><strong>TAX</strong> · IRS/WY filing</div>
          </div>
          <div className="text-[11px] text-gray-500 mt-2">Format : <code>{'{PREFIX}-{OFA|FTG|LLC}-{YYYY}-{SEQ5}[-{R|V|D|T}]'}</code></div>
        </div>

        {/* Contrats signés */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Contrats signés ({contracts.total})</h2>
            <a href="/legal" className="text-xs text-[#C9A84C] hover:underline">Voir les templates publics</a>
          </div>
          {contracts.error ? (
            <div className="text-xs text-amber-400 p-3 border border-amber-500/30 rounded-lg bg-amber-500/5">
              ⚠ Table <code>contract_acceptances</code> indisponible : {contracts.error}. Applique la migration <code>20260414150000_contract_acceptances.sql</code> puis recharge.
            </div>
          ) : contracts.rows.length === 0 ? (
            <div className="text-xs text-gray-500 p-3 border border-white/10 rounded-lg">Aucune signature enregistrée pour le moment.</div>
          ) : (
            <div className="overflow-x-auto border border-white/10 rounded-xl">
              <table className="w-full text-xs">
                <thead className="bg-white/5 text-gray-400 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-2 text-left">Horodatage</th>
                    <th className="p-2 text-left">Contrat</th>
                    <th className="p-2 text-left">v</th>
                    <th className="p-2 text-left">Produit</th>
                    <th className="p-2 text-left">Signataire</th>
                    <th className="p-2 text-left">IP</th>
                    <th className="p-2 text-left">Scroll</th>
                    <th className="p-2 text-left">Email</th>
                  </tr>
                </thead>
                <tbody>
                  {contracts.rows.map((r, i) => (
                    <tr key={i} className="border-t border-white/5 hover:bg-white/2">
                      <td className="p-2 text-gray-300 whitespace-nowrap">{fmtDate(r.accepted_at)}</td>
                      <td className="p-2 font-mono text-[11px]">{r.contract_id}</td>
                      <td className="p-2 font-mono text-[10px] text-gray-500">{r.contract_version}</td>
                      <td className="p-2"><span className={`text-[10px] px-1.5 py-0.5 rounded ${r.product === 'ofa' ? 'bg-[#C9A84C]/20 text-[#C9A84C]' : 'bg-sky-500/20 text-sky-400'}`}>{r.product.toUpperCase()}</span></td>
                      <td className="p-2">{r.typed_name ?? '—'} <span className="text-gray-500 text-[10px] block">{r.email}</span></td>
                      <td className="p-2 font-mono text-[10px] text-gray-500">{r.ip ?? '—'}</td>
                      <td className="p-2">{r.scroll_completed ? <span className="text-emerald-400">✓</span> : <span className="text-red-400">✗</span>}</td>
                      <td className="p-2 text-[10px] text-gray-500">{r.email_sent_at ? '✓ envoyé' : 'en attente'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Documents émis */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Documents émis / reçus ({documents.total})</h2>
          {documents.error ? (
            <div className="text-xs text-amber-400 p-3 border border-amber-500/30 rounded-lg bg-amber-500/5">
              ⚠ Table <code>documents</code> indisponible : {documents.error}. Applique la migration <code>20260414160000_documents_and_reconciliation.sql</code>.
            </div>
          ) : documents.rows.length === 0 ? (
            <div className="text-xs text-gray-500 p-3 border border-white/10 rounded-lg">
              Aucun document enregistré. Les factures Stripe + contrats signés alimenteront automatiquement cette table via les webhooks.
            </div>
          ) : (
            <div className="overflow-x-auto border border-white/10 rounded-xl">
              <table className="w-full text-xs">
                <thead className="bg-white/5 text-gray-400 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-2 text-left">Reference</th>
                    <th className="p-2 text-left">Type</th>
                    <th className="p-2 text-left">Date</th>
                    <th className="p-2 text-left">Contrepartie</th>
                    <th className="p-2 text-right">Montant</th>
                    <th className="p-2 text-left">Statut</th>
                    <th className="p-2 text-left">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.rows.map(r => (
                    <tr key={r.reference} className="border-t border-white/5 hover:bg-white/2">
                      <td className="p-2 font-mono text-[11px]">{r.reference}</td>
                      <td className="p-2"><span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5">{r.prefix}</span></td>
                      <td className="p-2 text-gray-300 whitespace-nowrap">{fmtDate(r.issued_at)}</td>
                      <td className="p-2">{r.counterparty_name ?? '—'}</td>
                      <td className="p-2 text-right font-mono">{fmtAmount(r.amount_gross_minor, r.currency)}</td>
                      <td className="p-2"><span className={`text-[10px] px-1.5 py-0.5 rounded ${r.status === 'paid' ? 'bg-emerald-500/20 text-emerald-400' : r.status === 'void' ? 'bg-red-500/20 text-red-400' : 'bg-white/5 text-gray-400'}`}>{r.status}</span></td>
                      <td className="p-2 text-[10px] text-gray-500">{r.source}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Reconciliation panel (pending) */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Réconciliation Stripe ↔ Mercury</h2>
          <div className="p-4 border border-white/10 rounded-xl bg-white/2 text-sm text-gray-400">
            <p className="mb-2">
              La vue SQL <code className="text-xs bg-white/5 px-1 py-0.5 rounded">v_reconciled_revenue</code> joint Stripe charges → payouts → Mercury deposits.
              Statuts possibles : <span className="text-emerald-400">reconciled</span> · <span className="text-amber-400">pending_mercury</span> · <span className="text-red-400">amount_mismatch</span>.
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Alimentation automatique : webhooks Stripe <code>/api/webhooks/stripe</code> (charges/payouts/refunds) + cron nightly <code>scripts/mercury-mirror.ts</code> (à livrer).
              Export CSV CPA : <code>/api/admin/documents/export?format=cpa&amp;year=2026</code>.
            </p>
          </div>
        </section>

        {/* Stack */}
        <section>
          <h2 className="text-lg font-semibold mb-3">📚 Stack comptable retenue</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="p-4 border border-white/10 rounded-xl">
              <div className="text-[10px] tracking-wider text-gray-500 uppercase mb-1">Software</div>
              <div className="font-bold text-white">QuickBooks Online (Essentials → Plus)</div>
              <p className="text-gray-400 mt-1">Native Stripe + Mercury, Class Tracking OFA/FTG, 90% CPA US-compatibles.</p>
            </div>
            <div className="p-4 border border-white/10 rounded-xl">
              <div className="text-[10px] tracking-wider text-gray-500 uppercase mb-1">Bookkeeping</div>
              <div className="font-bold text-white">Self-service année 1 → doola Books $200/mo dès recon &gt; 2h</div>
              <p className="text-gray-400 mt-1">Pilot $499/mo overkill pre-$500k ARR.</p>
            </div>
            <div className="p-4 border border-white/10 rounded-xl">
              <div className="text-[10px] tracking-wider text-gray-500 uppercase mb-1">CPA Form 5472 + 1120</div>
              <div className="font-bold text-white">James Baker CPA ($400-$600/an)</div>
              <p className="text-gray-400 mt-1">Backup: O&amp;G Tax ($500-$800). Pénalité si raté : $25 000.</p>
            </div>
            <div className="p-4 border border-white/10 rounded-xl">
              <div className="text-[10px] tracking-wider text-gray-500 uppercase mb-1">Banque</div>
              <div className="font-bold text-white">Mercury (primary) + Wise Business (EUR/mobile money)</div>
              <p className="text-gray-400 mt-1">Plan B : Relay Financial. Sub-accounts OFA/FTG gratuits.</p>
            </div>
          </div>
          <div className="mt-4 text-[11px] text-gray-500">
            Détails &amp; arbitrage complet : <code className="text-[#C9A84C]">/root/llc-setup/accounting/README.md</code>
          </div>
        </section>
      </div>
    </div>
  )
}
