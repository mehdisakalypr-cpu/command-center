'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const GOLD = '#C9A84C'

const TABS = [
  { href: '/admin/crm-hub/users',    label: 'Utilisateurs', icon: '👥', desc: 'Profils FTG, tiers, Stripe' },
  { href: '/admin/crm-hub/leads',    label: 'Leads',        icon: '🎯', desc: 'Pipeline funnel par produit' },
  { href: '/admin/crm-hub/clients',  label: 'Clients SaaS', icon: '🪪', desc: 'Magic-link signups + waitlist scopés par business' },
  { href: '/admin/crm-hub/demo',     label: 'Démo',         icon: '🎭', desc: 'Comptes test partagés' },
  { href: '/admin/crm-hub/parcours', label: 'Parcours',     icon: '🧭', desc: 'Demandes démo + tours guidés' },
]

export default function CrmHubLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      color: '#E8E0D0',
      fontFamily: "Inter, 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', 'Segoe UI Symbol', system-ui, sans-serif",
      background: '#040D1C',
    }}>
      <header style={{
        background: '#071425',
        borderBottom: '1px solid rgba(201,168,76,.15)',
        padding: '14px 24px 0',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 12 }}>
          <span style={{
            fontSize: '.68rem',
            letterSpacing: '.18em',
            textTransform: 'uppercase',
            color: GOLD,
            fontWeight: 700,
          }}>
            CRM Hub
          </span>
          <span style={{ fontSize: '.6rem', color: '#5A6A7A' }}>
            Utilisateurs · Pipeline · Démo · Parcours · 1 source de vérité client
          </span>
        </div>

        <nav style={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          {TABS.map(tab => {
            const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`)
            return (
              <Link
                key={tab.href}
                href={tab.href}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 16px',
                  borderRadius: '6px 6px 0 0',
                  background: active ? 'rgba(201,168,76,.08)' : 'transparent',
                  borderBottom: active ? `2px solid ${GOLD}` : '2px solid transparent',
                  textDecoration: 'none',
                  fontSize: '.72rem',
                  fontWeight: active ? 700 : 400,
                  color: active ? GOLD : '#9BA8B8',
                  transition: 'all .15s',
                }}
                title={tab.desc}
              >
                <span style={{ fontSize: 14 }}>{tab.icon}</span>
                <span>{tab.label}</span>
              </Link>
            )
          })}
        </nav>
      </header>

      <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
        {children}
      </div>
    </div>
  )
}
