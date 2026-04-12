'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'

type NavItem = { href: string; label: string; icon: string; desc: string }
type NavGroup = { label: string; icon: string; items: NavItem[] }

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Supervision', icon: '🔭', items: [
      { href: '/admin/overview',  label: 'Overview',  icon: '🏠', desc: 'Vue d\'ensemble' },
      { href: '/admin/dashboard', label: 'Dashboard', icon: '📊', desc: 'Monitoring & VPS' },
      { href: '/admin/code-map',  label: 'Code Map',  icon: '🗺️', desc: 'Architecture projets' },
    ],
  },
  {
    label: 'Contenu', icon: '✏️', items: [
      { href: '/admin/cms',           label: 'CMS',      icon: '✏️', desc: '3 sites' },
      { href: '/admin/demo',          label: 'Démo',     icon: '🎭', desc: 'Comptes test' },
      { href: '/admin/demo-parcours', label: 'Parcours', icon: '🧭', desc: 'Tours guidés' },
    ],
  },
  {
    label: 'Clients', icon: '👥', items: [
      { href: '/admin/crm',     label: 'CRM',     icon: '👥', desc: 'Utilisateurs' },
      { href: '/admin/tickets', label: 'Tickets', icon: '🎫', desc: 'Support & refunds' },
    ],
  },
  {
    label: 'Revenus', icon: '💰', items: [
      { href: '/admin/campaigns', label: 'Campagnes', icon: '📡', desc: 'Funnels & outreach' },
      { href: '/admin/plans',     label: 'Plans',     icon: '🧾', desc: 'Tiers & analytics' },
      { href: '/admin/revenue',   label: 'Revenus',   icon: '💰', desc: 'Ventes & marges' },
      { href: '/admin/payments',  label: 'Payments',  icon: '💳', desc: 'Stripe test sheet' },
    ],
  },
  {
    label: 'Stratégie', icon: '🧠', items: [
      { href: '/admin/vr',        label: 'V/R',        icon: '🎯', desc: 'Vision vs Réalisé' },
      { href: '/admin/simulator', label: 'Simulateur', icon: '🧮', desc: 'Objectifs → plan' },
      { href: '/admin/insights',  label: 'Insights',   icon: '🧠', desc: 'Stratégie & benchmark' },
      { href: '/admin/creator',   label: 'Creator',    icon: '🐉', desc: 'Power level Saiyan + progression' },
    ],
  },
  {
    label: 'Go-live', icon: '🚀', items: [
      { href: '/admin/pvp', label: 'Pre-prod vs Prod', icon: '🚀', desc: 'Checklist avant mise en prod' },
      { href: '/admin/capacity', label: 'Capacity OFA', icon: '📈', desc: 'Pipeline sites/emails/enrich' },
      { href: '/admin/typologies', label: 'Typologies', icon: '🌳', desc: 'Arbre + sources + patterns' },
      { href: '/admin/orchestrator', label: 'Orchestrator', icon: '⚙️', desc: '6 phases pipeline live' },
      { href: '/admin/publish-health', label: 'Publish Health', icon: '🩺', desc: 'Drafts + gate 100% images' },
      { href: '/admin/smtp-setup', label: 'SMTP Setup', icon: '📧', desc: 'Resend × Supabase 2-min guide' },
    ],
  },
]

const SITES = [
  { label: 'Feel The Gap', url: 'https://feel-the-gap.vercel.app', icon: '🌍' },
  { label: 'Shift Dynamics', url: 'https://shiftdynamics.duckdns.org', icon: '⚡' },
  { label: 'The Estate', url: 'https://the-estate-fo.netlify.app', icon: '🏨' },
]

const W_OPEN = 220
const W_CLOSED = 56

const STORAGE_KEY_GROUPS = 'cc_admin_nav_groups'

