'use client'

import { useState, useEffect } from 'react'

const C = {
  bg: '#0A1A2E', gold: '#C9A84C', text: '#E8E0D0',
  muted: '#9BA8B8', dim: '#5A6A7A', green: '#10B981',
  purple: '#A78BFA', blue: '#3B82F6', red: '#EF4444',
}

type Phase = 'urgent' | 'now' | 'after_ein' | 'after_mercury' | 'annual' | 'phase2_trust' | 'defer'

type LlcAction = {
  id: string
  phase: Phase
  title: string
  detail?: string
  link?: string
  cost?: string
  risk?: string
  blocker?: string
  doneLabel?: string
}

const PHASES: { key: Phase; label: string; color: string; desc: string }[] = [
  { key: 'urgent', label: '🚨 Avant expatriation France', color: C.red, desc: 'Exit tax + choix résidence — bloque tout le reste' },
  { key: 'now', label: '🚀 À faire maintenant', color: C.gold, desc: 'Étape 1 — commander la LLC + filer docs' },
  { key: 'after_ein', label: '📬 Une fois l\'EIN reçu (4-6 sem)', color: C.blue, desc: 'Ouvrir banque + DBA + Stripe' },
  { key: 'after_mercury', label: '🏦 Une fois Mercury ouvert', color: C.purple, desc: 'Brancher le business' },
  { key: 'annual', label: '📅 Obligations annuelles (NE PAS RATER)', color: C.red, desc: 'Form 5472 = $25k pénalité si oublié' },
  { key: 'phase2_trust', label: '🏛️ Phase 2 — Trust (quand MRR >$5k stable)', color: C.green, desc: 'Asset protection + privacy + succession' },
  { key: 'defer', label: '🧠 À clarifier / décider', color: C.muted, desc: 'Inputs manquants ou arbitrages en cours' },
]

