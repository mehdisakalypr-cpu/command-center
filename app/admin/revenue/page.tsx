'use client'

import { useState, useEffect } from 'react'

// ─── Colors ───
const C = {
  bg: '#040D1C',
  card: '#071425',
  cardAlt: '#0A1A2E',
  gold: '#C9A84C',
  text: '#E8E0D0',
  muted: '#9BA8B8',
  dim: '#5A6A7A',
  green: '#34D399',
  red: '#EF4444',
  border: 'rgba(201,168,76,.15)',
  explorer: '#5A6A7A',
  data: '#3B82F6',
  strategy: '#8B5CF6',
  premium: '#C9A84C',
}

// ─── Fake Data ───
const PERIODS = ['7j', '30j', '90j', '12 mois', 'Tout'] as const

const MONTHLY_REVENUE = [
  { month: 'Jan', rev: 1200, cost: 420 },
  { month: 'Fév', rev: 1450, cost: 460 },
  { month: 'Mar', rev: 1800, cost: 510 },
  { month: 'Avr', rev: 2100, cost: 560 },
  { month: 'Mai', rev: 2400, cost: 610 },
  { month: 'Jun', rev: 2900, cost: 680 },
  { month: 'Jul', rev: 3200, cost: 720 },
  { month: 'Aoû', rev: 3100, cost: 710 },
  { month: 'Sep', rev: 3500, cost: 760 },
  { month: 'Oct', rev: 3900, cost: 810 },
  { month: 'Nov', rev: 4200, cost: 850 },
  { month: 'Déc', rev: 4870, cost: 890 },
]

const PLANS = [
  { name: 'Explorer', price: 'Free', users: 31, mrr: 0, pct: 0, color: C.explorer },
  { name: 'Data', price: '29€', users: 8, mrr: 232, pct: 4.8, color: C.data },
  { name: 'Strategy', price: '99€', users: 5, mrr: 495, pct: 10.2, color: C.strategy },
  { name: 'Premium', price: '149€', users: 3, mrr: 447, pct: 9.2, color: C.premium },
]

const AI_CREDITS_TOTAL = 3696

const CHURN_HISTORY = [
  { month: 'Jul', rate: 5.1 },
  { month: 'Aoû', rate: 4.2 },
  { month: 'Sep', rate: 3.8 },
  { month: 'Oct', rate: 3.5 },
  { month: 'Nov', rate: 3.7 },
  { month: 'Déc', rate: 3.2 },
]

const LOST_CLIENTS = [
  { email: 'jean.martin@email.com', detail: 'Data → annulé' },
  { email: 'company@test.com', detail: 'Strategy → downgrade Explorer' },
]

const COST_BREAKDOWN = [
  { label: 'AI APIs', amount: 780, color: '#EF4444' },
  { label: 'Stripe fees', amount: 60, color: '#F97316' },
  { label: 'Supabase', amount: 25, color: '#8B5CF6' },
  { label: 'Vercel', amount: 20, color: '#3B82F6' },
  { label: 'Domain', amount: 5, color: '#14B8A6' },
]