function initialGroupsOpen(pathname: string): Record<string, boolean> {
  const base: Record<string, boolean> = {}
  for (const g of NAV_GROUPS) {
    base[g.label] = g.items.some((i) => pathname.startsWith(i.href))
  }
  return base
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [expanded, setExpanded] = useState(false) // collapsed by default on mobile
  const [isMobile, setIsMobile] = useState(false)
  const [groupsOpen, setGroupsOpen] = useState<Record<string, boolean>>(() => initialGroupsOpen(pathname))

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_GROUPS)
      if (raw) setGroupsOpen((cur) => ({ ...cur, ...JSON.parse(raw) }))
    } catch {}
  }, [])

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY_GROUPS, JSON.stringify(groupsOpen)) } catch {}
  }, [groupsOpen])

  // When navigating to a section, ensure its group is open
  useEffect(() => {
    setGroupsOpen((cur) => {
      const next = { ...cur }
      for (const g of NAV_GROUPS) {
        if (g.items.some((i) => pathname.startsWith(i.href))) next[g.label] = true
      }
      return next
    })
  }, [pathname])

  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (!mobile) setExpanded(true) // desktop: always open
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // On mobile, close after nav
  useEffect(() => {
    if (isMobile) setExpanded(false)
  }, [pathname, isMobile])

  const w = expanded ? W_OPEN : W_CLOSED

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#040D1C', fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* Mobile overlay when expanded */}
      {isMobile && expanded && (
        <div onClick={() => setExpanded(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 90 }} />
      )}

      {/* Sidebar */}
      <aside style={{
        width: w,
        background: '#071425',
        borderRight: '1px solid rgba(201,168,76,.15)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        transition: 'width .2s ease, left .2s ease',
        overflowX: 'hidden',
        overflowY: 'auto',
        ...(isMobile ? {
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 100,
          boxShadow: expanded ? '4px 0 24px rgba(0,0,0,.5)' : 'none',
        } : {}),
      }}>
        {/* Header — toggle */}
        <div
          onClick={() => setExpanded(e => !e)}
          style={{
            padding: expanded ? '14px 16px' : '14px 12px',
            borderBottom: '1px solid rgba(201,168,76,.15)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 20, flexShrink: 0 }}>🎙️</span>
          {expanded && (
            <span style={{ color: '#C9A84C', fontWeight: 700, fontSize: 14, letterSpacing: '.02em', whiteSpace: 'nowrap' }}>
              Command Center
            </span>
          )}
          <span style={{ marginLeft: expanded ? 'auto' : 0, color: '#5A6A7A', fontSize: 12, flexShrink: 0 }}>
            {expanded ? '◀' : '▶'}
          </span>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '6px 4px', display: 'flex', flexDirection: 'column', gap: 4, overflowY: 'auto' }}>
          {NAV_GROUPS.map(group => {
            const hasActive = group.items.some(i => pathname.startsWith(i.href))
            const open = expanded ? (groupsOpen[group.label] ?? hasActive) : true
            return (
              <div key={group.label} style={{ display: 'flex', flexDirection: 'column' }}>
                {expanded ? (
                  <button
                    type="button"
                    onClick={() => setGroupsOpen(s => ({ ...s, [group.label]: !open }))}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '6px 10px', margin: '4px 4px 2px',
                      border: 'none', background: 'transparent', cursor: 'pointer',
                      color: hasActive ? '#C9A84C' : '#7D8BA0',
                      fontSize: 10, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase',
                    }}
                  >
                    <span style={{ fontSize: 12 }}>{group.icon}</span>
                    <span>{group.label}</span>
                    <span style={{ marginLeft: 'auto', fontSize: 9, opacity: .7 }}>{open ? '▾' : '▸'}</span>
                  </button>
                ) : (
                  <div style={{
                    textAlign: 'center', fontSize: 10, color: '#5A6A7A',
                    padding: '6px 0 2px', letterSpacing: '.05em',
                  }} title={group.label}>
                    {group.icon}
                  </div>
                )}

                {open && group.items.map(item => {
                  const active = pathname === item.href || (item.href !== '/admin/overview' && item.href !== '/admin/dashboard' && pathname.startsWith(item.href))
                  return (
                    <Link key={item.href} href={item.href} title={!expanded ? item.label : undefined} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: expanded ? '6px 12px 6px 22px' : '8px 0',
                      justifyContent: expanded ? 'flex-start' : 'center',
                      borderRadius: 8,
                      textDecoration: 'none',
                      background: active ? 'rgba(201,168,76,.1)' : 'transparent',
                      border: active ? '1px solid rgba(201,168,76,.2)' : '1px solid transparent',
                      transition: 'all .15s',
                      minHeight: 32,
                    }}>
                      <span style={{ fontSize: 14, flexShrink: 0 }}>{item.icon}</span>
                      {expanded && (
                        <div style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          <div style={{ color: active ? '#C9A84C' : '#E8E0D0', fontSize: 12.5, fontWeight: active ? 600 : 400 }}>
                            {item.label}
                          </div>
                          <div style={{ color: '#5A6A7A', fontSize: 10 }}>{item.desc}</div>
                        </div>
                      )}
                    </Link>
                  )
                })}
              </div>
            )
          })}
        </nav>

        {/* Sites */}
        {expanded && (
          <div style={{ padding: '10px 12px', borderTop: '1px solid rgba(201,168,76,.15)', flexShrink: 0 }}>
            <div style={{ color: '#5A6A7A', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 6 }}>Sites</div>
            {SITES.map(s => (
              <a key={s.label} href={s.url} target="_blank" rel="noopener noreferrer" style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px', borderRadius: 6,
                textDecoration: 'none', fontSize: 11, color: '#9BA8B8',
              }}>
                <span>{s.icon}</span><span>{s.label}</span>
                <span style={{ marginLeft: 'auto', fontSize: 9, color: '#5A6A7A' }}>↗</span>
              </a>
            ))}
          </div>
        )}

        {/* Voice */}
        <div style={{ padding: '6px 4px', borderTop: '1px solid rgba(201,168,76,.15)', flexShrink: 0 }}>
          <Link href="/" title={!expanded ? 'Aria Voice' : undefined} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: expanded ? '8px 10px' : '8px 0',
            justifyContent: expanded ? 'flex-start' : 'center',
            borderRadius: 8, textDecoration: 'none', color: '#9BA8B8', fontSize: 12,
          }}>
            <span style={{ fontSize: 16 }}>🎤</span>
            {expanded && <span>Aria Voice</span>}
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main style={{
        flex: 1,
        overflow: 'auto',
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        ...(isMobile ? { marginLeft: W_CLOSED } : {}),
      }}>
        <div style={{ flex: 1, overflow: 'auto' }}>
          {children}
        </div>
      </main>
    </div>
  )
}
