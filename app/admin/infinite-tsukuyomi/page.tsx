'use client'

import { useEffect, useState } from 'react'

const C = {
  bg: '#0A1A2E', gold: '#C9A84C', text: '#E8E0D0',
  muted: '#9BA8B8', dim: '#5A6A7A', green: '#10B981',
  purple: '#A78BFA', violet: '#C084FC', blue: '#3B82F6',
  red: '#EF4444', amber: '#FBBF24',
}

const TARGET_MRR_EUR = 28000

// 3 couches hiérarchiques :
// L1 Exécution normale · L2 Amplification (NEJI) · L3 Infinite Tsukuyomi (élève le potentiel)
const LAYERS = [
  {
    id: 1, label: 'Couche 1 — Exécution normale', color: '#3B82F6',
    trigger: 'Queue de tâches > 0',
    goal: 'Tenir le planning nominal',
    actions: [
      { emoji: '⚡', name: 'Exécuter les tâches en queue Minato', owner: 'agents workers' },
    ],
  },
  {
    id: 2, label: 'Couche 2 — Amplification (NEJI 👁️)', color: '#A78BFA',
    trigger: 'Queue vide ET cible pas encore atteinte',
    goal: 'Accélérer l\'atteinte de la cible',
    actions: [
      { emoji: '⚓', name: 'Scout territoires tier 2/3 (+5-10k leads/j)', owner: 'NAMI' },
      { emoji: '🦊', name: 'Regen sites top 1% qualité', owner: 'KURAMA' },
      { emoji: '📢', name: 'Outreach multi-canal email+WA+SMS', owner: 'OUTREACH' },
      { emoji: '⚡', name: 'LP GEO extra au-delà quota Pro', owner: 'MINATO' },
    ],
  },
  {
    id: 3, label: 'Couche 3 — Infinite Tsukuyomi 🌑 (élève le potentiel)', color: '#C084FC',
    trigger: 'Queue vide ET cible atteinte — buy marge de manœuvre',
    goal: 'Augmenter le POTENTIEL des objectifs — rend les cibles suivantes objectivement plus faciles',
    actions: [
      { emoji: '📈', name: 'Augmenter TAM (pays/verticales/archétypes)', owner: 'EXPLORER' },
      { emoji: '🎯', name: 'Améliorer conversion upstream (bench/A/B)', owner: 'BEERUS' },
      { emoji: '💰', name: 'Élargir pricing options (tiers/add-ons/bundles)', owner: 'NAMI' },
      { emoji: '🧬', name: 'Data moat (propension/saisonnalité/stack)', owner: 'DEKU' },
      { emoji: '🏗️', name: 'Infra proactive (cache/CDN/DB tuning)', owner: 'SHIKAMARU' },
      { emoji: '🎨', name: 'Qualité produit (designs/templates/photos uniques)', owner: 'MUSTANG' },
      { emoji: '🤝', name: 'Partenariats/distribution (Zapier, Make, listings)', owner: 'NAMI REINVEST' },
      { emoji: '📚', name: 'Content organique (blog, YT, Reddit, TikTok)', owner: 'EXPLORER' },
    ],
  },
]

