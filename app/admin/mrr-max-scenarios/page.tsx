'use client'

import { useMemo, useState } from 'react'

const C = {
  bg: '#0A1A2E', gold: '#C9A84C', text: '#E8E0D0',
  muted: '#9BA8B8', dim: '#5A6A7A', green: '#10B981',
  purple: '#A78BFA', blue: '#3B82F6', red: '#EF4444', amber: '#FBBF24',
}

// Cible calibrée Minato (ref project_mrr_max_blockers.md + agent_targets OFA).
const TARGET_MRR_EUR = 28000
const TARGET_PAID_CLIENTS = 1879
const TARGET_LEADS = 1_120_659
const HORIZON_DAYS = 30

// Pricing v2 (alignée bench TPE 2026-04-14).
const AVG_MRR_BASE = 16.36   // USD: 0.7×10.99 + 0.3×21.99 + mix
const AVG_MRR_WITH_SEO_GEO = 33.54 // 35% take Pro 29 + 18% take Elite 39

type Scenario = {
  id: string
  name: string
  monthlyCost: number // €/mo
  color: string
  emoji: string
  capability: {
    leadsPerDay: number
    conversionBoost: number // multiplicateur vs T0
    emailVolumePerDay: number
    avgMrrPerClient: number // USD
  }
  enabledFeatures: string[]
  blockers: string[]
  timeToTargetDays: number // estimation
}

const SCENARIOS: Scenario[] = [
  {
    id: 't0',
    name: 'T0 — Free tier only',
    monthlyCost: 0,
    color: C.green,
    emoji: '🆓',
    capability: {
      leadsPerDay: 15_000,
      conversionBoost: 1.0,
      emailVolumePerDay: 3_000,
      avgMrrPerClient: AVG_MRR_BASE,
    },
    enabledFeatures: [
      'OSM Overpass scout (gratuit illimité)',
      'YellowPages scraping (gratuit mais anti-bot)',
      'Gemini 2.0 Flash (1500 RPM × N accounts)',
      'Cloudflare Workers AI + HuggingFace free',
      'Resend free 3k/mo (contraint)',
      'Supabase free tier (500 MB)',
    ],
    blockers: [
      'Email: 3k/jour = 90k/mo max, conversion lente',
      'Pas d\'upsell SEO/GEO (pas de Stripe price IDs)',
      'Saturation Pollinations 429 / HF 402 random',
      'Supabase free: 500 MB = cap à ~80k leads enrichis',
    ],
    timeToTargetDays: 135,
  },
  {
    id: 't1_minimal',
    name: 'T0 + T1 minimal (82€/mo)',
    monthlyCost: 82,
    color: C.amber,
    emoji: '⚡',
    capability: {
      leadsPerDay: 32_000,
      conversionBoost: 1.45,
      emailVolumePerDay: 12_000,
      avgMrrPerClient: AVG_MRR_WITH_SEO_GEO,
    },
    enabledFeatures: [
      'Tout T0, +',
      'Resend Pro 20$/mo (50k emails)',
      'Supabase Pro 25$/mo (8 GB DB + point-in-time)',
      'Vercel Pro 20$/mo (build + analytics)',
      '4 Stripe price IDs SEO/GEO Pro/Elite actifs',
      'LP GEO cron mensuel (3 LP/site Pro)',
    ],
    blockers: [
      'Email: 12k/j = 360k/mo (largement suffisant)',
      'Scout volume: encore limité par rate Overpass',
    ],
    timeToTargetDays: 42,
  },
  {
    id: 't1_full',
    name: 'T0 + T1 + Resend Boost (~180€/mo)',
    monthlyCost: 180,
    color: C.purple,
    emoji: '🚀',
    capability: {
      leadsPerDay: 55_000,
      conversionBoost: 1.85,
      emailVolumePerDay: 30_000,
      avgMrrPerClient: AVG_MRR_WITH_SEO_GEO,
    },
    enabledFeatures: [
      'Tout T0 + T1 minimal, +',
      'Resend Scale 90$/mo (100k emails/mo)',
      'Google Places API (free $200/mo GCP credit)',
      'BrightData residential proxies 50$/mo (scout ES/FR/DE)',
      'GPT-4o-mini batch 20$/mo (classifier fallback)',
      'Serper $50/mo boost (Google Images/SERP)',
    ],
    blockers: [
      'Email: 30k/j = ok pour 1M leads en 33j',
      'Coût linéaire si scale au-delà (pas zero-cost)',
    ],
    timeToTargetDays: 25,
  },
]

function fmt(n: number, digits = 0) {
  return Math.round(n * Math.pow(10, digits)) / Math.pow(10, digits)
}
function fmtEur(n: number) { return `${fmt(n).toLocaleString('fr-FR')} €` }
function fmtUsd(n: number) { return `$${fmt(n).toLocaleString('fr-FR')}` }

