/**
 * Shared funnel config — used by /admin/crm-hub/leads.
 * Extracted 2026-04-21 (Shaka session) to DRY funnel definitions.
 *
 * ⚠ Divergence connue : `/admin/simulator/page.tsx` garde encore sa copie
 * locale de PRODUCT_DEFAULTS (2018 lignes, comments riches + rates ajustés
 * post-calibration 2026-04-21). Reconcile quand Funnel Registry v1 DB sera
 * en place (table `funnel_definitions`, source de vérité unique).
 *
 * Rates = hypothèses. DB config écrasera ces defaults en production.
 */

export type ProductKey = 'ofa' | 'ftg' | 'estate' | 'shiftdynamics' | 'cc' | 'all'

export type FunnelStage = { id: string; label: string; defaultRate: number }

export type ProductFunnel = {
  label: string
  avgMrrPerClient: number
  oneShotPrice: number
  oneShotMix: number
  funnel: FunnelStage[]
  agentsCapacity: { name: string; perDay: number }[]
}

export const PRODUCT_FUNNELS: Record<ProductKey, ProductFunnel> = {
  ofa: {
    label: 'One For All',
    avgMrrPerClient: 11.79,
    oneShotPrice: 149,
    oneShotMix: 0.82,
    funnel: [
      { id: 'siteAnalyzed',     label: 'Lead → site analysé',                  defaultRate: 0.95 },
      { id: 'uglyQualified',    label: 'Analysé → ugly ≥ 50 (pitch-worthy)',   defaultRate: 0.55 },
      { id: 'contactExtracted', label: 'Ugly → email/phone extrait',           defaultRate: 0.70 },
      { id: 'pitched',          label: 'Contact → pitch before/after',         defaultRate: 0.95 },
      { id: 'opened',           label: 'Pitché → ouvert (personnalisé)',       defaultRate: 0.55 },
      { id: 'responded',        label: 'Ouvert → réponse (ROI chiffré)',       defaultRate: 0.12 },
      { id: 'demo',             label: 'Réponse → preview 3 designs vue',      defaultRate: 0.55 },
      { id: 'paid',             label: 'Preview → achat 149€',                 defaultRate: 0.35 },
    ],
    agentsCapacity: [
      { name: 'website-scout',      perDay: 20000 },
      { name: 'screenshot-capture', perDay: 8000 },
      { name: 'lighthouse-audit',   perDay: 6000 },
      { name: 'seo-geo-audit',      perDay: 4000 },
      { name: 'contact-extractor',  perDay: 8000 },
      { name: 'site-generator',     perDay: 2000 },
      { name: 'pitcher',            perDay: 4000 },
    ],
  },
  ftg: {
    label: 'Feel The Gap',
    avgMrrPerClient: 76,
    oneShotPrice: 0,
    oneShotMix: 0,
    funnel: [
      { id: 'sourced',      label: 'Prospect sourcé',                              defaultRate: 1 },
      { id: 'enriched',     label: 'Sourcé → contact trouvé (max canaux)',         defaultRate: 0.60 },
      { id: 'outreached',   label: 'Contact → outreach envoyé',                    defaultRate: 0.92 },
      { id: 'responded',    label: 'Outreach → réponse (perso + ROI)',             defaultRate: 0.07 },
      { id: 'demo',         label: 'Réponse → parcours démo guidé',                defaultRate: 0.50 },
      { id: 'contentReady', label: 'Démo → parcours rempli (Eishi layer 1)',       defaultRate: 0.85 },
      { id: 'paid',         label: 'Contenu rempli → abonné (×2 vs vide)',         defaultRate: 0.28 },
    ],
    agentsCapacity: [
      { name: 'ftg-vc-scout',        perDay: 500 },
      { name: 'ftg-angel-scout',     perDay: 300 },
      { name: 'ftg-founder-scout',   perDay: 800 },
      { name: 'scout-osm-overpass',  perDay: 2000 },
      { name: 'contact-finder',      perDay: 1500 },
      { name: 'shisui-orchestrator', perDay: 1440 },
      { name: 'rock-lee-v2-videos',  perDay: 4320 },
      { name: 'eishi-base-content',  perDay: 2880 },
      { name: 'email-nurture',       perDay: 3000 },
      { name: 'outreach-engine',     perDay: 1200 },
    ],
  },
  estate: {
    label: 'The Estate',
    avgMrrPerClient: 199,
    oneShotPrice: 0,
    oneShotMix: 0,
    funnel: [
      { id: 'enriched',  label: 'Hôtel identifié → contact trouvé',   defaultRate: 0.40 },
      { id: 'pitched',   label: 'Contact → pitch envoyé',             defaultRate: 0.95 },
      { id: 'responded', label: 'Pitch → réponse',                    defaultRate: 0.10 },
      { id: 'demo',      label: 'Réponse → demo produit',             defaultRate: 0.50 },
      { id: 'paid',      label: 'Demo → licence signée',              defaultRate: 0.25 },
    ],
    agentsCapacity: [
      { name: 'hotel-scout',    perDay: 300 },
      { name: 'contact-finder', perDay: 500 },
      { name: 'demo-generator', perDay: 500 },
    ],
  },
  shiftdynamics: {
    label: 'Shift Dynamics',
    avgMrrPerClient: 2500,
    oneShotPrice: 0,
    oneShotMix: 0,
    funnel: [
      { id: 'enriched',  label: 'Entreprise cible → décideur trouvé', defaultRate: 0.30 },
      { id: 'pitched',   label: 'Décideur → LinkedIn/email envoyé',   defaultRate: 0.90 },
      { id: 'responded', label: 'Envoi → réponse',                    defaultRate: 0.05 },
      { id: 'demo',      label: 'Réponse → call découverte',          defaultRate: 0.60 },
      { id: 'paid',      label: 'Call → contrat signé',               defaultRate: 0.15 },
    ],
    agentsCapacity: [
      { name: 'enterprise-scout', perDay: 200 },
      { name: 'contact-finder',   perDay: 500 },
    ],
  },
  cc: {
    label: 'Command Center (interne)',
    avgMrrPerClient: 0,
    oneShotPrice: 0,
    oneShotMix: 0,
    funnel: [
      { id: 'usage',     label: 'Action déclenchée → succès',          defaultRate: 0.85 },
      { id: 'recurrent', label: 'Succès → réutilisation /sem',         defaultRate: 0.50 },
    ],
    agentsCapacity: [
      { name: 'aria-voice',         perDay: 200 },
      { name: 'metrics-collector',  perDay: 1440 },
      { name: 'session-logger',     perDay: 1000 },
    ],
  },
  all: {
    label: '🔀 Tous (portfolio cumulé)',
    avgMrrPerClient: 105,
    oneShotPrice: 149,
    oneShotMix: 0.30,
    funnel: [
      { id: 'sourced',    label: 'Prospect sourcé (tous canaux)',             defaultRate: 1 },
      { id: 'qualified',  label: 'Sourcé → qualifié (gap_match ou ugly)',     defaultRate: 0.55 },
      { id: 'contacted',  label: 'Qualifié → contact extrait',                defaultRate: 0.65 },
      { id: 'pitched',    label: 'Contact → pitch envoyé',                    defaultRate: 0.92 },
      { id: 'responded',  label: 'Pitch → réponse',                           defaultRate: 0.08 },
      { id: 'demo',       label: 'Réponse → demo/call',                       defaultRate: 0.50 },
      { id: 'paid',       label: 'Demo → paying customer',                    defaultRate: 0.25 },
    ],
    agentsCapacity: [
      { name: 'scouts-all',        perDay: 25000 },
      { name: 'contact-finders',   perDay: 10000 },
      { name: 'content-pipeline',  perDay: 2000 },
      { name: 'pitchers-all',      perDay: 7000 },
      { name: 'site-generators',   perDay: 2000 },
    ],
  },
}

export const PRODUCT_AGG_KEYS: ProductKey[] = ['ofa', 'ftg', 'estate', 'shiftdynamics']

/** Compute cumulative conversion from entry volume through funnel. */
export function computeStageVolumes(entryVolume: number, funnel: FunnelStage[]) {
  return funnel.reduce<{ id: string; label: string; volume: number; rate: number }[]>((acc, s, i) => {
    const prev = i === 0 ? entryVolume : acc[i - 1].volume
    acc.push({ id: s.id, label: s.label, volume: prev * s.defaultRate, rate: s.defaultRate })
    return acc
  }, [])
}

/** Total end-to-end conversion rate. */
export function funnelTotalConversion(funnel: FunnelStage[]): number {
  return funnel.reduce((acc, s) => acc * s.defaultRate, 1)
}