const ACTIONS: LlcAction[] = [
  // URGENT — before France expat
  {
    id: 'france-exit-tax', phase: 'urgent',
    title: '🇫🇷 RDV fiscaliste France — check exit tax AVANT départ',
    cost: '€200-400 (1h consultation)',
    risk: 'Exit tax si plus-values latentes >€800k ou détention >50% sociétés',
    detail: 'Validation : DDFE (déclaration départ fiscale), comptes étranger à déclarer, sortie du régime français propre. Annuaire CFE ou plateforme fiscalitemax / Wemind / BNRC Avocats.',
  },
  {
    id: 'choose-residence', phase: 'urgent',
    title: '🌍 Décider résidence finale : Portugal NHR / Espagne Beckham / Maroc',
    detail: 'Reco préliminaire : Portugal NHR (IFICI) = 0% dividendes étrangers 10 ans + C-Corp LLC → ~21% total effectif. Espagne Beckham = 6 ans limité. Maroc = ~30% (pas de régime spécial).',
  },
  {
    id: 'portugal-fiscalist', phase: 'urgent',
    title: '🇵🇹 RDV fiscaliste Portugal (si NHR choisi) — Belion / Fresh Portugal / DMS Legal',
    cost: '€500-1500 setup + audit',
    detail: 'Valider éligibilité NHR/IFICI, stratégie C-Corp LLC, calendrier NIF + résidence (3-6 mois). Alternative Espagne : fiscaliste Beckham Law. Maroc : fiscaliste international Rabat/Casa.',
  },
  {
    id: 'c-corp-election', phase: 'urgent',
    title: '📝 Planifier élection C-Corp (Form 8832 dans les 75j formation LLC)',
    detail: 'Obligatoire si Portugal NHR choisi — sinon LLC disregarded = revenus remontent en activité perso et Portugal taxe ~28%. Le CPA non-résident gère le filing 8832.',
    risk: 'Deadline 75 jours stricts après formation LLC',
  },

  // NOW
  {
    id: 'name-check', phase: 'now',
    title: 'Vérifier dispo du nom LLC (OFA Holdings LLC, ou autre)',
    link: 'https://wyobiz.wyo.gov/Business/FilingSearch.aspx',
    cost: '$0',
    detail: 'LLC unique qui porte FTG + OFA via DBAs (doing business as). Scission quand un business >$10k MRR stable 3 mois ou levée de fonds.',
  },
  {
    id: 'wra-order', phase: 'now',
    title: 'Commander formation LLC via Wyoming Registered Agent LLC',
    link: 'https://www.wyomingregisteredagent.com/',
    cost: '~$250 (99 formation + 100 state + 50 EIN)',
    detail: 'Reco #1 : transparent, pas d\'upsell, support US. Alternative #2 : Northwest Registered Agent ($39 + 100 state + 125 RA).',
  },
  {
    id: 'ein-request', phase: 'now',
    title: 'Demander l\'EIN (inclus dans commande WRA si option cochée)',
    cost: '$0 IRS, $50 via WRA',
    risk: 'Délai 4-6 sem IRS par fax international — BLOQUE Mercury, Stripe, tout',
    detail: 'Form SS-4. Sans SSN = fax obligatoire +1-855-641-6935. WRA le fait pour toi si option cochée.',
  },
  {
    id: 'operating-agreement', phase: 'now',
    title: 'Signer Operating Agreement (inclus WRA)',
    cost: '$0',
    detail: 'Single-member ou multi-member selon si seul propriétaire ou famille/associé. Définit répartition parts et gestion.',
  },

  // AFTER EIN
  {
    id: 'dba-ofa', phase: 'after_ein',
    title: 'Déclarer DBA "One For All" au WY SOS',
    cost: '$0-50',
    link: 'https://wyobiz.wyo.gov/',
    detail: 'Nom commercial public OFA sans entité séparée. Permet de facturer sous "One For All" tout en gardant la LLC holding unique.',
  },
  {
    id: 'dba-ftg', phase: 'after_ein',
    title: 'Déclarer DBA "Feel The Gap" au WY SOS',
    cost: '$0-50',
    link: 'https://wyobiz.wyo.gov/',
  },
  {
    id: 'mercury-apply', phase: 'after_ein',
    title: 'Ouvrir compte Mercury (banque US non-résident)',
    link: 'https://mercury.com/',
    cost: '$0',
    risk: 'Décrire "SaaS/software services", JAMAIS "lead gen" ou "marketing agency" = refus fréquent',
    detail: 'Prérequis : EIN + Operating Agreement + passeport + adresse RA. Délai 5-10j. Backup si refus : Relay Financial ou Wise Business.',
  },
  {
    id: 'w8ben-stripe-ofa', phase: 'after_ein',
    title: 'Signer W-8BEN-E sur Stripe OFA',
    link: 'https://dashboard.stripe.com/settings/tax',
    cost: '$0',
    risk: 'Sans W-8BEN-E = retenue 30% automatique sur chaque paiement',
    detail: 'Atteste non-résidence US de la LLC. Renouveler tous les 3 ans.',
  },
  {
    id: 'w8ben-stripe-ftg', phase: 'after_ein',
    title: 'Signer W-8BEN-E sur Stripe FTG',
    link: 'https://dashboard.stripe.com/settings/tax',
    cost: '$0',
  },

  // AFTER MERCURY
  {
    id: 'mercury-stripe-link', phase: 'after_mercury',
    title: 'Brancher Stripe → Mercury (payout account)',
    cost: '$0',
    detail: 'Configurer payout bank dans Stripe avec ACH Mercury. Délai 1-2j validation.',
  },
  {
    id: 'bookkeeping-setup', phase: 'after_mercury',
    title: 'Mettre en place comptabilité mensuelle simple',
    cost: '$0-30/mo',
    detail: 'Options : Wave (gratuit), Bench ($299/mo), ou Google Sheet simple. Minimum : catégoriser chaque tx Mercury mensuellement.',
  },
  {
    id: 'cpa-onboard', phase: 'after_mercury',
    title: 'Engager CPA non-résident pour Form 5472 (deadline 15 avril n+1)',
    cost: '$400-800/an',
    detail: 'Reco : James Baker CPA, O&G Accounting, TaxHack/Skyler Vest. Onboard dès novembre pour l\'année en cours.',
  },

  // ANNUAL
  {
    id: 'form-5472', phase: 'annual',
    title: 'Form 5472 + pro forma 1120 (15 avril chaque année)',
    cost: '$400-800 CPA',
    risk: '⚠️ PÉNALITÉ $25 000 SI OUBLIÉ',
    detail: 'Obligation pour toute LLC avec >= 1 propriétaire étranger. Le CPA non-résident gère.',
  },
  {
    id: 'wy-annual-report', phase: 'annual',
    title: 'WY Annual Report (date anniversaire formation)',
    cost: '$60 DIY ou inclus RA',
    risk: 'Dissolution de la LLC si oublié',
    detail: 'Renouveler Registered Agent en même temps ($125/an).',
  },
  {
    id: 'w8ben-refresh', phase: 'annual',
    title: 'Refresh W-8BEN-E (tous les 3 ans)',
    cost: '$0',
  },
  {
    id: 'fiscal-res-declaration', phase: 'annual',
    title: 'Déclarer revenus LLC dans ta juridiction fiscale (résidence)',
    cost: 'variable selon pays',
    risk: 'Non-déclaration = risque redressement + pénalités dans ton pays',
    detail: 'France : PFU 30% ou barème, vigilance CFC art. 209 B. Afrique/autre : consulter fiscaliste local.',
  },

  // TRUST PHASE 2
  {
    id: 'trust-formation', phase: 'phase2_trust',
    title: 'Former Wyoming Dynasty Trust irrévocable (propriétaire 100% LLC)',
    cost: '$1500-3000 setup',
    detail: 'Reco : Wyoming Trust & LLC Attorney (Jennifer Bailey) ou Cloud Peak Law. Avantages : privacy LLC, asset protection, succession sans probate, durée perpétuelle WY.',
  },
  {
    id: 'trust-admin', phase: 'phase2_trust',
    title: 'Admin annuelle trust',
    cost: '$500-800/an',
  },
  {
    id: 'llc-split', phase: 'phase2_trust',
    title: 'Scinder en 2 LLC séparées FTG + OFA (si seuil atteint)',
    cost: '~$250 formation + transfer docs',
    detail: 'Déclencheurs : un business >$10k MRR stable 3 mois, levée fonds sur un seul, profils risk divergents.',
  },

  // DEFER / TO CLARIFY
  {
    id: 'residence-fiscale', phase: 'defer',
    title: '⚠️ Préciser pays de résidence fiscale',
    detail: 'Nécessaire pour adapter stratégie fiscale côté ta résidence (France / Sénégal / Côte d\'Ivoire / Maroc / autre). Impact sur CFC rules, conventions fiscales.',
  },
  {
    id: 'llc-name', phase: 'defer',
    title: 'Choisir nom LLC définitif',
    detail: 'Options : "OFA Holdings LLC" (neutre, évolutif), "Sakaly Ventures LLC" (famille), ou autre. Vérif dispo puis commande.',
  },
  {
    id: 'members-structure', phase: 'defer',
    title: 'Décider single-member vs multi-member LLC',
    detail: 'Single = simplification fiscale (disregarded entity). Multi = plusieurs propriétaires (famille, associé) → partnership taxation. Single recommandé par défaut.',
  },
]

