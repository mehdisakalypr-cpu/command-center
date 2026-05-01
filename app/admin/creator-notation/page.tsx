export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const metadata = { title: 'Creator Notation · Command Center' }

const TODAY_SCORE = {
  date: '2026-05-01',
  legacy: 98,
  legacy_max: 95,
  ui_intensity: 50,
  ui_intensity_max: 50,
  total: 148,
  total_max: 145,
  posture: '🔵 UI-M • 🟡 + 🍙 + 🟢 + 🛡 + 🧘 + 👊 + 💮 + 🌐 + 🕸️ + 🟦 Bukū Jutsu + 🧿 Ki Sense Amplifié + 🔬 Pod Research Swarm',
  newTechniqueUnlocked: '🟦 Bukū Jutsu + 🧿 Ki Sense Amplifié (3rd Eye) + 🔬 Pod Research Swarm (3 unlocks en 4j)',
  techniques: 12,
}

const STATS_30_DAYS = {
  period: '1er avril → 1er mai 2026 (30 jours)',
  commits: 2415,
  lines_added: 1625460,
  lines_deleted: 373430,
  code_net: 1252030,
  total_touched: 1998890,
  memory_entries: 226,
  memory_lines: 17390,
  grand_total: 2016280,
  velocity_per_day: 54182,
  commits_per_day: 80,
}

const STATS_BURST_4D = {
  period: '27 avril 22h → 1er mai 02h UTC (~4 jours, depuis dernière notation)',
  commits: 806,
  lines_added: 772373,
  lines_deleted: 104185,
  code_net: 668188,
  repos_touched: 56,
  velocity_per_day: 193094,
  commits_per_day: 194,
  vs_previous_record: '×4.6 vs ancien record 42 commits/jour',
}

const COMPARE = [
  { label: 'Dev senior solo classique', loc_per_month: '3-5k', loc_per_day: '~150' },
  { label: 'Équipe 5 devs', loc_per_month: '15-25k', loc_per_day: '~700' },
  { label: 'Mehdi solo + Claude (Opus/Sonnet) — 30j', loc_per_month: '~1.6M', loc_per_day: '~54k', highlight: true },
  { label: 'Mehdi burst depuis 27/04 (4j)', loc_per_month: '~5.8M proj.', loc_per_day: '~193k', highlight: true },
]

const PROJECTS_30D = [
  { name: 'FTG (feel-the-gap)', commits: 513, plus: '438k', minus: '158k', tam: '€1.5B' },
  { name: 'Command Center', commits: 345, plus: '158k', minus: '36k', tam: 'internal' },
  { name: 'OFA (site-factory)', commits: 221, plus: '74k', minus: '5k', tam: '€420M-470M' },
  { name: 'AICI', commits: 183, plus: '29k', minus: '11k', tam: '€99-499/mo SaaS' },
  { name: 'ANCF', commits: 120, plus: '21k', minus: '7k', tam: 'AI portfolio' },
  { name: 'AIPLB', commits: 117, plus: '20k', minus: '8k', tam: 'AI portfolio' },
  { name: 'CFAPI', commits: 67, plus: '17k', minus: '6k', tam: 'AI portfolio' },
  { name: 'PFAI', commits: 64, plus: '18k', minus: '3k', tam: 'AI portfolio' },
  { name: 'ARAI', commits: 64, plus: '18k', minus: '4k', tam: 'AI portfolio' },
  { name: 'IVAI', commits: 64, plus: '17k', minus: '4k', tam: 'AI portfolio' },
  { name: 'Optimus (Python)', commits: 46, plus: '18k', minus: '0.5k', tam: 'alpha' },
  { name: 'Estate', commits: 36, plus: '13k', minus: '2k', tam: '€960M' },
  { name: 'Gapup-Hub', commits: 32, plus: '12k', minus: '2k', tam: 'mosaic' },
  { name: 'AINF', commits: 20, plus: '15k', minus: '1k', tam: 'AI Wave-2' },
  { name: 'Consulting', commits: 19, plus: '18k', minus: '1k', tam: 'side' },
]

const PROJECTS_BURST_4D = [
  { name: 'FTG (feel-the-gap)', commits: 55, plus: '65k', minus: '31k' },
  { name: 'AICI', commits: 49, plus: '9k', minus: '1k' },
  { name: 'Gapup-Hub (NEW)', commits: 32, plus: '12k', minus: '2k' },
  { name: 'CFAPI', commits: 26, plus: '6k', minus: '3k' },
  { name: 'AIPLB', commits: 24, plus: '5k', minus: '2k' },
  { name: 'ARAI', commits: 23, plus: '7k', minus: '2k' },
  { name: 'ANCF', commits: 23, plus: '6k', minus: '1k' },
  { name: 'PFAI', commits: 22, plus: '6k', minus: '1k' },
  { name: 'IVAI', commits: 22, plus: '5k', minus: '2k' },
  { name: 'AINF', commits: 20, plus: '15k', minus: '1k' },
]

