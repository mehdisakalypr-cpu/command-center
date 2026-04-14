'use client'

import { useEffect, useState } from 'react'

const C = {
  bg: '#0A1A2E', gold: '#C9A84C', text: '#E8E0D0',
  muted: '#9BA8B8', dim: '#5A6A7A', green: '#10B981',
  purple: '#A78BFA', violet: '#C084FC', blue: '#3B82F6',
  red: '#EF4444', amber: '#FBBF24',
}

const TARGET_MRR_EUR = 28000

// Les 8 modes d'overshoot que les agents exécutent automatiquement quand idle.
// Ordre = priorité ROI marginal (Shikamaru).
const OVERSHOOT_MODES = [
  { emoji: '⚓', worker: 'NAMI', name: 'Scout territoires tier 2/3', impact: '+5-10k leads/j zéro coût', priority: 10 },
  { emoji: '🦊', worker: 'KURAMA', name: 'Regen sites pour top 1% qualité', impact: '+uplift perceived value ×2', priority: 9 },
  { emoji: '📢', worker: 'OUTREACH', name: 'Multi-canal amplify (email+WA+SMS)', impact: '+conversion rate ×1.4', priority: 9 },
  { emoji: '⚡', worker: 'MINATO', name: 'LP GEO extra au-delà du quota Pro', impact: '+trafic long-tail +30%', priority: 8 },
  { emoji: '🐈‍⬛', worker: 'BEERUS', name: 'Veille concurrentielle → distill patterns', impact: '+quality moat design', priority: 7 },
  { emoji: '💚', worker: 'DEKU', name: 'Classifier auto-improve', impact: '+precision archetype ×1.2', priority: 6 },
  { emoji: '🟦', worker: 'RIMURU', name: 'Méta-agents SUK — assimilate capacities', impact: 'compound self-improvement', priority: 6 },
  { emoji: '🌀', worker: 'EXPLORER', name: 'Nouveaux canaux (TikTok/Reddit/YT Shorts)', impact: 'channel diversification', priority: 5 },
]

export default function InfiniteTsukuyomiPage() {
  const [mrrCurrent, setMrrCurrent] = useState(0)
  const [overshootPct, setOvershootPct] = useState(0)
  const [activeModes, setActiveModes] = useState<string[]>([])

  useEffect(() => {
    // Stub: on load, mark 4-6 modes as active (à wire sur API /minato/neji)
    setMrrCurrent(0)
    setActiveModes(OVERSHOOT_MODES.slice(0, 5).map(m => m.name))
  }, [])

  const overshootAmount = Math.max(0, mrrCurrent - TARGET_MRR_EUR)
  const overshootRatio = TARGET_MRR_EUR > 0 ? overshootAmount / TARGET_MRR_EUR : 0

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
        <h2 style={{ fontSize: '.95rem', fontWeight: 700, color: C.violet, margin: '0 0 12px', borderLeft: `3px solid ${C.violet}`, paddingLeft: 10 }}>
          🌀 8 modes d&apos;overshoot (actifs quand agents idle)
        </h2>
        <div style={{ display: 'grid', gap: 10 }}>
          {OVERSHOOT_MODES.map(m => {
            const isActive = activeModes.includes(m.name)
            return (
              <div key={m.name} style={{
                padding: 12, borderRadius: 6, background: C.bg,
                border: `1px solid ${isActive ? C.green : C.dim}33`,
                display: 'flex', alignItems: 'center', gap: 12,
                opacity: isActive ? 1 : 0.6,
              }}>
                <span style={{ fontSize: '1.4rem' }}>{m.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: '.72rem', padding: '2px 6px', borderRadius: 3, background: isActive ? `${C.green}30` : `${C.dim}30`, color: isActive ? C.green : C.dim, fontWeight: 700 }}>
                      {isActive ? '● ACTIVE' : '○ IDLE'}
                    </span>
                    <span style={{ fontSize: '.75rem', color: C.purple, fontWeight: 600 }}>{m.worker}</span>
                    <span style={{ fontSize: '.9rem', fontWeight: 600 }}>{m.name}</span>
                  </div>
                  <div style={{ fontSize: '.78rem', color: C.muted, marginTop: 4 }}>
                    Impact : <span style={{ color: C.amber }}>{m.impact}</span> · Priorité {m.priority}/10
                  </div>
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
