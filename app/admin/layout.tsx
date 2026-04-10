'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

const NAV = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: '📊', desc: 'Monitoring & VPS' },
  { href: '/admin/cms',       label: 'CMS',       icon: '✏️', desc: '3 sites' },
  { href: '/admin/crm',       label: 'CRM',       icon: '👥', desc: 'Utilisateurs' },
  { href: '/admin/analytics', label: 'Analytics',  icon: '📈', desc: 'Events & funnels' },
  { href: '/admin/plans',     label: 'Plans',      icon: '💳', desc: 'Tiers & billing' },
  { href: '/admin/tickets',   label: 'Tickets',    icon: '🎫', desc: 'Refunds' },
  { href: '/admin/demo',      label: 'Démo',       icon: '🎭', desc: 'Comptes test' },
  { href: '/admin/data',      label: 'Data',       icon: '🗄️', desc: 'Sources & seed' },
]

const SITES = [
  { label: 'Feel The Gap', url: 'https://feel-the-gap.vercel.app', icon: '🌍', color: '#3B82F6' },
  { label: 'Shift Dynamics', url: 'https://shiftdynamics.duckdns.org', icon: '⚡', color: '#8B5CF6' },
  { label: 'The Estate', url: 'https://the-estate-fo.netlify.app', icon: '🏨', color: '#C9A84C' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#040D1C', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Sidebar */}
      <aside style={{
        width: collapsed ? 60 : 220,
        background: '#071425',
        borderRight: '1px solid rgba(201,168,76,.15)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width .2s',
        flexShrink: 0,
        overflow: 'hidden',
      }}>
        {/* Logo */}
        <div style={{
          padding: collapsed ? '16px 12px' : '16px 16px',
          borderBottom: '1px solid rgba(201,168,76,.15)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          cursor: 'pointer',
        }} onClick={() => setCollapsed(c => !c)}>
          <span style={{ fontSize: 20 }}>🎙️</span>
          {!collapsed && (
            <span style={{ color: '#C9A84C', fontWeight: 700, fontSize: 14, letterSpacing: '.02em' }}>
              Command Center
            </span>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '8px 6px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV.map(item => {
            const active = pathname === item.href || (item.href !== '/admin/dashboard' && pathname.startsWith(item.href))
            return (
              <Link key={item.href} href={item.href} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: collapsed ? '10px 14px' : '8px 12px',
                borderRadius: 8,
                textDecoration: 'none',
                background: active ? 'rgba(201,168,76,.1)' : 'transparent',
                border: active ? '1px solid rgba(201,168,76,.2)' : '1px solid transparent',
                transition: 'all .15s',
              }}>
                <span style={{ fontSize: 15, flexShrink: 0 }}>{item.icon}</span>
                {!collapsed && (
                  <div>
                    <div style={{ color: active ? '#C9A84C' : '#E8E0D0', fontSize: 13, fontWeight: active ? 600 : 400 }}>
                      {item.label}
                    </div>
                    <div style={{ color: '#5A6A7A', fontSize: 10 }}>{item.desc}</div>
                  </div>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Sites */}
        {!collapsed && (
          <div style={{ padding: '12px', borderTop: '1px solid rgba(201,168,76,.15)' }}>
            <div style={{ color: '#5A6A7A', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 8 }}>
              Sites
            </div>
            {SITES.map(s => (
              <a key={s.label} href={s.url} target="_blank" rel="noopener noreferrer" style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', borderRadius: 6,
                textDecoration: 'none', fontSize: 11, color: '#9BA8B8',
              }}>
                <span>{s.icon}</span>
                <span>{s.label}</span>
                <span style={{ marginLeft: 'auto', fontSize: 9, color: '#5A6A7A' }}>↗</span>
              </a>
            ))}
          </div>
        )}

        {/* Voice link */}
        <div style={{ padding: '8px 12px', borderTop: '1px solid rgba(201,168,76,.15)' }}>
          <Link href="/" style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
            borderRadius: 8, textDecoration: 'none', color: '#9BA8B8', fontSize: 12,
          }}>
            <span>🎤</span>
            {!collapsed && <span>Aria Voice</span>}
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflow: 'auto', minWidth: 0 }}>
        {children}
      </main>
    </div>
  )
}
