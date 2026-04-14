import type { Platform } from '@/lib/platforms'

type ContractRow = { accepted_at: string; email: string; contract_id: string; typed_name: string | null; scroll_completed: boolean }
type DocumentRow = { reference: string; prefix: string; issued_at: string; counterparty_name: string | null; amount_gross_minor: number | null; currency: string; status: string }
type Data = {
  contracts: ContractRow[]
  contractsError?: string
  documents: DocumentRow[]
  documentsError?: string
}

function fmtAmount(minor: number | null, currency: string): string {
  if (!minor) return '—'
  return `${(minor / 100).toFixed(2)} ${currency === 'EUR' ? '€' : currency === 'USD' ? '$' : currency}`
}

export default function DocumentsTab({ platform, data }: { platform: Platform; data: Data }) {
  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-sm font-semibold tracking-wider uppercase text-gray-400 mb-3">Contrats signés récents — {platform.name}</h2>
        {data.contractsError ? (
          <div className="text-xs text-amber-400 p-3 border border-amber-500/30 rounded-lg">⚠ {data.contractsError}</div>
        ) : data.contracts.length === 0 ? (
          <div className="text-xs text-gray-500 p-3 border border-white/10 rounded-lg">Aucune signature enregistrée.</div>
        ) : (
          <div className="overflow-x-auto border border-white/10 rounded-xl">
            <table className="w-full text-xs">
              <thead className="bg-white/5 text-gray-400 uppercase tracking-wider text-[10px]">
                <tr><th className="p-2 text-left">Date</th><th className="p-2 text-left">Contrat</th><th className="p-2 text-left">Signataire</th><th className="p-2 text-left">Scroll</th></tr>
              </thead>
              <tbody>
                {data.contracts.map((r, i) => (
                  <tr key={i} className="border-t border-white/5">
                    <td className="p-2 whitespace-nowrap text-gray-300">{new Date(r.accepted_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</td>
                    <td className="p-2 font-mono text-[11px]">{r.contract_id}</td>
                    <td className="p-2">{r.typed_name ?? '—'} <span className="text-gray-500 text-[10px] block">{r.email}</span></td>
                    <td className="p-2">{r.scroll_completed ? <span className="text-emerald-400">✓</span> : <span className="text-red-400">✗</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold tracking-wider uppercase text-gray-400 mb-3">Documents émis / reçus</h2>
        {data.documentsError ? (
          <div className="text-xs text-amber-400 p-3 border border-amber-500/30 rounded-lg">⚠ {data.documentsError}</div>
        ) : data.documents.length === 0 ? (
          <div className="text-xs text-gray-500 p-3 border border-white/10 rounded-lg">Aucun document.</div>
        ) : (
          <div className="overflow-x-auto border border-white/10 rounded-xl">
            <table className="w-full text-xs">
              <thead className="bg-white/5 text-gray-400 uppercase tracking-wider text-[10px]">
                <tr><th className="p-2 text-left">Reference</th><th className="p-2 text-left">Type</th><th className="p-2 text-left">Contrepartie</th><th className="p-2 text-right">Montant</th><th className="p-2 text-left">Statut</th></tr>
              </thead>
              <tbody>
                {data.documents.map(d => (
                  <tr key={d.reference} className="border-t border-white/5">
                    <td className="p-2 font-mono text-[11px]">{d.reference}</td>
                    <td className="p-2"><span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5">{d.prefix}</span></td>
                    <td className="p-2">{d.counterparty_name ?? '—'}</td>
                    <td className="p-2 text-right font-mono">{fmtAmount(d.amount_gross_minor, d.currency)}</td>
                    <td className="p-2"><span className={`text-[10px] px-1.5 py-0.5 rounded ${d.status === 'paid' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-gray-400'}`}>{d.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="p-4 border border-[#C9A84C]/30 rounded-xl bg-[#C9A84C]/5 text-xs">
        <div className="text-[#C9A84C] font-bold mb-1">📐 Nomenclature {platform.key.toUpperCase()}</div>
        <div className="font-mono text-gray-300">{'{PREFIX}-' + platform.key.toUpperCase() + '-{YYYY}-{SEQ5}'}</div>
        <div className="text-gray-500 mt-2">INV · CN · CTR · QUO · RCP · VND · PAY · PYT · DEP · REF · EXP · KYC · TAX · AMN · WDR</div>
      </section>
    </div>
  )
}
