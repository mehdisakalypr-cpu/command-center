'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { authFetch } from '@/lib/auth-v2/client-fetch'
import { createSupabaseBrowser } from '@/lib/auth-v2/supabase'
import { BusinessProvider } from '@/lib/businesses/context'
import { BusinessPicker } from '@/components/BusinessPicker'

type NavItem = { href: string; label: string; icon: string; desc: string }
type NavGroup = { label: string; icon: string; items: NavItem[] }

// Refactor 2026-04-16: 7→5 groupes (menu compact). Sous-headers dans `subgroup` regroupent les paires
// qui se recoupent visuellement (Plans+Payments, Démo+Parcours, Go-live+PVP, LLC+Documents, Infra+Publish Health).
// Sous-headers décoratifs uniquement — chaque page reste accessible individuellement.
type NavItemX = NavItem & { subgroup?: string; external?: boolean }
type NavGroupX = { label: string; icon: string; items: NavItemX[] }

const NAV_GROUPS: NavGroupX[] = [
  {
    label: 'Pilotage', icon: '🔭', items: [
      { href: '/admin/overview',          label: 'Overview',    icon: '🏠', desc: 'Vue d\'ensemble' },
      { href: '/admin/businesses',        label: 'Businesses',  icon: '🏢', desc: 'Registre multi-business · scope rubriques' },
      { href: '/admin/dashboard',         label: 'Dashboard',   icon: '📊', desc: 'Monitoring & VPS' },
      { href: '/admin/vr',                label: 'V/R',         icon: '🎯', desc: 'Vision vs Réalisé' },
      { href: '/admin/simulator',         label: 'Simulateur',  icon: '🧮', desc: 'Objectifs → plan', subgroup: 'Stratégie' },
      { href: '/admin/mrr-max-scenarios', label: 'MRR MAX 3×',  icon: '🌌', desc: 'T0/T0+T1/Resend coût/ROI', subgroup: 'Stratégie' },
      { href: '/admin/globe',             label: 'BANKAI',      icon: '🗡️', desc: 'Revenue Globe 3D temps réel · multi-sites', subgroup: 'Stratégie' },
      { href: '/admin/ftg-launch',        label: 'FTG Launch',  icon: '🚀', desc: 'Budget + MRR M1 scenarios + leviers 15 mai', subgroup: 'Stratégie' },
      { href: '/admin/ftg-campaigns',     label: 'FTG Campaigns',icon: '📧', desc: 'Outbound orchestrator: segments × templates × providers', subgroup: 'Stratégie' },
      { href: '/admin/insights',          label: 'Insights',    icon: '🧠', desc: 'Stratégie & benchmark', subgroup: 'Stratégie' },
      { href: '/admin/code-map',          label: 'Code Map',    icon: '🗺️', desc: 'Architecture projets' },
    ],
  },
  {
    label: 'Agents', icon: '⚡', items: [
      { href: '/admin/minato',       label: 'Minato',       icon: '⚡', desc: 'Shonen + Managed · Arsenal · NEJI · Infinite Tsukuyomi' },
      { href: '/admin/cc-fleet',     label: 'CC Fleet',     icon: '🔀', desc: 'N-worker orchestration · capability-based · scope-locked' },
      { href: '/admin/hisoka',          label: 'Hisoka',         icon: '🃏', desc: 'Business Hunter · top 20 preys · deep analysis' },
      { href: '/admin/hisoka/portfolio',label: 'Hisoka Portfolio',icon: '📦', desc: 'Suivi E2E production top 10 · barres progression · Pipeline + Services' },
      { href: '/admin/hisoka/forge',    label: 'AAM Forge',      icon: '💪', desc: 'Armored All Might · lift weak ideas above 0.92 autonomy' },
      { href: '/admin/saas-portfolio',  label: 'SaaS Portfolio', icon: '🚀', desc: 'Landings live · numérotées · waitlists · ouvrir page publique' },
      { href: '/admin/ki-sense',     label: 'Ki Sense',     icon: '🧘', desc: 'Flywheel health · crons · anomalies · LLM pool 24h' },
      { href: '/admin/orchestrator', label: 'Orchestrator', icon: '⚙️', desc: '6 phases pipeline live', subgroup: 'Pipeline' },
      { href: '/admin/capacity',     label: 'Capacity OFA', icon: '📈', desc: 'Pipeline sites/emails/enrich', subgroup: 'Pipeline' },
      { href: '/admin/creator',      label: 'Creator',      icon: '🐉', desc: 'Power level Saiyan + progression' },
      { href: '/admin/typologies',   label: 'Typologies',   icon: '🌳', desc: 'Arbre + sources + patterns' },
      { href: '/admin/routines',     label: 'Routines',     icon: '🌀', desc: 'Cron + self-critique méta-loop weekly' },
    ],
  },
  {
    label: 'Revenus', icon: '💰', items: [
      { href: '/admin/campaigns', label: 'Campagnes', icon: '📡', desc: 'Funnels & outreach' },
      { href: '/admin/revenue',   label: 'Revenus',   icon: '💰', desc: 'Ventes & marges' },
      { href: '/admin/plans',     label: 'Plans',     icon: '🧾', desc: 'Tiers & analytics' },
    ],
  },
  {
    label: 'Ops & Contenu', icon: '👥', items: [
      { href: '/admin/crm-hub',       label: 'CRM Hub',  icon: '👥', desc: 'Users · Leads · Démo · Parcours' },
      { href: '/admin/tickets',       label: 'Tickets',  icon: '🎫', desc: 'Support & refunds' },
      { href: '/admin/cms',           label: 'CMS',      icon: '✏️', desc: '3 sites' },
      { href: '/admin/ad-factory',    label: 'Ad Factory', icon: '🎬', desc: 'Hub moteur vidéos IA' },
      { href: 'https://feel-the-gap.vercel.app/admin/ad-factory/avatars',  label: 'Avatars',  icon: '🎭', desc: 'Générer avatars IA (nano-banana)', subgroup: 'Ad Factory', external: true },
      { href: 'https://feel-the-gap.vercel.app/admin/ad-factory/scenes',   label: 'Scenes',   icon: '🌆', desc: 'Backgrounds animés', subgroup: 'Ad Factory', external: true },
      { href: 'https://feel-the-gap.vercel.app/admin/ad-factory/projects', label: 'Projets',  icon: '🎞️', desc: 'Scénarios + studio édition', subgroup: 'Ad Factory', external: true },
    ],
  },
  {
    label: 'Structure & Tech', icon: '🏛️', items: [
      { href: '/admin/go-live',        label: 'Go-live',          icon: '🏁', desc: '4 actions humaines (LLC·OA·SS-4·CPA)', subgroup: 'Mise en prod' },
      { href: '/admin/pvp',            label: 'Pre-prod vs Prod', icon: '🚀', desc: 'Checklist avant prod', subgroup: 'Mise en prod' },
      { href: '/admin/llc',            label: 'LLC Wyoming',      icon: '🇺🇸', desc: 'Formation, Mercury, Trust', subgroup: 'Légal' },
      { href: '/admin/documents',      label: 'Documents',        icon: '📑', desc: 'Contrats · factures · compta', subgroup: 'Légal' },
      { href: '/admin/platforms',      label: 'Platforms',        icon: '🏗️', desc: 'Vue par produit (Docs·Compta·Prod)' },
      { href: '/admin/infra',          label: 'Infra capacity',   icon: '🟢', desc: '% providers · auto-scale · coût/mo', subgroup: 'Health' },
      { href: '/admin/publish-health', label: 'Publish Health',   icon: '🩺', desc: 'Drafts + gate 100% images', subgroup: 'Health' },
      { href: '/admin/security',       label: 'Sécurité',         icon: '🛡️', desc: 'Cockpit OWASP ASVS' },
      { href: '/admin/smtp-setup',     label: 'SMTP Setup',       icon: '📧', desc: 'Resend × Supabase 2-min guide' },
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

function linkBoxStyle(active: boolean, expanded: boolean): React.CSSProperties {
  return {
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
  }
}

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

  // Note 2026-04-18 : retiré l'auto-open-on-nav qui override le collapse user.
  // initialGroupsOpen(pathname) gère l'état initial ; ensuite les toggles user persistent.

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
    <BusinessProvider>
    <div style={{ display: 'flex', minHeight: '100vh', background: '#040D1C', fontFamily: "Inter, 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', 'Segoe UI Symbol', system-ui, sans-serif" }}>

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
                      display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                      padding: '10px 14px', margin: '8px 4px 4px',
                      border: 'none', background: hasActive ? 'rgba(201,168,76,.08)' : 'transparent',
                      cursor: 'pointer', borderRadius: 6,
                      color: hasActive ? '#C9A84C' : '#C4CDD8',
                      fontSize: 13, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase',
                      borderLeft: hasActive ? '3px solid #C9A84C' : '3px solid transparent',
                      transition: 'all .15s',
                    }}
                  >
                    <span style={{ fontSize: 16 }}>{group.icon}</span>
                    <span>{group.label}</span>
                    <span style={{ marginLeft: 'auto', fontSize: 12, opacity: .8, color: hasActive ? '#C9A84C' : '#7D8BA0' }}>
                      {open ? '▾' : '▸'}
                    </span>
                  </button>
                ) : (
                  <div style={{
                    textAlign: 'center', fontSize: 10, color: '#5A6A7A',
                    padding: '6px 0 2px', letterSpacing: '.05em',
                  }} title={group.label}>
                    {group.icon}
                  </div>
                )}

                {open && group.items.map((item, idx) => {
                  const active = pathname === item.href || (item.href !== '/admin/overview' && item.href !== '/admin/dashboard' && pathname.startsWith(item.href))
                  const prevSubgroup = idx > 0 ? group.items[idx - 1].subgroup : undefined
                  const showSubHeader = expanded && item.subgroup && item.subgroup !== prevSubgroup
                  return (
                    <div key={item.href}>
                    {showSubHeader && (
                      <div style={{ padding: '6px 12px 2px 22px', color: '#5A6A7A', fontSize: 9, letterSpacing: '.18em', textTransform: 'uppercase', fontWeight: 600 }}>
                        {item.subgroup}
                      </div>
                    )}
                    {item.external ? (
                      <a href={item.href} target="_blank" rel="noopener noreferrer" title={!expanded ? item.label : undefined} style={linkBoxStyle(active, expanded)}>
                        <span style={{ fontSize: 14, flexShrink: 0 }}>{item.icon}</span>
                        {expanded && (
                          <div style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
                            <div style={{ color: active ? '#C9A84C' : '#E8E0D0', fontSize: 12.5, fontWeight: active ? 600 : 400 }}>
                              {item.label} <span style={{ color: '#5A6A7A', fontSize: 9 }}>↗</span>
                            </div>
                            <div style={{ color: '#5A6A7A', fontSize: 10 }}>{item.desc}</div>
                          </div>
                        )}
                      </a>
                    ) : (
                      <Link href={item.href} title={!expanded ? item.label : undefined} style={linkBoxStyle(active, expanded)}>
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
                    )}
                    </div>
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

        {/* Logout */}
        <div style={{ padding: '6px 4px', borderTop: '1px solid rgba(201,168,76,.15)', flexShrink: 0 }}>
          <LogoutButton expanded={expanded} />
        </div>
      </aside>

      {/* (LogoutButton defined below) */}

      {/* Main content */}
      <main style={{
        flex: 1,
        overflow: 'auto',
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        ...(isMobile ? { marginLeft: W_CLOSED } : {}),
      }}>
        {/* Floating top-right: business picker + logout */}
        <div style={{
          position: 'absolute',
          top: 12,
          right: 14,
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          <BusinessPicker />
          <TopbarLogoutButton />
        </div>

        <div style={{ flex: 1, overflow: 'auto' }}>
          {children}
        </div>
      </main>
    </div>
    </BusinessProvider>
  )
}

function TopbarLogoutButton() {
  const [busy, setBusy] = useState(false)
  async function handleLogout() {
    if (busy) return
    setBusy(true)
    try {
      try { await authFetch('/api/auth/logout', { method: 'POST' }) } catch { /* noop */ }
      try { await createSupabaseBrowser().auth.signOut() } catch { /* noop */ }
    } finally {
      window.location.assign('/auth/login')
    }
  }
  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={busy}
      title="Se déconnecter"
      aria-label="Se déconnecter"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '6px 12px',
        border: '1px solid rgba(224,106,106,.35)',
        borderRadius: 8,
        background: 'rgba(224,106,106,.08)',
        color: '#E06A6A',
        fontSize: 12,
        fontWeight: 600,
        cursor: busy ? 'default' : 'pointer',
        opacity: busy ? 0.6 : 1,
        backdropFilter: 'blur(8px)',
      }}
    >
      <span style={{ fontSize: 14 }}>🚪</span>
      <span>{busy ? 'Déconnexion…' : 'Se déconnecter'}</span>
    </button>
  )
}

function LogoutButton({ expanded }: { expanded: boolean }) {
  const [busy, setBusy] = useState(false)
  async function handleLogout() {
    if (busy) return
    setBusy(true)
    try {
      try { await authFetch('/api/auth/logout', { method: 'POST' }) } catch { /* noop */ }
      try { await createSupabaseBrowser().auth.signOut() } catch { /* noop */ }
    } finally {
      window.location.assign('/auth/login')
    }
  }
  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={busy}
      title={!expanded ? 'Se déconnecter' : undefined}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, width: '100%',
        padding: expanded ? '8px 10px' : '8px 0',
        justifyContent: expanded ? 'flex-start' : 'center',
        borderRadius: 8, border: 'none', background: 'transparent',
        color: '#E06A6A', fontSize: 12, cursor: busy ? 'default' : 'pointer',
        opacity: busy ? 0.6 : 1,
      }}
    >
      <span style={{ fontSize: 16 }}>🚪</span>
      {expanded && <span>{busy ? 'Déconnexion…' : 'Se déconnecter'}</span>}
    </button>
  )
}
