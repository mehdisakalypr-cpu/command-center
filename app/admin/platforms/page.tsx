import Link from 'next/link'
import { PLATFORMS } from '@/lib/platforms'

export const metadata = { title: 'Platforms — Admin' }

export default function PlatformsIndex() {
  const platforms = Object.values(PLATFORMS)
  return (
    <div className="min-h-screen bg-[#07090F] text-white p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-6">
          <div className="text-[11px] tracking-[.15em] text-gray-500 uppercase">Portfolio</div>
          <h1 className="text-2xl font-bold mt-1">🏗️ Platforms</h1>
          <p className="text-sm text-gray-400 mt-2 max-w-2xl">
            Vue standardisée par produit. Chaque plateforme a trois onglets : Documents · Comptabilité · Prod Launch.
            Les règles et la nomenclature sont communes pour ne jamais se perdre entre OFA, FTG, Estate, Shift et Command Center.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {platforms.map(p => (
            <Link
              key={p.key}
              href={`/admin/platforms/${p.key}`}
              className="block p-5 border border-white/10 rounded-xl hover:border-[#C9A84C]/40 transition-colors"
              style={{ borderLeftWidth: 4, borderLeftColor: p.color }}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{p.icon}</span>
                    <h2 className="text-lg font-bold">{p.name}</h2>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{p.description}</p>
                </div>
                <div className="text-right shrink-0">
                  {p.production_ready ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold">LIVE</span>
                  ) : (
                    <>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-bold">PRE-PROD</span>
                      {p.launch_target && <div className="text-[10px] text-gray-500 mt-1">T {p.launch_target}</div>}
                    </>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