const TRANSACTIONS = [
  { date: '10 déc 2025', client: 'Marie Dupont', company: 'Agro-Export SA', type: 'Abonnement', plan: 'Premium', amount: 149, status: 'Payé' },
  { date: '09 déc 2025', client: 'Paul Lefèvre', company: 'TradeFlow SARL', type: 'AI Crédits', plan: '50€ pack', amount: 50, status: 'Payé' },
  { date: '08 déc 2025', client: 'Sophie Martin', company: 'IndoFrance Ltd', type: 'Abonnement', plan: 'Strategy', amount: 99, status: 'Payé' },
  { date: '07 déc 2025', client: 'Luc Bernard', company: 'MedExport SAS', type: 'AI Crédits', plan: '100€ pack', amount: 100, status: 'Payé' },
  { date: '06 déc 2025', client: 'Claire Moreau', company: 'EuroTrade GmbH', type: 'Abonnement', plan: 'Data', amount: 29, status: 'Payé' },
  { date: '05 déc 2025', client: 'Thomas Girard', company: 'AfricaLink SAS', type: 'Upgrade', plan: 'Data → Strategy', amount: 70, status: 'Payé' },
  { date: '04 déc 2025', client: 'Nathalie Roux', company: 'AsiaConnect SA', type: 'AI Crédits', plan: '20€ pack', amount: 20, status: 'Payé' },
  { date: '03 déc 2025', client: 'Jean Martin', company: 'Freelance', type: 'Annulation', plan: 'Data', amount: -29, status: 'Remboursé' },
  { date: '02 déc 2025', client: 'Olivier Petit', company: 'LogiTrade SARL', type: 'Abonnement', plan: 'Premium', amount: 149, status: 'Payé' },
  { date: '01 déc 2025', client: 'Isabelle Faure', company: 'GreenExport SAS', type: 'AI Crédits', plan: '75€ pack', amount: 75, status: 'Payé' },
]

const AI_CREDIT_PACKS = [
  { pack: '10€', count: 12, total: 120 },
  { pack: '20€', count: 8, total: 160 },
  { pack: '50€', count: 5, total: 250 },
  { pack: '75€', count: 2, total: 150 },
  { pack: '100€', count: 1, total: 100 },
]

const TOP_CREDIT_BUYERS = [
  { name: 'Luc Bernard', company: 'MedExport SAS', total: 450 },
  { name: 'Paul Lefèvre', company: 'TradeFlow SARL', total: 320 },
  { name: 'Isabelle Faure', company: 'GreenExport SAS', total: 225 },
]

// ─── Helpers ───
function eur(n: number) {
  return n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 })
}
function eurDec(n: number) {
  return n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 })
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: C.card,
      border: `1px solid ${C.border}`,
      borderRadius: 12,
      padding: 20,
      ...style,
    }}>
      {children}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ color: C.text, fontSize: 16, fontWeight: 600, margin: '0 0 16px 0', letterSpacing: '.01em' }}>
      {children}
    </h2>
  )
}