export default function MrrMaxScenariosPage() {
  const [takeRate, setTakeRate] = useState(0.0018) // part des leads qui paient (≈ funnel end-to-end)

  const computed = useMemo(() => SCENARIOS.map(s => {
    // Model: leads_per_day × take_rate × conv_boost → paid clients/day
    // MRR = paid_clients × avg_mrr_per_client
    const paidPerDay = s.capability.leadsPerDay * takeRate * s.capability.conversionBoost
    const paidPerMonth = paidPerDay * 30
    const mrrUsd = paidPerMonth * s.capability.avgMrrPerClient
    const mrrEur = mrrUsd * 0.92 // approx USD→EUR
    const daysToTarget = TARGET_MRR_EUR / (mrrEur / 30)
    const annualRevenue = (mrrEur - s.monthlyCost) * 12
    const annualCost = s.monthlyCost * 12
    const netAnnual = annualRevenue
    return { ...s, paidPerDay, paidPerMonth, mrrUsd, mrrEur, daysToTarget, annualCost, netAnnual }
  }), [takeRate])

  const winner = computed.reduce((best, s) =>
    s.netAnnual > best.netAnnual ? s : best, computed[0])

  return (
    <div style={{ padding: 24, color: C.text, maxWidth: 1400, margin: '0 auto' }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: C.gold, margin: 0 }}>
          🌌 MRR MAX — 3 scénarios de coût
        </h1>
        <p style={{ color: C.muted, fontSize: '.9rem', margin: '8px 0 0' }}>
          Cible Minato : <b style={{ color: C.gold }}>{TARGET_MRR_EUR.toLocaleString('fr-FR')} € MRR</b> ·{' '}
          {TARGET_PAID_CLIENTS} paid clients · {TARGET_LEADS.toLocaleString('fr-FR')} leads sur {HORIZON_DAYS}j.
          Gagnant actuel : <b style={{ color: winner.color }}>{winner.emoji} {winner.name}</b>.
        </p>

        <div style={{ marginTop: 16, padding: 12, background: C.bg, border: '1px solid rgba(255,255,255,.1)', borderRadius: 6 }}>
          <label style={{ fontSize: '.8rem', color: C.muted, display: 'block', marginBottom: 6 }}>
            Take rate lead → paid client (hypothèse funnel)
          </label>
          <input type="range" min="0.0005" max="0.005" step="0.0001" value={takeRate}
            onChange={e => setTakeRate(parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: C.gold }} />
          <div style={{ fontSize: '.85rem', color: C.gold, fontWeight: 700, textAlign: 'center', marginTop: 4 }}>
            {(takeRate * 100).toFixed(3)}% ({Math.round(takeRate * 1_000_000) / 1000}‰)
          </div>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16 }}>
        {computed.map(s => {
          const isWinner = s.id === winner.id
          return (
            <div key={s.id} style={{
              padding: 18, borderRadius: 10, background: C.bg,
              border: `2px solid ${isWinner ? s.color : `${s.color}33`}`,
              position: 'relative',
            }}>
              {isWinner && (
                <span style={{
                  position: 'absolute', top: -10, right: 16,
                  background: s.color, color: C.bg, padding: '3px 10px',
                  borderRadius: 3, fontSize: '.7rem', fontWeight: 800, letterSpacing: '.05em',
                }}>⭐ BEST ROI</span>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <span style={{ fontSize: '2rem', lineHeight: 1 }}>{s.emoji}</span>
                <div>
                  <div style={{ fontWeight: 700, color: s.color, fontSize: '1rem' }}>{s.name}</div>
                  <div style={{ fontSize: '.75rem', color: C.muted }}>Coût fixe : {fmtEur(s.monthlyCost)}/mo</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                <Stat label="Leads/j" value={s.capability.leadsPerDay.toLocaleString('fr-FR')} color={C.text} />
                <Stat label="Emails/j" value={s.capability.emailVolumePerDay.toLocaleString('fr-FR')} color={C.text} />
                <Stat label="Paid/mois" value={Math.round(s.paidPerMonth).toLocaleString('fr-FR')} color={C.amber} />
                <Stat label="MRR €" value={fmtEur(s.mrrEur)} color={s.color} />
                <Stat label="Jours → target" value={fmt(s.daysToTarget) + 'j'} color={s.daysToTarget < HORIZON_DAYS ? C.green : C.red} />
                <Stat label="Net annuel" value={fmtEur(s.netAnnual)} color={isWinner ? s.color : C.text} />
              </div>

              <details style={{ marginTop: 6 }}>
                <summary style={{ cursor: 'pointer', fontSize: '.78rem', color: C.muted, fontWeight: 600 }}>
                  ✅ Features activées ({s.enabledFeatures.length})
                </summary>
                <ul style={{ margin: '8px 0 0 0', paddingLeft: 18, fontSize: '.75rem', color: C.text }}>
                  {s.enabledFeatures.map((f, i) => <li key={i}>{f}</li>)}
                </ul>
              </details>

              <details style={{ marginTop: 6 }}>
                <summary style={{ cursor: 'pointer', fontSize: '.78rem', color: C.red, fontWeight: 600 }}>
                  ⚠️ Bloqueurs ({s.blockers.length})
                </summary>
                <ul style={{ margin: '8px 0 0 0', paddingLeft: 18, fontSize: '.75rem', color: C.muted }}>
                  {s.blockers.map((b, i) => <li key={i}>{b}</li>)}
                </ul>
              </details>
            </div>
          )
        })}
      </div>

      <footer style={{ marginTop: 24, padding: 16, background: C.bg, border: `1px dashed ${C.dim}`, borderRadius: 6, fontSize: '.8rem', color: C.muted }}>
        <b style={{ color: C.gold }}>Modèle :</b> paid/j = leads/j × take_rate × conversion_boost · MRR = paid/mois × AVG_MRR (T0: ${AVG_MRR_BASE} /
        T1: ${AVG_MRR_WITH_SEO_GEO} avec upsell SEO/GEO 35%/18%).
        <br />
        <b style={{ color: C.gold }}>Source :</b> <code>project_mrr_max_blockers.md</code> · pricing v2 <code>feedback_ofa_pricing_v2.md</code>.
        À ajuster avec scénarios réels Stripe + funnel CC.
      </footer>
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ padding: '6px 8px', background: 'rgba(255,255,255,.04)', borderRadius: 4 }}>
      <div style={{ fontSize: '.62rem', color: C.dim, textTransform: 'uppercase', letterSpacing: '.05em' }}>{label}</div>
      <div style={{ fontSize: '.92rem', fontWeight: 700, color, marginTop: 2 }}>{value}</div>
    </div>
  )
}