export default function InfiniteTsukuyomiPage() {
  const [mrrCurrent, setMrrCurrent] = useState(0)
  const [queueSize, setQueueSize] = useState(0)

  useEffect(() => { setMrrCurrent(0); setQueueSize(0) }, [])

  const overshootAmount = Math.max(0, mrrCurrent - TARGET_MRR_EUR)
  const overshootRatio = TARGET_MRR_EUR > 0 ? overshootAmount / TARGET_MRR_EUR : 0
  const targetHit = mrrCurrent >= TARGET_MRR_EUR
  const activeLayer = queueSize > 0 ? 1 : !targetHit ? 2 : 3

  return (
    <div style={{ padding: 24, color: C.text, maxWidth: 1400, margin: '0 auto', background: `radial-gradient(circle at top, ${C.violet}15, transparent 60%)` }}>
      <header style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
          <span style={{ fontSize: '3rem', filter: `drop-shadow(0 0 12px ${C.violet})` }}>🌑</span>
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: C.violet, margin: 0, letterSpacing: '.02em' }}>
              INFINITE TSUKUYOMI — Rêve éternel de dépassement
            </h1>
            <p style={{ color: C.muted, fontSize: '.88rem', margin: '4px 0 0' }}>
              Madara Uchiha · Naruto. Aucun agent idle. Overshoot CA/MRR vers l&apos;infini.
              NEJI 👁️ supervise, MINATO ⚡ oriente, budget plafonné 150€/mo.
            </p>
          </div>
        </div>
      </header>

      <section style={{ marginBottom: 28, padding: 18, background: C.bg, border: `1px solid ${C.violet}40`, borderRadius: 10 }}>
        <h2 style={{ fontSize: '.9rem', fontWeight: 700, color: C.violet, margin: '0 0 12px' }}>
          🌌 Cible courante → plancher de la suivante
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          <StatBig label="Cible MRR" value={`${TARGET_MRR_EUR.toLocaleString('fr-FR')} €`} color={C.gold} />
          <StatBig label="MRR actuel" value={`${mrrCurrent.toLocaleString('fr-FR')} €`} color={C.blue} />
          <StatBig label="Overshoot" value={`${overshootAmount.toLocaleString('fr-FR')} €`} color={overshootAmount > 0 ? C.green : C.dim} />
          <StatBig label="Ratio overshoot" value={`×${(1 + overshootRatio).toFixed(2)}`} color={overshootRatio > 0 ? C.violet : C.dim} />
        </div>
        <p style={{ fontSize: '.78rem', color: C.muted, marginTop: 12, fontStyle: 'italic' }}>
          Principe : dès que la cible est couverte, le plafond devient le plancher. Pas de stop, pas de « suffisant pour ce mois ».
        </p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: '.95rem', fontWeight: 700, color: C.violet, margin: '0 0 6px', borderLeft: `3px solid ${C.violet}`, paddingLeft: 10 }}>
          🪜 Hiérarchie en 3 couches
        </h2>
        <p style={{ fontSize: '.8rem', color: C.muted, margin: '0 0 14px', paddingLeft: 13 }}>
          Couche active actuellement : <b style={{ color: LAYERS[activeLayer - 1].color }}>Couche {activeLayer}</b>
        </p>
        <div style={{ display: 'grid', gap: 14 }}>
          {LAYERS.map(layer => {
            const isActive = layer.id === activeLayer
            return (
              <div key={layer.id} style={{
                padding: 14, borderRadius: 8, background: C.bg,
                border: `2px solid ${isActive ? layer.color : layer.color + '30'}`,
                opacity: isActive ? 1 : 0.5,
                boxShadow: isActive ? `0 0 20px ${layer.color}30` : 'none',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ fontSize: '.95rem', fontWeight: 700, color: layer.color }}>
                    {layer.label}
                  </div>
                  {isActive && (
                    <span style={{ fontSize: '.68rem', padding: '2px 8px', borderRadius: 3, background: layer.color, color: C.bg, fontWeight: 800, letterSpacing: '.05em' }}>
                      ● ACTIVE
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '.76rem', color: C.muted, marginBottom: 4 }}>
                  <b style={{ color: C.text }}>Trigger :</b> {layer.trigger}
                </div>
                <div style={{ fontSize: '.76rem', color: C.muted, marginBottom: 10 }}>
                  <b style={{ color: C.text }}>Goal :</b> {layer.goal}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 6 }}>
                  {layer.actions.map(a => (
                    <div key={a.name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', background: 'rgba(255,255,255,.03)', borderRadius: 4 }}>
                      <span style={{ fontSize: '1rem' }}>{a.emoji}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '.78rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</div>
                        <div style={{ fontSize: '.65rem', color: C.purple }}>{a.owner}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section style={{ marginBottom: 28, padding: 14, background: C.bg, border: `1px solid ${C.red}40`, borderRadius: 8 }}>
        <h2 style={{ fontSize: '.9rem', fontWeight: 700, color: C.red, margin: '0 0 10px' }}>
          🛡️ Garde-fous (contre l&apos;emballement)
        </h2>
        <ul style={{ margin: 0, paddingLeft: 20, fontSize: '.82rem', color: C.text, lineHeight: 1.7 }}>
          <li>Budget fixe <b>max 150€/mo</b>, jamais d&apos;usage-based</li>
          <li>Si quota payant s&apos;approche de saturation → NEJI bascule sur T0 uniquement</li>
          <li>Compute gratuit = illimité, calcul payant = plafonné</li>
          <li>Chaque cycle overshoot DOIT pointer vers un asset mesurable à M+N (jamais de calcul gratuit)</li>
          <li>Si overshoot tourne 4h+ sans interruption → MINATO demande validation user</li>
        </ul>
      </section>

      <footer style={{ marginTop: 24, padding: 14, background: C.bg, border: `1px dashed ${C.dim}`, borderRadius: 6, fontSize: '.78rem', color: C.muted }}>
        💡 Source : <code>feedback_infinite_overshoot.md</code>. Supervisé par <b>NEJI 👁️</b>. Orienté par <b>SHIKAMARU 🧠</b> (R&B ROI marginal).
        Canalisé par <b>NAMI REINVEST 💰</b> (70% marge réinvestie).
      </footer>
    </div>
  )
}

function StatBig({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ padding: 12, background: 'rgba(255,255,255,.03)', borderRadius: 6, border: `1px solid ${color}33` }}>
      <div style={{ fontSize: '.68rem', color: C.dim, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: '1.3rem', fontWeight: 700, color }}>{value}</div>
    </div>
  )
}
