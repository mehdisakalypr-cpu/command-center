'use client'

/**
 * /admin/llc — Saga Ventures LLC action plan (Shaka refactor 2026-04-21)
 *
 * Source canonique : Sanctuary Trust architecture memory + les 3 docs
 * /root/llc-setup/saga-ventures/{form-ss4-line-by-line,mercury-onboarding-checklist,ip-license-agreement-template}.md
 *
 * Phases :
 *   1. now_249    — Day 1, $249 cash-out, LLC créée + EIN en cours
 *   2. after_ein  — ~J+14, Mercury + Stripe
 *   3. after_mercury — J+Mercury, DBAs + operations
 *   4. month_2_6  — phase 2 fiscale (IP License, C-Corp option)
 *   5. annual     — routines obligatoires
 *   6. phase2_trust — quand MRR >$5k stable
 */

import { useState, useEffect } from 'react'

const C = {
  bg: '#0A1A2E', gold: '#C9A84C', text: '#E8E0D0',
  muted: '#9BA8B8', dim: '#5A6A7A', green: '#10B981',
  purple: '#A78BFA', blue: '#3B82F6', red: '#EF4444', amber: '#F59E0B',
}

type Phase = 'now_249' | 'after_ein' | 'after_mercury' | 'month_2_6' | 'annual' | 'phase2_trust' | 'defer'

type LlcAction = {
  id: string
  phase: Phase
  title: string
  detail?: string
  link?: string
  linkLabel?: string
  cost?: string
  risk?: string
  doc?: string       // chemin vers doc local (/root/llc-setup/...)
}

const PHASES: { key: Phase; label: string; color: string; desc: string }[] = [
  { key: 'now_249', label: '🚀 Day 1 — $249 cash-out', color: C.gold, desc: 'Filing LLC + state fee + EIN. Y1 RA inclus.' },
  { key: 'after_ein', label: '📬 Dès EIN reçu (J+EIN)', color: C.blue, desc: 'Mercury ouvert → cartes virtuelles → Stripe configuré.' },
  { key: 'after_mercury', label: '🏦 Post-Mercury opérationnel', color: C.purple, desc: 'Cloisonnement cartes, DBAs, premier revenu.' },
  { key: 'month_2_6', label: '📜 Mois 2-6 — optimisation fiscale', color: C.amber, desc: 'IP License + C-Corp election (si Portugal NHR confirmé).' },
  { key: 'annual', label: '📅 Obligations annuelles', color: C.red, desc: 'Form 5472 = $25 000 pénalité si oublié.' },
  { key: 'phase2_trust', label: '🏛️ Phase 2 — Trust (MRR >$5k)', color: C.green, desc: 'Sanctuary Trust : privacy + succession.' },
  { key: 'defer', label: '🧠 À arbitrer', color: C.muted, desc: 'Décisions à prendre avant action.' },
]

