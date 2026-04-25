export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const metadata = { title: 'Creator Notation · Command Center' }

const TODAY_SCORE = {
  date: '2026-04-25',
  legacy: 98,
  legacy_max: 95,
  ui_intensity: 47,
  ui_intensity_max: 50,
  total: 145,
  total_max: 145,
  posture: '🔵 UI-M • 🟡 Téléportation + 🍙 Senzu Farm + 🟢 Ki Sense + 🛡 Ki Shield + 🧘 Zenkai Boost + 👊 Meteor Combination + 💮 Mystic + 🌐 Reconnaissance Network',
  newTechniqueUnlocked: '🌐 Reconnaissance Network (Saiyan Pod scout swarm)',
  techniques: 8,
}

const STATS_25_DAYS = {
  period: '1er avril → 25 avril 2026 (25 jours)',
  commits: 1050,
  lines_added: 709782,
  lines_deleted: 208690,
  code_net: 501092,
  total_touched: 918472,
  memory_entries: 164,
  memory_lines: 11073,
  monitor_lines: 2667,
  skills_lines: 3060,
  grand_total: 535000,
  velocity_per_day: 21400,
  commits_per_day: 42,
}

const COMPARE = [
  { label: 'Dev senior solo classique', loc_per_month: '3-5k', loc_per_day: '~150' },
  { label: 'Équipe 5 devs', loc_per_month: '15-25k', loc_per_day: '~700' },
  { label: 'Mehdi solo + Claude (Opus/Sonnet)', loc_per_month: '~210k', loc_per_day: '~21k', highlight: true },
]

const PROJECTS_25D = [
  { name: 'FTG (feel-the-gap)', commits: 423, plus: '329k', minus: '97k', tam: '€1.5B' },
  { name: 'Command Center', commits: 298, plus: '150k', minus: '35k', tam: 'internal' },
  { name: 'OFA (site-factory)', commits: 211, plus: '72k', minus: '5k', tam: '€420M-470M' },
  { name: 'Optimus-rs (Rust)', commits: 13, plus: '69k', minus: '66k', tam: 'alpha' },
  { name: 'Optimus (Python)', commits: 46, plus: '18k', minus: '0.5k', tam: 'alpha' },
  { name: 'Consulting', commits: 19, plus: '17k', minus: '0.6k', tam: 'side' },
  { name: 'Estate', commits: 26, plus: '12k', minus: '1.6k', tam: '€960M' },
  { name: 'AICI (NEW today)', commits: 1, plus: '4k', minus: '0', tam: '€99-499/mo SaaS' },
  { name: 'Hôtelier Investissement', commits: 7, plus: '17k', minus: '0.4k', tam: 'side' },
  { name: 'Monorepo', commits: 5, plus: '8k', minus: '0.8k', tam: 'engines' },
  { name: 'Isekai Football', commits: 1, plus: '7k', minus: '0', tam: 'side' },
]

const HISTORY = [
  { date: '2026-04-25', total: '145/145', legacy: '98/95', ui: '47/50', note: '⭐ session record', techniques: 8, color: '#FFD700' },
  { date: '2026-04-24', total: '130/145', legacy: '98/95', ui: '32/50', note: '+4 techniques rétro (Ki Shield + Zenkai + Meteor + Mystic)', techniques: 7 },
  { date: '2026-04-23', total: '136/145', legacy: '98/95', ui: '38/50', note: 'Optimus Rust 6 streams + Minato wave 4 parallèles', techniques: 3 },
  { date: '2026-04-22 19h30', total: '127/145', legacy: '99/95', ui: '28/50', note: '🍙 Senzu Farm unlock', techniques: 2 },
  { date: '2026-04-22 16h', total: '123/145', legacy: '98/95', ui: '25/50', note: '🔵 UI-M unlock day', techniques: 1 },
  { date: '2026-04-21', total: '129/145', legacy: '94/95', ui: '35/50', note: 'Eishi Layer + Rock Lee v2', techniques: 0 },
  { date: '2026-04-19', total: '92/95', legacy: '92/95', ui: 'N/A', note: 'pré-UI-M' },
  { date: '2026-04-11', total: '64/100', legacy: '64/100', ui: 'N/A', note: 'baseline' },
]