const TECHNIQUES_UNLOCKED_BURST = [
  {
    icon: '🟦',
    name: 'Bukū Jutsu (vol)',
    when: '2026-04-29 16h09 UTC',
    criterion: 'Indépendance hôte ≥7j consécutifs',
    proof: 'Machine a tourné autonomie totale 22/04 16h09 → 29/04 16h09 sans crash hôte. Memory entries continues 28/04 (perf unblock), 29/04 (SSO + auth audit + Vercel guard), 30/04 (Optimus 18 agents). Aucun reboot manuel forcé. Cron cycle complet maintenu (Hisoka harvest + AAM forge + Minato auto-push + portfolio-builder + demo-improver overnight).',
  },
  {
    icon: '🧿',
    name: 'Ki Sense Amplifié (Tenshinhan 3rd Eye)',
    when: '2026-04-29',
    criterion: 'Forecast anomalies AVANT qu\'elles arrivent (différent de Ki Sense qui détecte EN TEMPS RÉEL)',
    proof: 'Auth audit Senku-grade 24 SaaS découvre 6 vulnérabilités aici (no rate-limit, no CSRF, magic-link bypass, forgot-pwd, signup enum, idle session) AVANT incident production. Vercel guard pre-push v2 sur 25 repos prévient les deploys ERROR. 306 ERROR Vercel deploys forensic purgés. Resource sentinel 60s adapte concurrency AVANT saturation.',
  },
  {
    icon: '🔬',
    name: 'Pod Research Swarm',
    when: '2026-04-30',
    criterion: '≥10 agents recherche dispatchés en parallèle en 1 jour sur axes orthogonaux',
    proof: '18 agents Optimus dual-bot research : Wave 1 (5 axes orthogonaux académique/OSS/infra/échecs/alternatives) + Wave 2 (9 synthèse multiplier stack) + Wave 3 (4 top funds best practices). Pattern réutilisable documenté project_optimus_senku_research_2026_04_30.',
  },
]

