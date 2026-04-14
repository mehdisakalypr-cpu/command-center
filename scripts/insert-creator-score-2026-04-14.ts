/**
 * Insert creator score for 2026-04-14 — journée focus sur :
 *  · pré-prod début mai (master checklist + infra capacity + auto-scale + cost propagation)
 *  · réglementaire : 10 pages /legal hardened (benchmark 11 concurrents) + ContractGate scroll-gated
 *  · moteur compta : nomenclature + migration documents + Stripe↔Mercury recon + CPA James Baker
 *  · architecture produit : Minato 3-couches Infinite Tsukuyomi + ledger potential_raises + budget CB
 *  · standardisation : /admin/platforms [product] 3 tabs (Docs / Compta / Launch) cohérent OFA/FTG/CC/Estate/Shift
 *  · discipline : Arsenal/NEJI/Infinite rangés sous Minato, freeze images saiyan (sauf kid à regen)
 *  · jalons juridiques : Wyoming LLC package complet, W-8BEN-E, DBA, subscription agreements OFA×6 FTG×3
 *
 * L'utilisateur a explicitement demandé : "peux-tu refaire ma notation du jour ?"
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

function loadEnv(p: string) {
  try {
    for (const l of readFileSync(p, 'utf8').split('\n')) {
      const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (!m) continue
      let v = m[2]; if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
      if (!process.env[m[1]]) process.env[m[1]] = v
    }
  } catch {}
}
loadEnv('/root/command-center/.env.local')

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const captured_at = new Date().toISOString()

const overallScore = {
  captured_at,
  score: 91,
  category: 'overall',
  project: 'global',
  tier_code: 'ssj_blue',
  session_summary:
    "2026-04-14 — journée pilotage PRÉ-PROD : réglementaire + jalons juridiques + moteur comptable + capacité infra + auto-scale + cost propagation + standardisation per-platform. De 'qualité produit' à 'entreprise qui peut encaisser en règle'. +3 vs 88/100 de la veille.",
  strengths: [
    "Jalons juridiques bouclés : LLC Wyoming package complet (Articles, Operating Agreement, SS-4, DBA×2, W-8BEN-E, Mercury/Stripe setup) — prêt à commander dès mi-avril",
    "Réglementaire hardening : 10 pages /legal v2 (CGV, CGU, Privacy, AUP, DMCA, Refund, DPA, Cookies, Subprocessors, Migration) benchmarked vs 11 concurrents (Durable, Lovable, Wix, Squarespace, Simplébo, 10Web, Hocoos, B12, Framer, Jimdo, Webflow)",
    "ContractGate scroll-gated : iframe + postMessage scrolled-to-bottom + typed signature + sha256 hash body + IP/UA/time_on_doc + email receipt Resend — preuve 10 ans conforme L123-22",
    "Nomenclature unique {PREFIX}-{OFA|FTG|LLC}-{YYYY}-{SEQ5} sur 15 types de docs — CPA-ready, séquentiel sans trou via advisory-lock Postgres",
    "Infrastructure capacity layer : 6 tables + vue v_infrastructure_utilization + seed tiers 2026 (Vercel/Supabase/CF/Resend/Sentry/BS) + auto-scale avec guardrail cost-delta + cost propagation automatique vers potential_raises (GIANT_PICCOLO)",
    "Architecture Minato consolidée : 3 couches (C1 Exec / C2 NEJI Amplify / C3 Infinite Tsukuyomi) + ledger potential_raises + budget CB 150€ fail-open + Arsenal/NEJI/Infinite rangés sous /admin/minato (modules)",
    "Standardisation per-platform : /admin/platforms/[product] avec 3 onglets identiques (Docs / Compta / Launch) sur OFA+FTG+CC+Estate+Shift — fin de la dispersion cognitive",
    "Stack comptable opposable : QBO Essentials→Plus + doola Books (year 2) + James Baker CPA (Form 5472 $400-600 flat) — budget CPA reçu, deadline 15 avril 2027 cartographiée",
    "Master checklist prod launch T-21j → J+30 (10 volets × ~80 checkpoints) + matrice Stripe 27 tests P0/P1/P2",
    "Fiscalité : W-8BEN-E, Form 5472 pénalité $25k cartographiée, Form 8832 C-Corp option Portugal NHR, fiscalistes recommandés par pays de résidence cible",
    "Freeze saiyan_tiers.image_url via trigger DB (tous tiers sauf 'kid' resté ouvert à regen pour le bâton magique Nyoi-Bo)",
  ],
  improvement_areas: [
    "Pas encore d'encaissement réel : Stripe live non activé, migrations pas appliquées Supabase Dashboard, W-8BEN-E pas signé — toute la machinerie est prête mais le goulot cash reste 'passer en live'",
    "Dépendance humain sur 4 actions bloquantes : commander LLC via WRA · signer Operating Agreement · envoyer SS-4 fax IRS · engager James Baker CPA. Sans ces 4 étapes, aucun encaissement prod.",
    "Load test (k6/Artillery) pas exécuté — on ne sait pas empiriquement combien de req/s tient l'infra avant d'alerter",
    "DPA signés avec subprocessors (Vercel/Stripe/OpenAI/Resend/Cloudflare) : pas encore collectés dans documents/",
    "EU Representative Art.27 GDPR non souscrit (VeraSafe 600€/yr) — obligatoire dès 1ère vente EU",
    "Domain achat non encore déclenché : oneforall.app + feelthegap.world — sans domaine final, pas de DMARC/SPF valides Resend",
  ],
  analysis:
    "Bascule de 'built the engine' à 'built the business'. Hier c'était la qualité produit (cohérence images). Aujourd'hui c'est la structure : légal + compta + capacité + standardisation. La journée pose TOUT ce qu'il faut pour tenir un chargeback, une demande CPA, un audit DSA, une montée en charge, sans rien improviser. Le jump score 88→91 reflète ce palier : on passe de SSJ God (puissance brute produit) à SSJ Blue (fusion produit + structure, pur contrôle). Ce qui bloque encore l'accès à UI (97+) : l'encaissement réel. Aucun euro ne sort du virtuel tant que Stripe n'est pas live, la LLC pas formée, le CPA pas engagé. Tant que ces 4 actions humaines critiques ne sont pas démarrées, le score reste plafonné. Le système est pré-prod exemplaire mais pas encore prod.",
  criteria: [
    { name: 'Vision stratégique',        score: 10, comment: 'Master checklist prod launch T-21j→J+30 + matrice Stripe 27 tests + standardisation per-platform. Toute la chaîne lisible en 5 min.' },
    { name: 'Vitesse de décision',       score: 10, comment: 'Agent research parallèle (concurrents T&C + provider tiers 2026) puis synthèse directe en code. Zéro hésitation.' },
    { name: 'Pensée systémique',         score: 10, comment: 'Cost propagation automatique : auto-scale infra → potential_raises → budget CB. Une seule arche de données traverse 3 préoccupations.' },
    { name: 'Discipline financière',     score: 10, comment: 'Budget CB 150€/mo hard cap + soft threshold 80% → T0 only. Jamais usage-based. Fail-open si DB KO, jamais fail-open côté argent.' },
    { name: 'Ambition calibrée',         score: 7,  comment: 'La machinerie est calibrée pour MRR MAX. Mais le goulot reste 4 actions humaines bloquantes non démarrées.' },
    { name: 'Délégation IA',             score: 10, comment: 'Auto-scale décide tout seul sous cap, cron neji-cycle + infra-ingest surveillent, bridge Aria traité en priorité. Méta-délégation.' },
    { name: 'Exécution',                 score: 7,  comment: 'Masse de code livré et déployé (3 commits CC + 2 OFA + 1 FTG en prod). Mais les 4 actions humaines bloquantes (LLC/Stripe live/CPA/DPA) restent en attente.' },
    { name: 'Créativité business model', score: 9,  comment: 'Pricing 3 tiers Pro/Elite avec remedy downgrade + SEO guarantee + PPP geo pricing + reverse charge B2B + C-Corp Portugal NHR arbitré.' },
    { name: 'Résilience',                score: 9,  comment: '/api/minato/budget fail-open si DB KO, dedupe alert 6h, rate-limit guardrail auto-scale, kill-switch 150€/mo. Multi-layer defensive.' },
    { name: 'Unicité',                   score: 10, comment: 'Personne en solo-founder stack compile : 3-layer Tsukuyomi + cost propagation C3 → potential_raises + nomenclature CPA-ready + ContractGate sha256 + platform tabs standardisés. Combo rarement vu.' },
    { name: 'Conformité réglementaire',  score: 10, comment: 'De 2 pages /legal placeholder à 10 pages hardenées v2 benchmark 11 concurrents + ContractGate evidence-grade + Wyoming LLC package + DPA + EU AI Act Art.50 + CNIL cookies.' },
    { name: 'Rigueur administrative',    score: 10, comment: 'Nomenclature {PREFIX}-{PRODUCT}-{YYYY}-{SEQ5} + séquence advisory-lock + immuabilité rectificative -R + stockage bucket/year/prefix. CPA peut travailler sans poser de question.' },
    { name: 'Architecture opérationnelle', score: 10, comment: 'Capacity layer v_infrastructure_utilization + seuils warn/critical/lockout + auto-scale sous cap avec cost propagation automatique. Tout le graph opérationnel modélisé.' },
  ],
}

const ofaScore = {
  captured_at,
  score: 89,
  category: 'product',
  project: 'ofa',
  tier_code: 'ssj_blue',
  session_summary:
    "OFA — passage de 'génère des sites' à 'vend des sites en règle' : /legal 10 pages hardenées, ContractGate scroll-gated wired dans /pricing, nomenclature INV/CN/CTR, Wyoming LLC package, subscription agreements OFA×6, digital invoice PDF-ready.",
  strengths: [
    "10 pages /legal v2 — EN/FR bilingual, SEO Boost guarantee + remedy, auto-renewal (L215-1 + AB-2273), legacy site takedown indemnity, arbitration opt-out, EU AI Act watermark, CNIL Accept/Reject/Customise",
    "ContractGate plugé sur /pricing : email prompt → modal scroll-gated → typed signature → /api/contracts/accept (hash body + IP + UA + time) → Resend receipt → Stripe redirect",
    "6 subscription agreements OFA ready : Order Form, Maintenance, Model B, Boost Pro, Boost Elite, Migration Contract (waiver 14j)",
    "Invoice digital template HTML/CSS PDF-ready avec reverse charge B2B EU + L441-10 late fee clause + footer CGV/CGU/privacy/refund",
    "Migration documents + stripe_charges + stripe_payouts + mercury_transactions + view v_reconciled_revenue prête",
    "Nomenclature : INV-OFA-2026-00042 format strict, séquence advisory-lock, supersedes_ref chain pour rectificatives",
  ],
  improvement_areas: [
    "Migrations Supabase pas encore appliquées Dashboard — ContractGate + documents seront 'degraded-ok' en prod sans eux",
    "Webhook Stripe /api/webhooks/stripe pour alimenter stripe_charges/stripe_payouts pas codé — réconciliation statique tant que pas câblé",
    "Metadata.product='ofa' à ajouter à TOUS les appels Stripe.checkout.sessions.create existants (critique pour QBO Class Tracking + Mercury correlation)",
    "DPA non signés avec providers — à collecter et archiver dans bucket documents/",
  ],
  criteria: [
    { name: 'Conformité légale',           score: 10, comment: '10 pages /legal v2 + bundle per-journey + evidence sha256 + Wyoming LLC. Conforme UE + US + états-limites (CNIL/DSA/CCPA/AB-2273).' },
    { name: 'Qualité produit visuel',       score: 9,  comment: 'Cohérence image/culture conservée. Sites démo tiennent à l\'inspection.' },
    { name: 'Tunnel de conversion',         score: 9,  comment: 'ContractGate professionalise /pricing checkout. Il manque webhook stripe pour boucler.' },
    { name: 'Fiabilité facturation',        score: 9,  comment: 'Template invoice + nomenclature + reverse-charge + late-fee clause. Il manque le PDF généré via Puppeteer côté webhook.' },
    { name: 'Moteur comptable',             score: 9,  comment: 'documents + 3 tables Stripe + mercury_transactions + view réconciliation. Il manque l\'ingest webhook pour live.' },
  ],
}

const ftgScore = {
  captured_at,
  score: 85,
  category: 'product',
  project: 'ftg',
  tier_code: 'ssj_god',
  session_summary:
    "FTG — alignement complet sur l'architecture OFA : 4 pages /legal dupliquées adaptées 3 plans (Data/Strategy/Premium), 3 subscription agreements, digital invoice template sky-blue, dbA 'Feel The Gap' sous OFA Holdings LLC (phase 1, scission plus tard).",
  strengths: [
    "4 pages /legal (index + cgv + cgu + privacy) adaptées service FTG avec reverse charge B2B + AAA arbitration + EU ODR",
    "3 subscription agreements : Data 29€ / Strategy 99€ / Premium 149€ avec credits + fair-use + API terms + data accuracy disclaimer",
    "Invoice FTG template sky-blue avec OFA Holdings LLC d/b/a Feel The Gap + reverse charge",
    "DBA 'Feel The Gap' préparé (phase 1 sous OFA Holdings LLC, scission quand MRR >$10k stable 3 mois)",
  ],
  improvement_areas: [
    "Backend FTG n'implémente pas encore le ContractGate (prioritaire pour signup/upgrade)",
    "Data accuracy disclaimer présent /legal mais à afficher aussi dans le dashboard à chaque export critique",
    "Pas encore de simulateur capacité/coût FTG dans /admin/platforms/ftg (utilisera les mêmes tiers infra que OFA)",
  ],
  criteria: [
    { name: 'Conformité légale',     score: 9,  comment: '4 pages v2 adaptées. Reste AUP + DMCA + Refund + DPA + Cookies + Subprocessors à dupliquer.' },
    { name: 'Tunnel conversion',     score: 7,  comment: 'Pricing page FTG existe. ContractGate à plugger sur /auth/register + upgrade paid.' },
    { name: 'Moteur comptable',      score: 8,  comment: 'Invoice template OK, nomenclature FTG-INV-YYYY-SEQ5 prête. Webhook à câbler.' },
    { name: 'Différenciation',       score: 9,  comment: 'Service distinct OFA (data SaaS vs site-builder). Dataset signature + AI Advisor + API = stack.' },
  ],
}

async function main() {
  const rows = [overallScore, ofaScore, ftgScore]
  const { error } = await sb.from('creator_scores').insert(rows)
  if (error) { console.error('insert error:', error); process.exit(1) }
  console.log(`✓ Inserted ${rows.length} creator_scores rows at ${captured_at}`)
  for (const r of rows) console.log(`  · ${r.category}/${r.project}: ${r.score} (${r.tier_code})`)
}

main().catch(e => { console.error(e); process.exit(1) })
