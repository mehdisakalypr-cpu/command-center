'use client'

const C = {
  bg: '#0A1A2E', gold: '#C9A84C', text: '#E8E0D0',
  muted: '#9BA8B8', dim: '#5A6A7A',
}

type Tech = { emoji: string; name: string; char: string; anime: string; role: string; status?: 'live' | 'wip' | 'planned' }

const LEVELS: { label: string; color: string; desc: string; techs: Tech[] }[] = [
  {
    label: '⚡ MINATO — Chef d\'orchestre', color: '#FBBF24', desc: 'Activation instantanée, orchestration sans audit',
    techs: [
      { emoji: '⚡', name: 'MINATO', char: 'Minato Namikaze', anime: 'Naruto', role: 'Orchestrateur central — "lance Minato sur X"', status: 'live' },
    ],
  },
  {
    label: 'Niveau 1 — Exécution', color: '#3B82F6', desc: 'Agents ouvriers qui codent, scrapent, construisent',
    techs: [
      { emoji: '🐺', name: 'KAKASHI', char: 'Kakashi Hatake', anime: 'Naruto', role: 'Copy Ninja — scan briques existantes avant de coder, anti-duplication', status: 'live' },
      { emoji: '🦊', name: 'KURAMA', char: 'Kyūbi', anime: 'Naruto', role: 'Image-cascade 9 sources + sublimation archétype, zéro coût', status: 'live' },
      { emoji: '🌊', name: 'TANJIRO', char: 'Tanjiro Kamado', anime: 'Demon Slayer', role: 'Business personas par archétype × région', status: 'live' },
      { emoji: '⛓️', name: 'KURAPIKA', char: 'Kurapika', anime: 'HxH', role: 'Deep Typology + Product Taxonomy', status: 'live' },
      { emoji: '🔥', name: 'MUSTANG', char: 'Roy Mustang', anime: 'FMA', role: 'Design Coherence — top 3 designs par archétype', status: 'live' },
      { emoji: '💚', name: 'DEKU', char: 'Izuku Midoriya', anime: 'MHA', role: 'Classifier auto-improve (quirks = archétypes)', status: 'live' },
      { emoji: '⚱️', name: 'KAMADO', char: 'Tanjiro lineage', anime: 'Demon Slayer', role: 'Process Story — savoir-faire émotionnel', status: 'live' },
      { emoji: '🗡️', name: 'AKAME', char: 'Akame', anime: 'Akame ga Kill', role: 'Publish Gate strict — coupe sans pitié si <100% images', status: 'live' },
    ],
  },
  {
    label: 'Niveau 2 — Scaling', color: '#A78BFA', desc: 'Passage à l\'échelle, parallélisation, capacité',
    techs: [
      { emoji: '⚡', name: 'KAIOKEN', char: 'Goku', anime: 'Dragon Ball', role: 'Scaling intensif agents parallèles (×2 ×4 ×10)', status: 'live' },
      { emoji: '🟢', name: 'GIANT PICCOLO', char: 'Piccolo', anime: 'Dragon Ball', role: 'Autoscaling capacitaire V/H + find-capacity', status: 'live' },
      { emoji: '🩵', name: 'GOJO', char: 'Satoru Gojo', anime: 'JJK', role: 'Limitless — scan quotas free-tier, infinité d\'options', status: 'live' },
      { emoji: '🟦', name: 'RIMURU', char: 'Rimuru Tempest', anime: 'Tensei Slime', role: 'SUK — méta-agents qui assimilent et s\'auto-améliorent', status: 'live' },
      { emoji: '🧠', name: 'SHIKAMARU', char: 'Shikamaru Nara', anime: 'Naruto', role: 'R&B — data + content + revenue stratège', status: 'live' },
    ],
  },
  {
    label: 'Niveau 3 — Commerce & Conversion', color: '#10B981', desc: 'Revenu, funnel, compound flywheel',
    techs: [
      { emoji: '⚓', name: 'NAMI', char: 'Nami', anime: 'One Piece', role: 'Pipeline scout → builder → pitcher, cupidité constructive', status: 'live' },
      { emoji: '💪', name: 'AAM', char: 'Armored All Might', anime: 'MHA', role: 'Autofinancement croisé (OFA couvre FTG dès M1)', status: 'live' },
      { emoji: '💰', name: 'NAMI REINVEST', char: 'Nami', anime: 'One Piece', role: '70% marge réinvestie compound flywheel', status: 'planned' },
      { emoji: '👑', name: 'LELOUCH', char: 'Lelouch vi Britannia', anime: 'Code Geass', role: 'Business Simulator + V/R forecast', status: 'wip' },
      { emoji: '📜', name: 'JIRAIYA', char: 'Jiraiya', anime: 'Naruto', role: 'MES ACTIONS panel humain todo', status: 'live' },
    ],
  },
  {
    label: 'Niveau 4 — Benchmark & Qualité', color: '#EC4899', desc: 'Arbitrage qualité, éliminatoire, vote',
    techs: [
      { emoji: '🐈‍⬛', name: 'BEERUS', char: 'Bîrusu', anime: 'DBZ', role: 'Redesign Bench — détruit les outils faibles', status: 'live' },
      { emoji: '🔬', name: 'SENKU', char: 'Senku Ishigami', anime: 'Dr Stone', role: 'Image Gen Bench multi-IA vote → cascade', status: 'wip' },
      { emoji: '🌌', name: 'GENKIDAMA', char: 'Goku', anime: 'Dragon Ball', role: 'Concentration finale sur target MRR MAX', status: 'live' },
    ],
  },
  {
    label: 'Niveau 5 — Garde-fous', color: '#EF4444', desc: 'Sécurité, discipline, vérification',
    techs: [
      { emoji: '🔒', name: 'AEGIS', char: 'Aegis Shield', anime: '—', role: 'Sécurité — reset pw jamais bypass login, mindset attaquant', status: 'live' },
      { emoji: '🚫', name: 'NO LAZY', char: 'Saitama mode entraînement', anime: 'OPM', role: 'Interdit de s\'arrêter, compteur compute CC = preuve', status: 'live' },
      { emoji: '🪞', name: 'SHISUI', char: 'Shisui Uchiha', anime: 'Naruto', role: 'Miroir — relire son travail avant de dire "c\'est fait"', status: 'live' },
    ],
  },
]

