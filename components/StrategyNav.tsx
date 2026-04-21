'use client'

import Link from 'next/link'

const GOLD = '#C9A84C'
const MUTED = '#9BA8B8'
const BORDER_DIM = 'rgba(201,168,76,.12)'

type Tab = 'simulator' | 'vr' | 'mrr-max'

const TABS: { key: Tab; href: string; label: string; icon: string; desc: string }[] = [
  { key: 'simulator', href: '/admin/simulator',         label: 'Simulateur',  icon: '🧮', desc: 'Objectifs → plan d\'exécution' },
  { key: 'vr',        href: '/admin/vr',                label: 'V/R',         icon: '🎯', desc: 'Vision vs Réalisé (cible 30 avril)' },
  { key: 'mrr-max',   href: '/admin/mrr-max-scenarios', label: 'MRR MAX 3×',  icon: '🌌', desc: 'T0 / T0+T1 / Resend — coût vs ROI' },
]

export function StrategyNav({ active }: { active: Tab }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 2,
      padding: '10px 20px 0',
      background: '#071425',
      borderBottom: `1px solid ${BORDER_DIM}`,
    }}>
      <span style={{
        fontSize: '.6rem',
        letterSpacing: '.18em',
        textTransform: 'uppercase',
        color: GOLD,
        fontWeight: 700,
        marginRight: 14,
        paddingBottom: 10,
      }}>
        Stratégie
      </span>
      {TABS.map(tab => {
        const isActive = tab.key === active
        return (
          <Link
            key={tab.key}
            href={tab.href}
            title={tab.desc}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: '4px 4px 0 0',
              background: isActive ? 'rgba(201,168,76,.08)' : 'transparent',
              borderBottom: isActive ? `2px solid ${GOLD}` : '2px solid transparent',
              textDecoration: 'none',
              fontSize: '.72rem',
              fontWeight: isActive ? 700 : 500,
              color: isActive ? GOLD : MUTED,
              transition: 'all .15s',
              marginBottom: -1,
            }}
          >
            <span style={{ fontSize: 13 }}>{tab.icon}</span>
            <span>{tab.label}</span>
          </Link>
        )
      })}
    </div>
  )
}
