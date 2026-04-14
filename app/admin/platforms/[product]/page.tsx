import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PLATFORMS, PLATFORM_TABS, type PlatformKey, type PlatformTab } from '@/lib/platforms'
import { createClient } from '@supabase/supabase-js'
import DocumentsTab from './_tabs/DocumentsTab'
import AccountingTab from './_tabs/AccountingTab'
import LaunchTab from './_tabs/LaunchTab'

export const dynamic = 'force-dynamic'

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

export default async function PlatformPage({
  params, searchParams,
}: {
  params: Promise<{ product: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const { product } = await params
  const { tab: tabParam } = await searchParams
  if (!(product in PLATFORMS)) notFound()
  const platform = PLATFORMS[product as PlatformKey]
  const tab: PlatformTab = PLATFORM_TABS.some(t => t.key === tabParam) ? (tabParam as PlatformTab) : 'documents'

  // Preload data used across tabs (degraded-ok)
  const sb = db()
  const [contractsRes, documentsRes, utilRes, alertsRes, subsRes] = await Promise.all([
    sb.from('contract_acceptances').select('accepted_at, email, contract_id, typed_name, scroll_completed')
      .eq('product', product).order('accepted_at', { ascending: false }).limit(20),
    sb.from('documents').select('reference, prefix, issued_at, counterparty_name, amount_gross_minor, currency, status')
      .eq('product', product.toUpperCase()).order('issued_at', { ascending: false }).limit(20),
    sb.from('v_infrastructure_utilization').select('*').eq('scope', product),
    sb.from('infrastructure_alerts').select('*').eq('scope', product).is('resolved_at', null).order('triggered_at', { ascending: false }).limit(10),
    sb.from('infrastructure_subscriptions').select('provider, cost_eur_month, infrastructure_tiers(tier_name, pricing_url)').eq('scope', product).is('ended_at', null),
  ])
  const data = {
    contracts: (contractsRes.data ?? []) as Parameters<typeof DocumentsTab>[0]['data']['contracts'],
    contractsError: contractsRes.error?.message,
    documents: (documentsRes.data ?? []) as Parameters<typeof DocumentsTab>[0]['data']['documents'],
    documentsError: documentsRes.error?.message,
    utilization: (utilRes.data ?? []) as unknown as Parameters<typeof LaunchTab>[0]['data']['utilization'],
    alerts: (alertsRes.data ?? []) as unknown as Parameters<typeof LaunchTab>[0]['data']['alerts'],
    subscriptions: subsRes.data ?? [],
  }

  return (
    <div className="min-h-screen bg-[#07090F] text-white">
      <div className="max-w-6xl mx-auto p-8">
        <header className="mb-6">
          <Link href="/admin/platforms" className="text-xs text-gray-500 hover:text-[#C9A84C]">← Platforms</Link>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-3xl">{platform.icon}</span>
            <div>
              <h1 className="text-2xl font-bold">{platform.name}</h1>
              <p className="text-xs text-gray-400">{platform.description}</p>
            </div>
            <div className="ml-auto text-right">
              {platform.production_ready
                ? <span className="text-[11px] px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-bold">LIVE</span>
                : <div>
                    <span className="text-[11px] px-2 py-1 rounded-full bg-amber-500/20 text-amber-400 font-bold">PRE-PROD</span>
                    {platform.launch_target && <div className="text-[11px] text-gray-500 mt-1">Launch {platform.launch_target}</div>}
                  </div>
              }
            </div>
          </div>
        </header>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-white/10 mb-6 overflow-x-auto">
          {PLATFORM_TABS.map(t => (
            <Link
              key={t.key}
              href={`/admin/platforms/${product}?tab=${t.key}`}
              className={`px-4 py-2 text-sm flex items-center gap-2 border-b-2 whitespace-nowrap ${tab === t.key ? 'border-[#C9A84C] text-[#C9A84C]' : 'border-transparent text-gray-400 hover:text-white'}`}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </Link>
          ))}
        </div>

        {tab === 'documents'  && <DocumentsTab  platform={platform} data={data} />}
        {tab === 'accounting' && <AccountingTab platform={platform} data={data} />}
        {tab === 'launch'     && <LaunchTab     platform={platform} data={data} />}
      </div>
    </div>
  )
}