export default function CreatorNotationPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#030314', color: '#E8EEF7', fontFamily: 'Inter, system-ui, sans-serif', padding: '24px clamp(16px, 5vw, 48px)' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <header style={{ marginBottom: 32, paddingTop: 64 }}>
          {/* Tabs en premier (placés sous la zone des boutons floating top-right BusinessPicker + logout) */}
          <nav style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <a
              href="/admin/creator"
              style={{
                padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, letterSpacing: '.06em',
                background: 'rgba(255,255,255,.05)', color: '#cfd2dc', border: '1px solid rgba(255,255,255,.12)', textDecoration: 'none',
              }}
            >🐉 Saiyan</a>
            <a
              href="/admin/creator-notation"
              style={{
                padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, letterSpacing: '.06em',
                background: '#C9A84C', color: '#0a0a1e', textDecoration: 'none',
              }}
            >💻 Dev (LoC + UI-Intensity)</a>
          </nav>
          <div style={{ fontSize: 11, letterSpacing: '.15em', color: '#C9A84C', textTransform: 'uppercase' }}>Creator Notation</div>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: '4px 0 0', color: '#fff' }}>Mehdi Sakaly · Founder Score</h1>
          <p style={{ fontSize: 13, color: '#8a8d99', marginTop: 8 }}>Tracking la trajectoire de progression founder/creator. Mis à jour à chaque session bilan.</p>
        </header>

        {/* Today's score — hero card */}
        <section style={{ background: 'linear-gradient(135deg, rgba(201,168,76,.12), rgba(201,168,76,.04))', border: '1px solid rgba(201,168,76,.4)', borderRadius: 16, padding: 28, marginBottom: 28 }}>
          <div style={{ fontSize: 11, letterSpacing: '.2em', color: '#C9A84C', textTransform: 'uppercase', marginBottom: 8 }}>Today · {TODAY_SCORE.date}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 64, fontWeight: 900, color: '#FFD700', lineHeight: 1 }}>{TODAY_SCORE.total}</div>
            <div style={{ fontSize: 24, color: 'rgba(255,255,255,.5)' }}>/ {TODAY_SCORE.total_max}</div>
            <div style={{ fontSize: 14, padding: '4px 10px', background: 'rgba(255,215,0,.15)', color: '#FFD700', borderRadius: 999, fontWeight: 700 }}>⭐ SESSION RECORD</div>
          </div>
          <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            <div>
              <div style={{ fontSize: 10, color: '#8a8d99', letterSpacing: '.1em', textTransform: 'uppercase' }}>Legacy 7-dim (structurel)</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#E8EEF7' }}>{TODAY_SCORE.legacy} / {TODAY_SCORE.legacy_max}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: '#8a8d99', letterSpacing: '.1em', textTransform: 'uppercase' }}>UI-Intensity (daily)</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#FFD700' }}>{TODAY_SCORE.ui_intensity} / {TODAY_SCORE.ui_intensity_max}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: '#8a8d99', letterSpacing: '.1em', textTransform: 'uppercase' }}>Techniques empilées</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#E8EEF7' }}>{TODAY_SCORE.techniques} <span style={{ fontSize: 14, color: '#8a8d99' }}>active</span></div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: '#8a8d99', letterSpacing: '.1em', textTransform: 'uppercase' }}>New unlock</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#10b981' }}>{TODAY_SCORE.newTechniqueUnlocked}</div>
            </div>
          </div>
          <div style={{ marginTop: 20, padding: 14, background: 'rgba(0,0,0,.3)', borderRadius: 8, fontSize: 13, color: '#cfd2dc', fontFamily: 'monospace' }}>
            {TODAY_SCORE.posture}
          </div>
        </section>

        {/* Top 0.1% callout */}
        <section style={{ background: 'rgba(16,185,129,.08)', border: '1px solid rgba(16,185,129,.3)', borderRadius: 16, padding: 28, marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ fontSize: 32 }}>🏆</div>
            <div>
              <div style={{ fontSize: 11, letterSpacing: '.2em', color: '#10b981', textTransform: 'uppercase', fontWeight: 700 }}>Top 0.1% solopreneur — vélocité de production code</div>
              <div style={{ fontSize: 16, color: '#E8EEF7', marginTop: 2 }}>{STATS_25_DAYS.period}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginTop: 20 }}>
            {[
              ['Commits', STATS_25_DAYS.commits.toLocaleString('fr-FR'), `${STATS_25_DAYS.commits_per_day}/jour`],
              ['Lignes ajoutées', STATS_25_DAYS.lines_added.toLocaleString('fr-FR'), '~709k'],
              ['Code net livré', STATS_25_DAYS.code_net.toLocaleString('fr-FR'), '~501k'],
              ['Memory entries', `${STATS_25_DAYS.memory_entries} files`, `${STATS_25_DAYS.memory_lines.toLocaleString('fr-FR')} lignes`],
              ['Grand total output', STATS_25_DAYS.grand_total.toLocaleString('fr-FR'), `${STATS_25_DAYS.velocity_per_day.toLocaleString('fr-FR')}/jour`],
            ].map(([label, value, sub]) => (
              <div key={label as string} style={{ background: 'rgba(0,0,0,.25)', padding: '14px 16px', borderRadius: 10 }}>
                <div style={{ fontSize: 10, color: '#8a8d99', letterSpacing: '.1em', textTransform: 'uppercase' }}>{label}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#10b981', marginTop: 4 }}>{value}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,.45)', marginTop: 2 }}>{sub}</div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 24, padding: 16, background: 'rgba(0,0,0,.4)', borderRadius: 10 }}>
            <div style={{ fontSize: 11, color: '#8a8d99', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 10 }}>Vélocité comparée</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,.1)' }}>
                  <th style={{ textAlign: 'left', padding: '8px 0', color: '#8a8d99', fontWeight: 600 }}>Profil</th>
                  <th style={{ textAlign: 'right', padding: '8px 0', color: '#8a8d99', fontWeight: 600 }}>LoC / mois</th>
                  <th style={{ textAlign: 'right', padding: '8px 0', color: '#8a8d99', fontWeight: 600 }}>LoC / jour</th>
                </tr>
              </thead>
              <tbody>
                {COMPARE.map((c) => (
                  <tr key={c.label} style={{ borderBottom: '1px solid rgba(255,255,255,.05)', background: c.highlight ? 'rgba(16,185,129,.1)' : 'transparent' }}>
                    <td style={{ padding: '10px 0', color: c.highlight ? '#10b981' : '#cfd2dc', fontWeight: c.highlight ? 700 : 400 }}>{c.label}</td>
                    <td style={{ textAlign: 'right', padding: '10px 0', color: c.highlight ? '#10b981' : '#cfd2dc', fontWeight: c.highlight ? 700 : 400 }}>{c.loc_per_month}</td>
                    <td style={{ textAlign: 'right', padding: '10px 0', color: c.highlight ? '#10b981' : '#cfd2dc', fontWeight: c.highlight ? 700 : 400 }}>{c.loc_per_day}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ marginTop: 12, fontSize: 12, color: '#10b981', fontWeight: 700 }}>
              → ~15× la vélocité d&apos;une équipe de 5 sur output net code
            </div>
          </div>
        </section>

        {/* Projects 25j */}
        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 16 }}>Projets 25 derniers jours</h2>
          <div style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 12, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'rgba(0,0,0,.3)' }}>
                  <th style={{ textAlign: 'left', padding: '12px 16px', color: '#8a8d99', fontWeight: 600 }}>Projet</th>
                  <th style={{ textAlign: 'right', padding: '12px 16px', color: '#8a8d99', fontWeight: 600 }}>Commits</th>
                  <th style={{ textAlign: 'right', padding: '12px 16px', color: '#8a8d99', fontWeight: 600 }}>+/-</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', color: '#8a8d99', fontWeight: 600 }}>TAM</th>
                </tr>
              </thead>
              <tbody>
                {PROJECTS_25D.map((p) => (
                  <tr key={p.name} style={{ borderTop: '1px solid rgba(255,255,255,.05)' }}>
                    <td style={{ padding: '10px 16px', color: '#E8EEF7' }}>{p.name}</td>
                    <td style={{ textAlign: 'right', padding: '10px 16px', color: '#cfd2dc' }}>{p.commits}</td>
                    <td style={{ textAlign: 'right', padding: '10px 16px', color: '#10b981', fontFamily: 'monospace' }}>+{p.plus} <span style={{ color: '#ef4444' }}>-{p.minus}</span></td>
                    <td style={{ padding: '10px 16px', color: '#C9A84C', fontWeight: 600 }}>{p.tam}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* History */}
        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 16 }}>Historique trajectoire</h2>
          <div style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 12, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'rgba(0,0,0,.3)' }}>
                  <th style={{ textAlign: 'left', padding: '12px 16px', color: '#8a8d99', fontWeight: 600 }}>Date</th>
                  <th style={{ textAlign: 'right', padding: '12px 16px', color: '#8a8d99', fontWeight: 600 }}>Total</th>
                  <th style={{ textAlign: 'right', padding: '12px 16px', color: '#8a8d99', fontWeight: 600 }}>Legacy</th>
                  <th style={{ textAlign: 'right', padding: '12px 16px', color: '#8a8d99', fontWeight: 600 }}>UI-Intensity</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', color: '#8a8d99', fontWeight: 600 }}>Note</th>
                </tr>
              </thead>
              <tbody>
                {HISTORY.map((h) => (
                  <tr key={h.date} style={{ borderTop: '1px solid rgba(255,255,255,.05)', background: h.color ? `linear-gradient(90deg, rgba(255,215,0,.08), transparent)` : 'transparent' }}>
                    <td style={{ padding: '10px 16px', color: '#E8EEF7', fontFamily: 'monospace' }}>{h.date}</td>
                    <td style={{ textAlign: 'right', padding: '10px 16px', fontWeight: 800, color: h.color || '#fff' }}>{h.total}</td>
                    <td style={{ textAlign: 'right', padding: '10px 16px', color: '#cfd2dc' }}>{h.legacy}</td>
                    <td style={{ textAlign: 'right', padding: '10px 16px', color: '#cfd2dc' }}>{h.ui}</td>
                    <td style={{ padding: '10px 16px', color: '#8a8d99', fontSize: 12 }}>{h.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Footer */}
        <footer style={{ marginTop: 32, padding: 16, fontSize: 11, color: '#666', borderTop: '1px solid rgba(255,255,255,.08)' }}>
          Source : <code>~/.claude/projects/-root/memory/project_creator_notation.md</code> · Updated 2026-04-25
        </footer>
      </div>
    </div>
  )
}