const ACTIONS: LlcAction[] = [
  // ─── NOW $249 ─────────────────────────────────────────────────────────
  {
    id: 'name-check', phase: 'now_249',
    title: 'Vérifier dispo du nom "Saga Ventures LLC" sur WY SOS',
    link: 'https://wyobiz.wyo.gov/Business/FilingSearch.aspx?SearchCriteria=Saga+Ventures',
    linkLabel: 'wyobiz.wyo.gov',
    cost: '$0',
    detail: 'Nom canonique validé 2026-04-21 (Bing + DuckDuckGo → clean). Alternative fallback : "Pope Holdings LLC".',
  },
  {
    id: 'wra-filing', phase: 'now_249',
    title: 'Filing LLC via Wyoming Registered Agent LLC',
    link: 'https://www.wyomingregisteredagent.com/',
    linkLabel: 'wyomingregisteredagent.com',
    cost: '$199 ($99 formation + $100 state)',
    detail: 'Business purpose : "SaaS / software services and consulting". Y1 Registered Agent GRATUIT dans le package. Output : Articles of Organization PDF en 24-48h.',
  },
  {
    id: 'operating-agreement', phase: 'now_249',
    title: 'Operating Agreement — signer (inclus WRA)',
    cost: '$0',
    detail: 'Single-member LLC par défaut. Gouvernance simple. PDF auto-généré par WRA post-filing.',
  },
  {
    id: 'ein-ss4', phase: 'now_249',
    title: 'Submit Form SS-4 pour EIN (4-6 sem fax, ou $50 via WRA)',
    cost: '$0 DIY ou $50 via WRA',
    risk: 'Ligne 7b = FOREIGN (majuscules). Délai fax 4-6 sem (BLOQUE Mercury/Stripe).',
    doc: '/root/llc-setup/saga-ventures/form-ss4-line-by-line.md',
    detail: 'Guide ligne-par-ligne dispo local. Options : A) fax DIY gratuit via FaxZero +1-855-641-6935 · B) WRA $50 (plus fiable) · C) IRS phone +1-267-941-1099 (EIN oral en 15 min).',
  },

  // ─── AFTER EIN ────────────────────────────────────────────────────────
  {
    id: 'mercury-apply', phase: 'after_ein',
    title: 'Application Mercury Bank (~20-30 min)',
    link: 'https://mercury.com/apply',
    linkLabel: 'mercury.com/apply',
    cost: '$0 (zéro frais, zéro minimum)',
    doc: '/root/llc-setup/saga-ventures/mercury-onboarding-checklist.md',
    risk: 'Ne PAS décrire "lead gen" ou "marketing agency" = refus fréquent. Dire "SaaS / software publishing".',
    detail: 'Checklist complète dispo local. Docs requis : Articles of Org + CP 575 EIN + passeport + proof of address personnel. Délai approbation 1-3j ouvrés (parfois 5-7j).',
  },
  {
    id: 'mercury-virtual-cards', phase: 'after_ein',
    title: 'Créer 5-10 cartes virtuelles dédiées (cloisonnement fournisseurs)',
    cost: '$0',
    detail: 'Une carte par fournisseur (Vercel, Supabase, OpenAI, Anthropic, Stripe fees, SaaS tools, Domains, Legal, Wildcard). Limites mensuelles personnalisées. Audit trail parfait pour CPA.',
  },
  {
    id: 'mercury-physical-card', phase: 'after_ein',
    title: 'Request carte physique Mercury (Visa debit, livraison France)',
    cost: '$0 (livraison FedEx Express incluse)',
    detail: 'Délai 10-14j ouvrés France. Fonctionne sans contact NFC + 3DS EU + retraits ATM (~1% frais convertisseur).',
  },
  {
    id: 'stripe-config', phase: 'after_ein',
    title: 'Stripe signup + W-8BEN-E signature (FTG + OFA)',
    link: 'https://dashboard.stripe.com',
    linkLabel: 'dashboard.stripe.com',
    cost: '$0',
    risk: 'Sans W-8BEN-E = retenue 30% automatique US. Renouveler tous les 3 ans.',
    detail: 'Country USA · LLC · EIN XX-XXXXXXX · Address RA Wyoming · Bank Mercury (ABA routing + account depuis dashboard Mercury). Stripe génère W-8BEN-E auto, signature electronique.',
  },

  // ─── AFTER MERCURY ─────────────────────────────────────────────────────
  {
    id: 'dba-ftg', phase: 'after_mercury',
    title: 'DBA "Feel The Gap" au WY SOS',
    link: 'https://wyobiz.wyo.gov/',
    cost: '$0-50',
    detail: 'Nom commercial public FTG sans entité séparée. Saga Ventures LLC porte le compte, FTG est le DBA.',
  },
  {
    id: 'dba-ofa', phase: 'after_mercury',
    title: 'DBA "One For All" au WY SOS',
    link: 'https://wyobiz.wyo.gov/',
    cost: '$0-50',
  },
  {
    id: 'dba-gapup', phase: 'after_mercury',
    title: 'DBA "GapUp" au WY SOS (domaine cold outreach)',
    link: 'https://wyobiz.wyo.gov/',
    cost: '$0-50',
    detail: 'Domaine gapup.io lié à Saga Ventures. Facturation et emails cold outreach sous cette marque.',
  },
  {
    id: 'stripe-mercury-payout', phase: 'after_mercury',
    title: 'Brancher Stripe payout → Mercury ACH (1-2j validation)',
    cost: '$0',
    detail: 'Dans Stripe Dashboard → Settings → Payouts → Add bank account (ABA Mercury). Premier payout test en 24-48h.',
  },
  {
    id: 'bookkeeping-simple', phase: 'after_mercury',
    title: 'Activer memo-required sur Mercury transactions ≥ $50',
    cost: '$0',
    detail: 'Settings Mercury → "Require memo on transactions ≥ $50". Audit trail CSV exportable auto pour CPA.',
  },

  // ─── MONTH 2-6 : FISCAL OPTIMIZATION ──────────────────────────────────
  {
    id: 'ip-license-draft', phase: 'month_2_6',
    title: 'Signer IP License Agreement (toi Licensor → LLC Licensee)',
    cost: '$0 self-draft · ~$200 review CPA',
    doc: '/root/llc-setup/saga-ventures/ip-license-agreement-template.md',
    detail: 'Template ready-to-sign dispo local. Royalty 5-15% Net Revenue, paiements trimestriels. Permet de sortir du cash propre vers comptes persos. Schedule A inventorie les IP (FTG + OFA + CC + Estate + Shift + Minato Arsenal + INPI + USCO).',
  },
  {
    id: 'c-corp-decision', phase: 'month_2_6',
    title: 'Décider C-Corp election (Form 8832) — deadline 75j post-formation',
    cost: '$0 filing + CPA advice $200-400',
    risk: 'Deadline stricte. Dépend du choix résidence finale (Portugal NHR ? Maroc ? France ?).',
    detail: 'C-Corp = 21% flat US mais dividendes étrangers 0% sous Portugal NHR. Disregarded = passthrough, mais revenus taxés à la résidence perso. Valider avec fiscaliste des 2 côtés.',
  },
  {
    id: 'cpa-onboard', phase: 'month_2_6',
    title: 'Mandate CPA non-résident (James Baker CPA en reco #1)',
    cost: '$500-800/an (Y1 mandate en mois 2-6)',
    detail: 'Alternatives : O&G Accounting, TaxHack / Skyler Vest. Responsabilités : Form 5472 + Form 1120 pro forma + W-8BEN-E renewals + conseil fiscal C-Corp vs disregarded. Ne PAS sous-traiter au RA (marges 2×).',
  },

  // ─── ANNUAL ───────────────────────────────────────────────────────────
  {
    id: 'form-5472', phase: 'annual',
    title: 'Form 5472 + pro forma 1120 — deadline 15 avril n+1',
    cost: '$500-800 (inclus CPA mandate)',
    risk: '⚠️ PÉNALITÉ $25 000 SI OUBLIÉ (par entité par an).',
    detail: 'Report transactions LLC ↔ foreign owner. Le CPA gère entièrement. Extension Form 7004 possible → octobre 2027 pour la 1ère année.',
  },
  {
    id: 'wy-annual-report', phase: 'annual',
    title: 'Wyoming Annual Report (date anniversaire formation)',
    cost: '$60 DIY ou inclus RA renewal',
    risk: 'Dissolution de la LLC si oublié 60j post-deadline.',
    detail: 'Pour Saga Ventures formée mai 2026 → due mai 2027.',
  },
  {
    id: 'ra-renewal', phase: 'annual',
    title: 'Renew Registered Agent (switch vers Northwest pour privacy max)',
    link: 'https://www.northwestregisteredagent.com/',
    linkLabel: 'northwestregisteredagent.com',
    cost: '$125/an',
    detail: 'Y1 RA gratuit via WRA package. À partir de Y2 : switch vers Northwest (meilleur privacy + meilleur service US). Transfert en 1 click.',
  },
  {
    id: 'w8ben-refresh', phase: 'annual',
    title: 'Refresh W-8BEN-E (tous les 3 ans)',
    cost: '$0',
    detail: 'Re-signature Stripe dashboard. Expiration auto 3 ans post-signature.',
  },
  {
    id: 'ip-royalty-q', phase: 'annual',
    title: 'Royalty payments trimestriels (31 mars / 30 juin / 30 sept / 31 déc)',
    cost: 'variable (5-15% Net Revenue)',
    detail: 'Issue quarterly royalty statement + wire Mercury → compte perso EUR (Wise Business si besoin conversion). Archivage PDF des statements pour CPA et CPA France.',
  },

  // ─── TRUST PHASE 2 ────────────────────────────────────────────────────
  {
    id: 'trust-formation', phase: 'phase2_trust',
    title: 'Form Sanctuary Trust (Wyoming DAPT irrévocable)',
    cost: '$1 500-3 000 setup',
    detail: 'Prestataires : Wyoming Trust & LLC Attorney (Jennifer Bailey) ou Cloud Peak Law. Trustee = toi + co-trustee avocat pro. Beneficiary = toi + futurs enfants. Amendment 1-page pour assigner Saga Ventures membership au trust.',
  },
  {
    id: 'trust-admin', phase: 'phase2_trust',
    title: 'Trust annual admin (filings + comptabilité trust)',
    cost: '$500-800/an',
  },
  {
    id: 'gold-saints-split', phase: 'phase2_trust',
    title: 'Filing Gold Saints LLCs au fur et à mesure',
    cost: '~$250/LLC formation · $685-985/an cruise chacune',
    detail: 'Déclencheur : produit ≥ $4k/mo MRR ($50k ARR). Mapping maison : Aries=FTG · Aldebaran=OFA · Aiolia=Shift · Shaka=Data/Analytics · Dohko=Legal · Milo=Security · Aiolos=Marketing · Shura=Premium · Camus=AI Labs · Aphrodite=Creative · Cancer=Estate.',
  },

  // ─── DEFER ────────────────────────────────────────────────────────────
  {
    id: 'residence-fiscale', phase: 'defer',
    title: 'Valider pays de résidence fiscale finale',
    detail: 'Portugal NHR (reco) : 0% dividendes étrangers 10 ans · Espagne Beckham : 6 ans limité · Maroc : ~30% standard · France : statu quo avec risque CFC. Décision impacte C-Corp vs disregarded.',
  },
  {
    id: 'royalty-rate', phase: 'defer',
    title: 'Fixer taux royalty IP License (5-15% Net Revenue)',
    detail: 'Start conservatif 5-10% pour Y1 (teste le flow). Peut être ajusté annuellement par amendment. Trop haut = risque audit IRS (transfer pricing abusif). Trop bas = cash bloqué dans LLC.',
  },
]