function StatusBadge({ status }: { status?: Tech['status'] }) {
  if (!status) return null
  const cfg = { live: { c: '#10B981', t: 'LIVE' }, wip: { c: '#FBBF24', t: 'WIP' }, planned: { c: '#6B7280', t: 'PLANNED' } }[status]
  return (
    <span style={{ fontSize: '.62rem', fontWeight: 700, padding: '2px 6px', borderRadius: 3, background: `${cfg.c}20`, color: cfg.c, letterSpacing: '.05em' }}>
      {cfg.t}
    </span>
  )
}

export default function MinatoArsenalPage() {
  const totalTechs = LEVELS.flatMap(l => l.techs).length
  const live = LEVELS.flatMap(l => l.techs).filter(t => t.status === 'live').length

  return (
    <div style={{ padding: 24, color: C.text, maxWidth: 1400, margin: '0 auto' }}>
      <header style={{ marginBottom: 32, textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: 8 }}>⚡</div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: C.gold, margin: 0 }}>
          Minato Arsenal — 24 Techniques
        </h1>
        <p style={{ color: C.muted, fontSize: '.9rem', margin: '8px 0 0' }}>
          Chaque feature a son personnage d&apos;anime + rôle métier. {live}/{totalTechs} LIVE en prod.
        </p>
      </header>

      {LEVELS.map((level, i) => (
        <section key={i} style={{ marginBottom: 32 }}>
          <h2 style={{
            fontSize: '1rem', fontWeight: 700, margin: '0 0 4px',
            color: level.color, borderLeft: `4px solid ${level.color}`, paddingLeft: 12,
          }}>{level.label}</h2>
          <p style={{ fontSize: '.8rem', color: C.dim, margin: '0 0 16px', paddingLeft: 16 }}>{level.desc}</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {level.techs.map(t => (
              <div key={t.name} style={{
                padding: 14, borderRadius: 8, background: C.bg,
                border: `1px solid ${level.color}33`,
                transition: 'transform .15s, border-color .15s',
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = `${level.color}99` }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = `${level.color}33` }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: '2rem', lineHeight: 1 }}>{t.emoji}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <strong style={{ fontSize: '.95rem', color: level.color }}>{t.name}</strong>
                      <StatusBadge status={t.status} />
                    </div>
                    <div style={{ fontSize: '.7rem', color: C.muted, marginTop: 1 }}>
                      {t.char} · <em>{t.anime}</em>
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: '.8rem', color: C.text, lineHeight: 1.4 }}>{t.role}</div>
              </div>
            ))}
          </div>
        </section>
      ))}

      <footer style={{ marginTop: 24, padding: 16, background: C.bg, border: `1px dashed ${C.dim}`, borderRadius: 6, fontSize: '.8rem', color: C.muted }}>
        💡 Invocation ciblée : &quot;Minato lance {'{'}Kakashi{'}'} sur &lt;projet&gt;&quot; — mobilise une seule technique.
        Invocation globale : &quot;Minato arsenal complet&quot; — Kaioken mode, tout en parallèle.
        Référence : <code>project_minato_arsenal.md</code> (memory).
      </footer>
    </div>
  )
}