type Done = Record<string, boolean>

export default function LlcAdminPage() {
  const [done, setDone] = useState<Done>({})
  const [activePhase, setActivePhase] = useState<Phase | 'all'>('all')

  useEffect(() => {
    try { setDone(JSON.parse(localStorage.getItem('llcActionsDone') || '{}')) } catch {}
  }, [])

  function toggle(id: string) {
    const next = { ...done, [id]: !done[id] }
    setDone(next)
    localStorage.setItem('llcActionsDone', JSON.stringify(next))
  }

  const filtered = activePhase === 'all' ? ACTIONS : ACTIONS.filter(a => a.phase === activePhase)
  const totalDone = ACTIONS.filter(a => done[a.id]).length
  const pct = Math.round((totalDone / ACTIONS.length) * 100)

  return (
    <div style={{ padding: 24, color: C.text, maxWidth: 1200, margin: '0 auto' }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: C.gold, margin: 0 }}>
          🇺🇸 LLC Wyoming — Plan d&apos;action
        </h1>
        <p style={{ color: C.muted, fontSize: '.9rem', margin: '8px 0 0' }}>
          Une LLC unique porte FTG + OFA (via DBAs). Scission au seuil ($10k MRR stable ou levée fonds).
          Budget an 1 : ~$874 · année 2+ : ~$625/an (sans trust).
        </p>
        <div style={{ marginTop: 12, display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ flex: 1, height: 8, background: 'rgba(255,255,255,.1)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: C.gold, transition: 'width .3s' }} />
          </div>
          <span style={{ fontSize: '.85rem', color: C.gold, fontWeight: 700 }}>{totalDone}/{ACTIONS.length} ({pct}%)</span>
        </div>
      </header>

      <nav style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
        <button
          onClick={() => setActivePhase('all')}
          style={{
            padding: '6px 12px', borderRadius: 4, fontSize: '.8rem', cursor: 'pointer',
            background: activePhase === 'all' ? C.gold : 'transparent',
            color: activePhase === 'all' ? C.bg : C.text,
            border: `1px solid ${C.gold}`,
          }}
        >Toutes ({ACTIONS.length})</button>
        {PHASES.map(p => {
          const count = ACTIONS.filter(a => a.phase === p.key).length
          return (
            <button
              key={p.key}
              onClick={() => setActivePhase(p.key)}
              style={{
                padding: '6px 12px', borderRadius: 4, fontSize: '.8rem', cursor: 'pointer',
                background: activePhase === p.key ? p.color : 'transparent',
                color: activePhase === p.key ? C.bg : C.text,
                border: `1px solid ${p.color}`,
              }}
            >{p.label.split(' ').slice(0, 3).join(' ')} ({count})</button>
          )
        })}
      </nav>

      {PHASES.filter(p => activePhase === 'all' || p.key === activePhase).map(phase => {
        const items = filtered.filter(a => a.phase === phase.key)
        if (items.length === 0) return null
        return (
          <section key={phase.key} style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: phase.color, margin: '0 0 4px', borderLeft: `3px solid ${phase.color}`, paddingLeft: 10 }}>
              {phase.label}
            </h2>
            <p style={{ fontSize: '.8rem', color: C.dim, margin: '0 0 12px', paddingLeft: 13 }}>{phase.desc}</p>

            <div style={{ display: 'grid', gap: 8 }}>
              {items.map(a => (
                <div key={a.id} style={{
                  padding: 12, borderRadius: 6,
                  background: done[a.id] ? 'rgba(16,185,129,.08)' : C.bg,
                  border: `1px solid ${done[a.id] ? 'rgba(16,185,129,.3)' : 'rgba(255,255,255,.1)'}`,
                  opacity: done[a.id] ? 0.6 : 1,
                }}>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer' }}>
                    <input type="checkbox" checked={!!done[a.id]} onChange={() => toggle(a.id)}
                      style={{ marginTop: 3, accentColor: phase.color }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '.9rem', fontWeight: 600, textDecoration: done[a.id] ? 'line-through' : 'none' }}>
                        {a.title}
                      </div>
                      {a.detail && <div style={{ fontSize: '.78rem', color: C.muted, marginTop: 4 }}>{a.detail}</div>}
                      <div style={{ display: 'flex', gap: 12, marginTop: 6, fontSize: '.72rem', flexWrap: 'wrap' }}>
                        {a.cost && <span style={{ color: C.green }}>💰 {a.cost}</span>}
                        {a.risk && <span style={{ color: C.red }}>⚠️ {a.risk}</span>}
                        {a.blocker && <span style={{ color: C.purple }}>🚧 {a.blocker}</span>}
                        {a.link && <a href={a.link} target="_blank" rel="noreferrer" style={{ color: C.blue }}>🔗 Ouvrir</a>}
                      </div>
                    </div>
                  </label>
                </div>
              ))}
            </div>
          </section>
        )
      })}

      <footer style={{ marginTop: 32, padding: 16, background: C.bg, border: `1px dashed ${C.dim}`, borderRadius: 6, fontSize: '.8rem', color: C.muted }}>
        💡 <strong>À clarifier ensemble :</strong> pays de résidence fiscale · nom LLC final · structure single vs multi-member.
        Cette page est éditable à chaque changement de contexte (mémoire <code>project_llc_wyoming_strategy.md</code>).
      </footer>
    </div>
  )
}