type Done = Record<string, boolean>

export default function LlcAdminPage() {
  const [done, setDone] = useState<Done>({})
  const [activePhase, setActivePhase] = useState<Phase | 'all'>('all')
  const [expandedDocs, setExpandedDocs] = useState<Record<string, boolean>>({})

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

  const now249Total = ACTIONS.filter(a => a.phase === 'now_249').length
  const now249Done = ACTIONS.filter(a => a.phase === 'now_249' && done[a.id]).length

  return (
    <div style={{ padding: 24, color: C.text, maxWidth: 1200, margin: '0 auto' }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: C.gold, margin: 0 }}>
          🇺🇸 Saga Ventures LLC — Plan d&apos;action complet
        </h1>
        <p style={{ color: C.muted, fontSize: '.9rem', margin: '8px 0 0' }}>
          <strong style={{ color: C.gold }}>$249 cash-out Day 1</strong> suffit à créer la structure + ouvrir Mercury + configurer Stripe + encaisser.
          Récurrent $685-985/an démarre à l&apos;anniversaire formation (mai 2027) — financé par Mercury revenues.
          Trust = phase 2 (MRR stable &gt;$5k).
        </p>

        {/* Expatriation gate — décision user 2026-04-21 */}
        <div style={{
          marginTop: 16,
          padding: '14px 18px',
          background: 'linear-gradient(135deg, rgba(239,68,68,.12), rgba(245,158,11,.08))',
          border: `1.5px solid ${C.red}`,
          borderRadius: 8,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span style={{ fontSize: 18 }}>🛑</span>
            <strong style={{ color: C.red, fontSize: '.9rem', letterSpacing: '.02em' }}>
              GATE D&apos;EXPATRIATION — ne rien déclencher avant
            </strong>
          </div>
          <div style={{ fontSize: '.8rem', color: C.text, lineHeight: 1.6 }}>
            Aucune action LLC (formation · EIN · Mercury · Stripe · IP License) n&apos;est lancée tant que
            l&apos;expatriation effective <strong>Portugal (NHR)</strong> ou <strong>Maroc</strong> n&apos;est pas validée.
            <div style={{ marginTop: 8, fontSize: '.75rem', color: C.muted }}>
              <strong>Pourquoi :</strong> file la LLC en résidence France = risque transfer pricing IRS + CFC art. 209 B France. Élection C-Corp (Form 8832, 75j stricts) doit coïncider avec résidence finale pour optimiser fiscalité (Portugal NHR = 0% dividendes étrangers 10 ans · Maroc standard ~30%). Créer maintenant = double impôt ou calendrier complexe.
            </div>
            <div style={{ marginTop: 8, fontSize: '.75rem', color: C.muted }}>
              <strong>Statut :</strong> checklist ci-dessous = <em>référence figée</em>, pas work-in-progress. Les 3 docs locaux (SS-4, Mercury, IP License) sont prêts à dégainer Day 1 post-expat.
            </div>
          </div>
        </div>

        <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ padding: 12, background: 'rgba(201,168,76,.06)', border: `1px solid ${C.gold}33`, borderRadius: 6 }}>
            <div style={{ fontSize: '.6rem', color: C.dim, textTransform: 'uppercase', letterSpacing: '.1em' }}>Progression totale</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
              <span style={{ fontSize: '1.6rem', fontWeight: 800, color: C.gold }}>{pct}%</span>
              <span style={{ fontSize: '.78rem', color: C.muted }}>{totalDone}/{ACTIONS.length} actions</span>
            </div>
            <div style={{ marginTop: 8, height: 6, background: 'rgba(255,255,255,.08)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: C.gold, transition: 'width .3s' }} />
            </div>
          </div>
          <div style={{ padding: 12, background: 'rgba(16,185,129,.06)', border: `1px solid ${C.green}33`, borderRadius: 6 }}>
            <div style={{ fontSize: '.6rem', color: C.dim, textTransform: 'uppercase', letterSpacing: '.1em' }}>Day 1 ($249)</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
              <span style={{ fontSize: '1.6rem', fontWeight: 800, color: C.green }}>{now249Done}/{now249Total}</span>
              <span style={{ fontSize: '.78rem', color: C.muted }}>bloquer cette phase d&apos;abord</span>
            </div>
            <div style={{ marginTop: 8, height: 6, background: 'rgba(255,255,255,.08)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ width: `${now249Total > 0 ? (now249Done / now249Total) * 100 : 0}%`, height: '100%', background: C.green, transition: 'width .3s' }} />
            </div>
          </div>
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
            fontFamily: 'inherit',
          }}
        >Toutes ({ACTIONS.length})</button>
        {PHASES.map(p => {
          const count = ACTIONS.filter(a => a.phase === p.key).length
          const phaseDone = ACTIONS.filter(a => a.phase === p.key && done[a.id]).length
          return (
            <button
              key={p.key}
              onClick={() => setActivePhase(p.key)}
              style={{
                padding: '6px 12px', borderRadius: 4, fontSize: '.8rem', cursor: 'pointer',
                background: activePhase === p.key ? p.color : 'transparent',
                color: activePhase === p.key ? C.bg : C.text,
                border: `1px solid ${p.color}`,
                fontFamily: 'inherit',
              }}
            >{p.label.split(' ').slice(0, 3).join(' ')} ({phaseDone}/{count})</button>
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
                  opacity: done[a.id] ? 0.65 : 1,
                }}>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer' }}>
                    <input type="checkbox" checked={!!done[a.id]} onChange={() => toggle(a.id)}
                      style={{ marginTop: 3, accentColor: phase.color }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '.9rem', fontWeight: 600, textDecoration: done[a.id] ? 'line-through' : 'none' }}>
                        {a.title}
                      </div>
                      {a.detail && <div style={{ fontSize: '.78rem', color: C.muted, marginTop: 4, lineHeight: 1.5 }}>{a.detail}</div>}
                      <div style={{ display: 'flex', gap: 12, marginTop: 6, fontSize: '.72rem', flexWrap: 'wrap' }}>
                        {a.cost && <span style={{ color: C.green }}>💰 {a.cost}</span>}
                        {a.risk && <span style={{ color: C.red }}>⚠️ {a.risk}</span>}
                        {a.link && (
                          <a href={a.link} target="_blank" rel="noreferrer" style={{ color: C.blue, textDecoration: 'none' }}>
                            🔗 {a.linkLabel || 'Ouvrir'}
                          </a>
                        )}
                        {a.doc && (
                          <button
                            onClick={(e) => { e.preventDefault(); setExpandedDocs(s => ({ ...s, [a.id]: !s[a.id] })) }}
                            style={{ background: 'transparent', border: 'none', color: C.amber, cursor: 'pointer', fontFamily: 'inherit', fontSize: '.72rem', padding: 0 }}
                          >
                            📄 {expandedDocs[a.id] ? 'Masquer' : 'Voir'} doc local
                          </button>
                        )}
                      </div>
                      {a.doc && expandedDocs[a.id] && (
                        <div style={{ marginTop: 8, padding: 10, background: 'rgba(245,158,11,.06)', border: `1px dashed ${C.amber}33`, borderRadius: 4, fontSize: '.7rem', color: C.muted, fontFamily: 'monospace' }}>
                          {a.doc}
                          <br />
                          <span style={{ color: C.dim, fontFamily: 'inherit' }}>(édité en VPS local, à lire côté terminal ou via Claude Code)</span>
                        </div>
                      )}
                    </div>
                  </label>
                </div>
              ))}
            </div>
          </section>
        )
      })}

      <footer style={{ marginTop: 32, padding: 16, background: C.bg, border: `1px dashed ${C.dim}`, borderRadius: 6, fontSize: '.8rem', color: C.muted }}>
        <div style={{ color: C.gold, fontWeight: 600, marginBottom: 6 }}>📚 Docs locaux (référence)</div>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 4 }}>
          <li><code style={{ color: C.amber }}>/root/llc-setup/saga-ventures/form-ss4-line-by-line.md</code> — Form SS-4 ligne par ligne (EIN)</li>
          <li><code style={{ color: C.amber }}>/root/llc-setup/saga-ventures/mercury-onboarding-checklist.md</code> — Mercury onboarding complet</li>
          <li><code style={{ color: C.amber }}>/root/llc-setup/saga-ventures/ip-license-agreement-template.md</code> — IP License ready-to-sign</li>
        </ul>
        <div style={{ marginTop: 10, color: C.dim, fontSize: '.75rem' }}>
          Source canonique : <code>project_sanctuary_trust_architecture.md</code> (memory) · refactor Shaka 2026-04-21.
        </div>
      </footer>
    </div>
  )
}