// ─── Page ───
export default function RevenuePage() {
  const [demo, setDemo] = useState(true)
  const [period, setPeriod] = useState<string>('30j')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const stored = localStorage.getItem('revenue_demo_mode')
    if (stored !== null) setDemo(stored === 'true')
  }, [])

  useEffect(() => {
    if (mounted) localStorage.setItem('revenue_demo_mode', String(demo))
  }, [demo, mounted])

  if (!mounted) return null

  const maxRev = Math.max(...MONTHLY_REVENUE.map(m => m.rev))
  const totalCosts = 890
  const totalRev = 4870
  const margin = totalRev - totalCosts
  const marginPct = ((margin / totalRev) * 100).toFixed(1)

  return (
    <div style={{ padding: '24px 28px 48px', maxWidth: 1200, margin: '0 auto', fontFamily: "Inter, 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', 'Segoe UI Symbol', system-ui, sans-serif" }}>

      {/* ═══ Header ═══ */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16, marginBottom: 28 }}>
        <h1 style={{ color: C.gold, fontSize: 24, fontWeight: 700, margin: 0, flex: '1 1 auto' }}>
          Revenus & Ventes
        </h1>

        {/* Period filter */}
        <div style={{ display: 'flex', gap: 4, background: C.cardAlt, borderRadius: 8, padding: 3 }}>
          {PERIODS.map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                border: 'none',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: period === p ? 600 : 400,
                background: period === p ? 'rgba(201,168,76,.15)' : 'transparent',
                color: period === p ? C.gold : C.dim,
                transition: 'all .15s',
              }}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Demo toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => setDemo(d => !d)}
            style={{
              width: 40,
              height: 22,
              borderRadius: 11,
              border: 'none',
              cursor: 'pointer',
              background: demo ? C.gold : C.dim,
              position: 'relative',
              transition: 'background .2s',
              flexShrink: 0,
            }}
          >
            <div style={{
              width: 16,
              height: 16,
              borderRadius: 8,
              background: '#fff',
              position: 'absolute',
              top: 3,
              left: demo ? 21 : 3,
              transition: 'left .2s',
            }} />
          </button>
          <span style={{ fontSize: 11, color: demo ? C.gold : C.dim, whiteSpace: 'nowrap' }}>
            {demo ? 'Mode demo active' : 'Donnees demo'}
          </span>
          {demo && (
            <span style={{
              fontSize: 10,
              background: 'rgba(201,168,76,.12)',
              color: C.gold,
              padding: '3px 8px',
              borderRadius: 6,
              fontWeight: 600,
              letterSpacing: '.02em',
            }}>
              DEMO
            </span>
          )}
        </div>
      </div>

      {/* ═══ Empty state when demo off ═══ */}
      {!demo && (
        <Card style={{ textAlign: 'center', padding: '80px 24px' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
          <div style={{ color: C.text, fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
            Aucune donnee reelle
          </div>
          <div style={{ color: C.dim, fontSize: 13, marginBottom: 24, maxWidth: 400, margin: '0 auto 24px' }}>
            Activez Stripe live et connectez votre compte pour voir les revenus reels.
            En attendant, activez le mode demo pour visualiser le dashboard.
          </div>
          <button
            onClick={() => setDemo(true)}
            style={{
              padding: '10px 24px',
              borderRadius: 8,
              border: `1px solid ${C.gold}`,
              background: 'rgba(201,168,76,.1)',
              color: C.gold,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Activer le mode demo
          </button>
        </Card>
      )}

      {/* ═══ Dashboard content ═══ */}
      {demo && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* ─── Row 1: KPIs ─── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            {/* MRR */}
            <Card>
              <div style={{ color: C.dim, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>MRR</div>
              <div style={{ color: C.text, fontSize: 28, fontWeight: 700, marginBottom: 4 }}>
                {eur(4870)}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ color: C.green, fontSize: 12, fontWeight: 600 }}>▲ +12%</span>
                <span style={{ color: C.dim, fontSize: 11 }}>vs periode prec.</span>
              </div>
            </Card>

            {/* Active clients */}
            <Card>
              <div style={{ color: C.dim, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>Clients actifs</div>
              <div style={{ color: C.text, fontSize: 28, fontWeight: 700, marginBottom: 4 }}>47</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ color: C.green, fontSize: 12, fontWeight: 600 }}>▲ +8</span>
                <span style={{ color: C.dim, fontSize: 11 }}>vs periode prec.</span>
              </div>
            </Card>

            {/* Churn */}
            <Card>
              <div style={{ color: C.dim, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>Churn rate</div>
              <div style={{ color: C.text, fontSize: 28, fontWeight: 700, marginBottom: 4 }}>3.2%</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ color: C.green, fontSize: 12, fontWeight: 600 }}>▼ -0.5%</span>
                <span style={{ color: C.dim, fontSize: 11 }}>vs periode prec.</span>
              </div>
            </Card>

            {/* ARPU */}
            <Card>
              <div style={{ color: C.dim, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>ARPU</div>
              <div style={{ color: C.text, fontSize: 28, fontWeight: 700, marginBottom: 4 }}>
                {eurDec(103.62)}
              </div>
              <div style={{ color: C.dim, fontSize: 11 }}>revenu moyen / utilisateur</div>
            </Card>
          </div>

          {/* ─── Row 2: Revenue by Plan ─── */}
          <Card>
            <SectionTitle>Revenu par plan</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {PLANS.map(p => (
                <div key={p.name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 3, background: p.color, display: 'inline-block', flexShrink: 0 }} />
                      <span style={{ color: C.text, fontSize: 13, fontWeight: 600 }}>{p.name}</span>
                      <span style={{ color: C.dim, fontSize: 11 }}>({p.price})</span>
                    </div>
                    <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
                      <span style={{ color: C.muted }}>{p.users} users</span>
                      <span style={{ color: C.text, fontWeight: 600 }}>{eur(p.mrr)} MRR</span>
                      <span style={{ color: C.dim }}>{p.pct}%</span>
                    </div>
                  </div>
                  <div style={{ height: 8, background: C.cardAlt, borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${p.pct}%`,
                      background: p.color,
                      borderRadius: 4,
                      transition: 'width .6s ease',
                      minWidth: p.pct > 0 ? 4 : 0,
                    }} />
                  </div>
                </div>
              ))}

              {/* AI Credits */}
              <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14, marginTop: 2 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: 'linear-gradient(135deg, #F59E0B, #EF4444)', display: 'inline-block', flexShrink: 0 }} />
                    <span style={{ color: C.text, fontSize: 13, fontWeight: 600 }}>AI Credits</span>
                    <span style={{ color: C.dim, fontSize: 11 }}>(one-time)</span>
                  </div>
                  <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
                    <span style={{ color: C.text, fontWeight: 600 }}>{eur(AI_CREDITS_TOTAL)} ce mois</span>
                    <span style={{ color: C.dim }}>75.9%</span>
                  </div>
                </div>
                <div style={{ height: 8, background: C.cardAlt, borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: '75.9%',
                    background: 'linear-gradient(90deg, #F59E0B, #EF4444)',
                    borderRadius: 4,
                    transition: 'width .6s ease',
                  }} />
                </div>
              </div>
            </div>
          </Card>

          {/* ─── Row 3: Monthly Revenue Chart ─── */}
          <Card>
            <SectionTitle>Revenu mensuel (12 derniers mois)</SectionTitle>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 200, paddingTop: 8 }}>
              {MONTHLY_REVENUE.map(m => {
                const revH = (m.rev / maxRev) * 100
                const costH = (m.cost / maxRev) * 100
                return (
                  <div key={m.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                    <div style={{ fontSize: 9, color: C.muted, marginBottom: 4, fontWeight: 600 }}>
                      {eur(m.rev)}
                    </div>
                    <div style={{ width: '100%', position: 'relative', borderRadius: '4px 4px 0 0', overflow: 'hidden' }}>
                      {/* Revenue bar */}
                      <div style={{
                        height: `${revH}%`,
                        minHeight: revH > 0 ? 8 : 0,
                        background: C.gold,
                        borderRadius: '4px 4px 0 0',
                        position: 'relative',
                        transition: 'height .4s ease',
                      }}>
                        {/* Cost overlay at bottom */}
                        <div style={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          height: `${(costH / revH) * 100}%`,
                          background: 'rgba(239, 68, 68, 0.30)',
                          borderRadius: '0 0 0 0',
                        }} />
                      </div>
                    </div>
                    <div style={{ fontSize: 10, color: C.dim, marginTop: 6 }}>{m.month}</div>
                  </div>
                )
              })}
            </div>
            <div style={{ display: 'flex', gap: 20, marginTop: 14, justifyContent: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: C.muted }}>
                <span style={{ width: 12, height: 8, borderRadius: 2, background: C.gold, display: 'inline-block' }} /> Revenu
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: C.muted }}>
                <span style={{ width: 12, height: 8, borderRadius: 2, background: 'rgba(239,68,68,.3)', display: 'inline-block' }} /> Couts plateforme
              </div>
            </div>
          </Card>

          {/* ─── Row 4: Margin Analysis ─── */}
          <Card>
            <SectionTitle>Analyse de marge</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 20, marginBottom: 20 }}>
              <div>
                <div style={{ color: C.dim, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Revenu brut</div>
                <div style={{ color: C.text, fontSize: 24, fontWeight: 700 }}>{eur(totalRev)}</div>
              </div>
              <div>
                <div style={{ color: C.dim, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Couts plateforme</div>
                <div style={{ color: C.red, fontSize: 24, fontWeight: 700 }}>-{eur(totalCosts)}</div>
              </div>
              <div>
                <div style={{ color: C.dim, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Marge nette</div>
                <div style={{ color: C.green, fontSize: 24, fontWeight: 700 }}>{eur(margin)} <span style={{ fontSize: 14, fontWeight: 400 }}>({marginPct}%)</span></div>
              </div>
            </div>

            {/* Costs stacked bar */}
            <div style={{ color: C.dim, fontSize: 11, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.06em' }}>Ventilation des couts</div>
            <div style={{ height: 24, display: 'flex', borderRadius: 6, overflow: 'hidden', marginBottom: 12 }}>
              {COST_BREAKDOWN.map(c => (
                <div
                  key={c.label}
                  title={`${c.label}: ${eur(c.amount)}`}
                  style={{
                    width: `${(c.amount / totalCosts) * 100}%`,
                    background: c.color,
                    opacity: 0.7,
                    transition: 'width .4s ease',
                    minWidth: 2,
                  }}
                />
              ))}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              {COST_BREAKDOWN.map(c => (
                <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: c.color, opacity: 0.7, display: 'inline-block' }} />
                  <span style={{ color: C.muted }}>{c.label}</span>
                  <span style={{ color: C.text, fontWeight: 600 }}>{eur(c.amount)}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* ─── Row 5: Churn & Retention ─── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            {/* Churn chart */}
            <Card>
              <SectionTitle>Churn mensuel</SectionTitle>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 100, marginBottom: 8 }}>
                {CHURN_HISTORY.map(c => {
                  const h = (c.rate / 6) * 100
                  return (
                    <div key={c.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                      <div style={{ fontSize: 10, color: C.muted, marginBottom: 4, fontWeight: 600 }}>{c.rate}%</div>
                      <div style={{
                        width: '100%',
                        maxWidth: 32,
                        height: `${h}%`,
                        background: c.rate > 4 ? 'rgba(239,68,68,.5)' : c.rate > 3.5 ? 'rgba(251,191,36,.5)' : 'rgba(52,211,153,.4)',
                        borderRadius: '4px 4px 0 0',
                        transition: 'height .4s ease',
                      }} />
                      <div style={{ fontSize: 10, color: C.dim, marginTop: 4 }}>{c.month}</div>
                    </div>
                  )
                })}
              </div>
              <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 12, marginTop: 8 }}>
                <div style={{ color: C.dim, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>LTV estime</div>
                <div style={{ color: C.gold, fontSize: 22, fontWeight: 700 }}>{eur(1240)} <span style={{ fontSize: 12, color: C.dim, fontWeight: 400 }}>/ client</span></div>
              </div>
            </Card>

            {/* Lost clients */}
            <Card>
              <SectionTitle>Clients perdus ce mois</SectionTitle>
              <div style={{ color: C.text, fontSize: 32, fontWeight: 700, marginBottom: 16 }}>
                2 <span style={{ fontSize: 13, color: C.dim, fontWeight: 400 }}>clients</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {LOST_CLIENTS.map((c, i) => (
                  <div key={i} style={{
                    padding: '10px 14px',
                    background: C.cardAlt,
                    borderRadius: 8,
                    border: `1px solid rgba(239,68,68,.15)`,
                  }}>
                    <div style={{ color: C.text, fontSize: 13, fontWeight: 500 }}>{c.email}</div>
                    <div style={{ color: C.red, fontSize: 11, marginTop: 2, opacity: 0.8 }}>{c.detail}</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* ─── Row 6: Recent Transactions ─── */}
          <Card>
            <SectionTitle>Transactions recentes</SectionTitle>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, minWidth: 500 }}>
                <thead>
                  <tr>
                    {['Date', 'Client', 'Type', 'Plan', 'Montant', 'Status'].map(h => (
                      <th key={h} style={{
                        textAlign: 'left',
                        padding: '8px 12px',
                        color: C.dim,
                        fontSize: 11,
                        textTransform: 'uppercase',
                        letterSpacing: '.06em',
                        borderBottom: `1px solid ${C.border}`,
                        fontWeight: 500,
                        whiteSpace: 'nowrap',
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {TRANSACTIONS.map((t, i) => (
                    <tr key={i} style={{ borderBottom: i < TRANSACTIONS.length - 1 ? `1px solid rgba(201,168,76,.07)` : 'none' }}>
                      <td style={{ padding: '10px 12px', color: C.dim, whiteSpace: 'nowrap' }}>{t.date}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ color: C.text, fontWeight: 500 }}>{t.client}</div>
                        <div style={{ color: C.dim, fontSize: 11 }}>{t.company}</div>
                      </td>
                      <td style={{ padding: '10px 12px', color: C.muted }}>{t.type}</td>
                      <td style={{ padding: '10px 12px', color: C.muted }}>{t.plan}</td>
                      <td style={{
                        padding: '10px 12px',
                        fontWeight: 600,
                        color: t.amount < 0 ? C.red : C.green,
                        whiteSpace: 'nowrap',
                      }}>
                        {t.amount < 0 ? '' : '+'}{eur(t.amount)}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{
                          fontSize: 10,
                          fontWeight: 600,
                          padding: '3px 8px',
                          borderRadius: 4,
                          background: t.status === 'Paye' || t.status === 'Payé' ? 'rgba(52,211,153,.1)' : 'rgba(239,68,68,.1)',
                          color: t.status === 'Paye' || t.status === 'Payé' ? C.green : C.red,
                        }}>
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* ─── Row 7: AI Credits Revenue ─── */}
          <Card>
            <SectionTitle>Revenus AI Credits</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24 }}>

              {/* Credits breakdown */}
              <div style={{ minWidth: 0, overflow: 'hidden' }}>
                <div style={{ color: C.dim, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Total credits vendus ce mois</div>
                <div style={{ color: C.gold, fontSize: 24, fontWeight: 700, marginBottom: 12 }}>{eur(AI_CREDITS_TOTAL)}</div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {AI_CREDIT_PACKS.map(p => (
                    <div key={p.pack} style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: 11,
                        color: C.text,
                        fontWeight: 600,
                        width: 36,
                        textAlign: 'right',
                        flexShrink: 0,
                      }}>
                        {p.pack}
                      </span>
                      <div style={{ flex: 1, minWidth: 40, height: 8, background: C.cardAlt, borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          width: `${(p.total / AI_CREDITS_TOTAL) * 100}%`,
                          background: 'linear-gradient(90deg, #F59E0B, #EF4444)',
                          borderRadius: 4,
                          transition: 'width .6s ease',
                        }} />
                      </div>
                      <span style={{ color: C.muted, fontSize: 10, flexShrink: 0 }}>
                        {p.count}×
                      </span>
                      <span style={{ color: C.text, fontSize: 11, fontWeight: 600, flexShrink: 0 }}>
                        {eur(p.total)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top buyers */}
              <div>
                <div style={{ color: C.dim, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 12 }}>Top acheteurs de credits</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {TOP_CREDIT_BUYERS.map((b, i) => (
                    <div key={i} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 14px',
                      background: C.cardAlt,
                      borderRadius: 8,
                      border: `1px solid ${C.border}`,
                    }}>
                      <span style={{
                        width: 28,
                        height: 28,
                        borderRadius: 14,
                        background: i === 0 ? 'rgba(201,168,76,.2)' : i === 1 ? 'rgba(192,192,192,.15)' : 'rgba(205,127,50,.12)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 13,
                        flexShrink: 0,
                      }}>
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: C.text, fontSize: 13, fontWeight: 500 }}>{b.name}</div>
                        <div style={{ color: C.dim, fontSize: 11 }}>{b.company}</div>
                      </div>
                      <div style={{ color: C.gold, fontSize: 15, fontWeight: 700, flexShrink: 0 }}>
                        {eur(b.total)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>

        </div>
      )}
    </div>
  )
}