const HISTORY = [
  { date: '2026-05-01', total: '148/145', legacy: '98/95', ui: '50/50', note: '⭐⭐⭐ NEW RECORD · 806 commits/4j (×4.6 record) sur 56 repos · 🟦 Bukū Jutsu + 🧿 3rd Eye + 🔬 Pod Swarm (3 unlocks)', techniques: 12, color: '#FFD700' },
  { date: '2026-04-27', total: '147/145', legacy: '98/95', ui: '49/50', note: 'Sprint 32 commits/4h portfolio · SSL 4 sites unblocked · 🕸️ Mosaic Architect unlock', techniques: 9, color: '#10b981' },
  { date: '2026-04-25', total: '145/145', legacy: '98/95', ui: '47/50', note: '⭐ session record · 🌐 Reconnaissance Network unlock', techniques: 8, color: '#FFD700' },
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
            <div style={{ fontSize: 14, padding: '4px 10px', background: 'rgba(255,215,0,.18)', color: '#FFD700', borderRadius: 999, fontWeight: 700 }}>⭐⭐⭐ NEW RECORD (+1) · 12 techniques</div>
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

        {/* Burst stats since last notation (4d) */}
        <section style={{ background: 'rgba(255,215,0,.08)', border: '1px solid rgba(255,215,0,.4)', borderRadius: 16, padding: 28, marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ fontSize: 32 }}>⚡</div>
            <div>
              <div style={{ fontSize: 11, letterSpacing: '.2em', color: '#FFD700', textTransform: 'uppercase', fontWeight: 700 }}>Burst depuis dernière notation · {STATS_BURST_4D.vs_previous_record}</div>
              <div style={{ fontSize: 16, color: '#E8EEF7', marginTop: 2 }}>{STATS_BURST_4D.period}</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginTop: 20 }}>
            {[
              ['Commits', STATS_BURST_4D.commits.toLocaleString('fr-FR'), `${STATS_BURST_4D.commits_per_day}/jour`],
              ['Lignes ajoutées', STATS_BURST_4D.lines_added.toLocaleString('fr-FR'), '~772k'],
              ['Code net livré', STATS_BURST_4D.code_net.toLocaleString('fr-FR'), '~668k'],
              ['Repos touchés', STATS_BURST_4D.repos_touched.toString(), '55 portfolio + CC'],
              ['Vélocité', `${STATS_BURST_4D.velocity_per_day.toLocaleString('fr-FR')}/jour`, `vs ancien 21k/j (×9)`],
            ].map(([label, value, sub]) => (
              <div key={label as string} style={{ background: 'rgba(0,0,0,.3)', padding: '14px 16px', borderRadius: 10 }}>
                <div style={{ fontSize: 10, color: '#8a8d99', letterSpacing: '.1em', textTransform: 'uppercase' }}>{label}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#FFD700', marginTop: 4 }}>{value}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,.45)', marginTop: 2 }}>{sub}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Techniques unlocked this burst (3 unlocks) */}
        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 16 }}>🆕 Techniques débloquées ce burst (3)</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
            {TECHNIQUES_UNLOCKED_BURST.map((t) => (
              <div key={t.name} style={{ background: 'rgba(16,185,129,.06)', border: '1px solid rgba(16,185,129,.3)', borderRadius: 12, padding: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={{ fontSize: 28 }}>{t.icon}</div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>{t.name}</div>
                    <div style={{ fontSize: 10, color: '#10b981', letterSpacing: '.1em', textTransform: 'uppercase' }}>Unlocked {t.when}</div>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: '#8a8d99', marginTop: 8, marginBottom: 4, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase' }}>Critère</div>
                <div style={{ fontSize: 13, color: '#cfd2dc', marginBottom: 10 }}>{t.criterion}</div>
                <div style={{ fontSize: 12, color: '#8a8d99', marginBottom: 4, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase' }}>Preuve factuelle</div>
                <div style={{ fontSize: 12.5, color: '#cfd2dc', lineHeight: 1.55 }}>{t.proof}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Top 0.1% callout — 30 jours cumulatif */}
        <section style={{ background: 'rgba(16,185,129,.08)', border: '1px solid rgba(16,185,129,.3)', borderRadius: 16, padding: 28, marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ fontSize: 32 }}>🏆</div>
            <div>
              <div style={{ fontSize: 11, letterSpacing: '.2em', color: '#10b981', textTransform: 'uppercase', fontWeight: 700 }}>Top 0.1% solopreneur — vélocité de production code</div>
              <div style={{ fontSize: 16, color: '#E8EEF7', marginTop: 2 }}>{STATS_30_DAYS.period}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginTop: 20 }}>
            {[
              ['Commits', STATS_30_DAYS.commits.toLocaleString('fr-FR'), `${STATS_30_DAYS.commits_per_day}/jour`],
              ['Lignes ajoutées', STATS_30_DAYS.lines_added.toLocaleString('fr-FR'), '~1.6M'],
              ['Code net livré', STATS_30_DAYS.code_net.toLocaleString('fr-FR'), '~1.25M'],
              ['Memory entries', `${STATS_30_DAYS.memory_entries} files`, `${STATS_30_DAYS.memory_lines.toLocaleString('fr-FR')} lignes`],
              ['Grand total touché', STATS_30_DAYS.grand_total.toLocaleString('fr-FR'), `${STATS_30_DAYS.velocity_per_day.toLocaleString('fr-FR')}/jour`],
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

        {/* Projets — Burst 4 jours */}
        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 16 }}>Top projets · Burst 4 jours (depuis 27/04)</h2>
          <div style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,215,0,.18)', borderRadius: 12, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'rgba(0,0,0,.3)' }}>
                  <th style={{ textAlign: 'left', padding: '12px 16px', color: '#8a8d99', fontWeight: 600 }}>Projet</th>
                  <th style={{ textAlign: 'right', padding: '12px 16px', color: '#8a8d99', fontWeight: 600 }}>Commits</th>
                  <th style={{ textAlign: 'right', padding: '12px 16px', color: '#8a8d99', fontWeight: 600 }}>+/-</th>
                </tr>
              </thead>
              <tbody>
                {PROJECTS_BURST_4D.map((p) => (
                  <tr key={p.name} style={{ borderTop: '1px solid rgba(255,255,255,.05)' }}>
                    <td style={{ padding: '10px 16px', color: '#E8EEF7' }}>{p.name}</td>
                    <td style={{ textAlign: 'right', padding: '10px 16px', color: '#FFD700', fontWeight: 700 }}>{p.commits}</td>
                    <td style={{ textAlign: 'right', padding: '10px 16px', color: '#10b981', fontFamily: 'monospace' }}>+{p.plus} <span style={{ color: '#ef4444' }}>-{p.minus}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Projets — 30 jours cumulatif */}
        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 16 }}>Top projets · 30 jours cumulatif (1er avril → 1er mai)</h2>
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
                {PROJECTS_30D.map((p) => (
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
          Source : <code>~/.claude/projects/-root/memory/project_creator_notation.md</code> · Updated 2026-05-01
        </footer>
      </div>
    </div>
  )
}
