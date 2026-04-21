'use client'

import { useState, useMemo } from 'react'
import {
  PRODUCT_FUNNELS,
  PRODUCT_AGG_KEYS,
  computeStageVolumes,
  funnelTotalConversion,
  type ProductKey,
} from '@/lib/simulator-funnels'

const GOLD = '#C9A84C'
const GREEN = '#10B981'
const BLUE = '#60A5FA'
const MUTED = '#5A6A7A'
const TEXT = '#E8E0D0'

const PRODUCTS: { key: ProductKey; emoji: string }[] = [
  { key: 'ftg',            emoji: '🌍' },
  { key: 'ofa',            emoji: '🏗️' },
  { key: 'estate',         emoji: '🏨' },
  { key: 'shiftdynamics',  emoji: '⚡' },
  { key: 'all',            emoji: '🔀' },
]

export default function LeadsPipelinePage() {
  const [product, setProduct] = useState<ProductKey>('ftg')
  const [entryVolume, setEntryVolume] = useState(10000)

  const config = PRODUCT_FUNNELS[product]

  const stages = useMemo(
    () => computeStageVolumes(entryVolume, config.funnel),
    [entryVolume, config.funnel]
  )

  const totalConv = funnelTotalConversion(config.funnel)
  const paidVolume = stages[stages.length - 1]?.volume ?? 0
  const projectedMRR = paidVolume * config.avgMrrPerClient
  const projectedOneShot = paidVolume * config.oneShotMix * config.oneShotPrice

  const maxVolumeInStage = Math.max(...stages.map(s => s.volume), 1)

  return (
    <div style={{ padding: '20px 24px', color: TEXT, fontFamily: 'Inter, sans-serif' }}>
      {/* Product selector */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: '.58rem', color: MUTED, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 8 }}>
          Produit
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {PRODUCTS.map(p => {
            const active = product === p.key
            return (
              <button
                key={p.key}
                onClick={() => setProduct(p.key)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 14px',
                  borderRadius: 6,
                  background: active ? 'rgba(201,168,76,.12)' : '#0A1A2E',
                  border: `1px solid ${active ? GOLD : 'rgba(255,255,255,.08)'}`,
                  color: active ? GOLD : '#9BA8B8',
                  fontSize: '.7rem',
                  fontWeight: active ? 600 : 400,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all .15s',
                }}
              >
                <span>{p.emoji}</span>
                <span>{PRODUCT_FUNNELS[p.key].label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Entry volume slider */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: '.58rem', color: MUTED, letterSpacing: '.1em', textTransform: 'uppercase' }}>
            Volume d&apos;entrée /mo (leads sourcés)
          </span>
          <span style={{ fontSize: '.78rem', color: GOLD, fontWeight: 700 }}>
            {entryVolume.toLocaleString('fr-FR')}
          </span>
        </div>
        <input
          type="range"
          min={100}
          max={200000}
          step={100}
          value={entryVolume}
          onChange={e => setEntryVolume(Number(e.target.value))}
          style={{
            width: '100%',
            accentColor: GOLD,
            background: 'transparent',
          }}
        />
        <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
          {[1000, 5000, 10000, 50000, 100000].map(v => (
            <button
              key={v}
              onClick={() => setEntryVolume(v)}
              style={{
                padding: '3px 10px',
                fontSize: '.58rem',
                border: `1px solid ${entryVolume === v ? GOLD : 'rgba(255,255,255,.08)'}`,
                color: entryVolume === v ? GOLD : '#9BA8B8',
                background: entryVolume === v ? 'rgba(201,168,76,.06)' : 'transparent',
                cursor: 'pointer',
                fontFamily: 'inherit',
                borderRadius: 3,
              }}
            >
              {v >= 1000 ? `${v / 1000}k` : v}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 24 }}>
        <Kpi label="Taux end-to-end" value={`${(totalConv * 100).toFixed(3)}%`} color={BLUE} />
        <Kpi label="Clients payés /mo" value={Math.floor(paidVolume).toLocaleString('fr-FR')} color={GOLD} />
        <Kpi label="MRR potentiel /mo" value={`€${Math.round(projectedMRR).toLocaleString('fr-FR')}`} color={GREEN} />
        {config.oneShotPrice > 0 && (
          <Kpi label="One-shot /mo" value={`€${Math.round(projectedOneShot).toLocaleString('fr-FR')}`} color="#8B5CF6" />
        )}
        <Kpi
          label="Revenus projetés /mo"
          value={`€${Math.round(projectedMRR + projectedOneShot).toLocaleString('fr-FR')}`}
          color={GOLD}
        />
      </div>

      {/* Funnel visualization */}
      <div style={{ fontSize: '.58rem', color: MUTED, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 10 }}>
        Pipeline — funnel {config.label}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {stages.map((s, i) => {
          const widthPct = (s.volume / maxVolumeInStage) * 100
          const isLast = i === stages.length - 1
          return (
            <div key={s.id} style={{ display: 'flex', alignItems: 'stretch', gap: 10 }}>
              <div style={{ width: 44, fontSize: '.6rem', color: MUTED, paddingTop: 10, textAlign: 'right' }}>
                {i + 1}.
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 14px',
                    width: `${Math.max(widthPct, 18)}%`,
                    minWidth: 280,
                    background: isLast ? `linear-gradient(90deg, ${GREEN}20, ${GREEN}10)` : 'rgba(96,165,250,.08)',
                    border: `1px solid ${isLast ? GREEN : 'rgba(96,165,250,.2)'}`,
                    borderLeft: `3px solid ${isLast ? GREEN : BLUE}`,
                    transition: 'width .3s',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '.7rem', color: TEXT, fontWeight: 500 }}>{s.label}</div>
                    <div style={{ fontSize: '.55rem', color: MUTED, marginTop: 2 }}>
                      Taux stage: {(s.rate * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '.9rem', color: isLast ? GREEN : TEXT, fontWeight: 700 }}>
                      {Math.floor(s.volume).toLocaleString('fr-FR')}
                    </div>
                    <div style={{ fontSize: '.55rem', color: MUTED }}>
                      {((s.volume / entryVolume) * 100).toFixed(2)}% de l&apos;entrée
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Agents capacity section */}
      <div style={{ marginTop: 32 }}>
        <div style={{ fontSize: '.58rem', color: MUTED, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 10 }}>
          Agents capacity — {config.label} (théorique /jour)
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 8,
        }}>
          {config.agentsCapacity.map(a => (
            <div
              key={a.name}
              style={{
                padding: '10px 14px',
                background: '#0A1A2E',
                border: '1px solid rgba(255,255,255,.06)',
                borderRadius: 4,
              }}
            >
              <div style={{ fontSize: '.62rem', color: '#9BA8B8', fontFamily: 'monospace' }}>{a.name}</div>
              <div style={{ fontSize: '.82rem', color: GOLD, fontWeight: 700, marginTop: 4 }}>
                {a.perDay.toLocaleString('fr-FR')}
                <span style={{ fontSize: '.55rem', color: MUTED, fontWeight: 400, marginLeft: 4 }}>/jour</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Info block */}
      <div style={{
        marginTop: 28,
        padding: '14px 18px',
        background: 'rgba(201,168,76,.04)',
        border: '1px solid rgba(201,168,76,.15)',
        borderRadius: 4,
        fontSize: '.68rem',
        color: '#9BA8B8',
        lineHeight: 1.6,
      }}>
        <div style={{ color: GOLD, fontWeight: 600, marginBottom: 6, fontSize: '.72rem' }}>💡 Pipeline simulation</div>
        Ce funnel est une <strong>projection basée sur les hypothèses</strong> de <code style={{ color: GOLD, fontSize: '.62rem' }}>lib/simulator-funnels.ts</code>.
        Les taux seront calibrés sur la data réelle DB quand <strong>Funnel Registry v1</strong> sera déployé.
        Synchro avec le <a href="/admin/simulator" style={{ color: GOLD }}>Simulateur</a> pour voir MRR potentiel, agents capacity et scénarios vs atteinte objectif.
      </div>
    </div>
  )
}

function Kpi({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ padding: '12px 16px', background: '#0A1A2E', border: '1px solid rgba(255,255,255,.06)', borderRadius: 4 }}>
      <div style={{ fontSize: '.54rem', color: MUTED, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: '1.3rem', color, fontWeight: 700, fontFamily: 'monospace' }}>
        {value}
      </div>
    </div>
  )
}
