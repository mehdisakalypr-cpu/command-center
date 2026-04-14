import Link from 'next/link'

const TABS: { href: string; label: string; icon: string }[] = [
  { href: '/admin/minato',          label: 'Overview',           icon: '⚡' },
  { href: '/admin/minato/arsenal',  label: 'Arsenal',            icon: '⚔️' },
  { href: '/admin/minato/neji',     label: 'NEJI',               icon: '👁️' },
  { href: '/admin/minato/infinite', label: 'Infinite Tsukuyomi', icon: '🌑' },
  { href: '/admin/minato/session',  label: 'Session',            icon: '📜' },
]

export default function MinatoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#07090F] text-white">
      <div className="border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center gap-1 overflow-x-auto">
          <span className="text-[#C9A84C] font-bold tracking-wider text-sm mr-4">⚡ MINATO</span>
          {TABS.map(t => (
            <Link
              key={t.href}
              href={t.href}
              className="px-3 py-1.5 text-xs rounded-lg hover:bg-white/5 flex items-center gap-1.5 whitespace-nowrap"
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </Link>
          ))}
        </div>
      </div>
      {children}
    </div>
  )
}
