/**
 * FTG Launch model — M1 projections post 15 mai 2026.
 * 3 scenarios × toggleable leviers + T0/T1 budget.
 * Pure functions — no env/DB access.
 */

export type ScenarioId = 'floor' | 'median' | 'high'

export interface ScenarioBase {
  id: ScenarioId
  label: string
  probability: number          // 0..1
  traffic: number              // unique visitors in M1
  signupConv: number           // % visits → signup
  paidConv: number             // % signup → paid
}

export const BASE_SCENARIOS: Record<ScenarioId, ScenarioBase> = {
  floor:  { id: 'floor',  label: 'Floor (garanti)',          probability: 0.85, traffic: 15_000,  signupConv: 0.04, paidConv: 0.05 },
  median: { id: 'median', label: 'Médian (objectif)',        probability: 0.50, traffic: 50_000,  signupConv: 0.05, paidConv: 0.07 },
  high:   { id: 'high',   label: 'High (infinite overshoot)', probability: 0.15, traffic: 150_000, signupConv: 0.06, paidConv: 0.10 },
}

// FTG tier pricing (€/mo)
export const FTG_PRICING = {
  data: 29,
  strategy: 99,
  premium: 149,
}

// Tier mix among paying clients (share of paid)
export const FTG_MIX = { data: 0.60, strategy: 0.30, premium: 0.10 }

export interface Lever {
  id: string
  label: string
  description: string
  enabled: boolean
  // multipliers applied on top of base
  trafficMult: number
  signupConvMult: number
  paidConvMult: number
  oneOffEur: number     // one-shot CA hors MRR boost
}

export const BASE_LEVERS: Lever[] = [
  {
    id: 'outreach_37k',
    label: 'Outreach 37K leads (mail + WhatsApp)',
    description: '3000 leads touchés / mo · 5% reply · 30% demo · 20% close',
    enabled: true,
    trafficMult: 1.0,
    signupConvMult: 1.0,
    paidConvMult: 1.35,
    oneOffEur: 3000,
  },
  {
    id: 'seo_300k',
    label: 'SEO Factory 300K pages',
    description: 'Indexation progressive · 5-15% indexé M1',
    enabled: true,
    trafficMult: 1.3,
    signupConvMult: 0.95,
    paidConvMult: 1.0,
    oneOffEur: 0,
  },
  {
    id: 'product_hunt',
    label: 'Product Hunt Launch Day 0',
    description: 'TOP 5 PoTD → 2-5K visites spike J0',
    enabled: true,
    trafficMult: 1.15,
    signupConvMult: 1.1,
    paidConvMult: 0.85,
    oneOffEur: 500,
  },
  {
    id: 'influencers',
    label: 'Influencers AI × 15 langues',
    description: '300 personas × 3 posts/jour, reach organique',
    enabled: true,
    trafficMult: 1.25,
    signupConvMult: 1.0,
    paidConvMult: 0.9,
    oneOffEur: 0,
  },
  {
    id: 'geo_pricing',
    label: 'Geo-pricing PPP 195 pays',
    description: 'Prix adaptés au pouvoir d\'achat local',
    enabled: true,
    trafficMult: 1.0,
    signupConvMult: 1.2,
    paidConvMult: 1.3,
    oneOffEur: 0,
  },
  {
    id: 'email_drip',
    label: 'Email drip D3/D7/D14/D30',
    description: 'Séquence 15 langues auto-activée au signup',
    enabled: true,
    trafficMult: 1.0,
    signupConvMult: 1.0,
    paidConvMult: 1.4,
    oneOffEur: 500,
  },
  {
    id: 'paid_ads',
    label: 'Google/Meta Ads (budget 500€)',
    description: 'Optionnel — CPC 1.5€ · conversion 3%',
    enabled: false,
    trafficMult: 1.2,
    signupConvMult: 1.0,
    paidConvMult: 1.0,
    oneOffEur: 0,
  },
  {
    id: 'enterprise_deal',
    label: '1 Enterprise deal J+20',
    description: 'CCI / Chambre agri / Université partenariat',
    enabled: false,
    trafficMult: 1.0,
    signupConvMult: 1.0,
    paidConvMult: 1.0,
    oneOffEur: 15000,
  },
]

export interface ComputedScenario {
  id: ScenarioId
  label: string
  probability: number
  traffic: number
  signups: number
  paid: number
  dataCustomers: number
  strategyCustomers: number
  premiumCustomers: number
  mrr: number
  oneOff: number
  caTotal: number
}

export function computeScenario(base: ScenarioBase, levers: Lever[]): ComputedScenario {
  const enabled = levers.filter((l) => l.enabled)
  const traffic = Math.round(base.traffic * enabled.reduce((a, l) => a * l.trafficMult, 1))
  const signupConv = base.signupConv * enabled.reduce((a, l) => a * l.signupConvMult, 1)
  const paidConv = base.paidConv * enabled.reduce((a, l) => a * l.paidConvMult, 1)

  const signups = Math.round(traffic * signupConv)
  const paid = Math.round(signups * paidConv)
  const dataCustomers = Math.round(paid * FTG_MIX.data)
  const strategyCustomers = Math.round(paid * FTG_MIX.strategy)
  const premiumCustomers = Math.round(paid * FTG_MIX.premium)
  const mrr = dataCustomers * FTG_PRICING.data + strategyCustomers * FTG_PRICING.strategy + premiumCustomers * FTG_PRICING.premium
  const oneOff = enabled.reduce((a, l) => a + l.oneOffEur, 0)
  const caTotal = mrr + oneOff

  return {
    id: base.id, label: base.label, probability: base.probability,
    traffic, signups, paid, dataCustomers, strategyCustomers, premiumCustomers, mrr, oneOff, caTotal,
  }
}

// Volume data targets for 15 mai
export interface VolumeTarget {
  table: string
  label: string
  current: number
  target: number
  agent: string
}

export const DEFAULT_VOLUME_TARGETS: VolumeTarget[] = [
  { table: 'commerce_leads',           label: 'Leads acheteurs',      current: 37041, target: 150000, agent: 'scout-runner + queue-scouts-expansion' },
  { table: 'opportunities',            label: 'Opportunités',         current:  7383, target:  30000, agent: 'opportunity-matrix' },
  { table: 'products_catalog',         label: 'Produits catalogue',   current: 10203, target:  25000, agent: 'product-enricher-10k' },
  { table: 'business_plans',           label: 'Business plans',       current:   385, target:   2500, agent: 'batch-enriched-plans' },
  { table: 'seo_pages',                label: 'SEO pages',            current:     0, target: 300000, agent: 'seo-factory' },
  { table: 'ai_influencer_personas',   label: 'Influenceurs IA',      current:   300, target:   1000, agent: 'influencer-factory' },
]

// Budget model
export interface BudgetRow {
  label: string
  tier: 'T0' | 'T1' | 'T1+'
  eurPerMonth: number
  trigger: string
}

export const BUDGET_MODEL: BudgetRow[] = [
  { label: 'Vercel Hobby',          tier: 'T0', eurPerMonth:  0, trigger: '≤100GB BW' },
  { label: 'Supabase Free',         tier: 'T0', eurPerMonth:  0, trigger: '≤500MB DB' },
  { label: 'Upstash Redis Free',    tier: 'T0', eurPerMonth:  0, trigger: '≤10K cmd/jour' },
  { label: 'Resend Free',           tier: 'T0', eurPerMonth:  0, trigger: '≤3000 emails/mo' },
  { label: 'Gemini 2.5 Flash free', tier: 'T0', eurPerMonth:  0, trigger: '80 rpm (4 keys × 20)' },
  { label: 'Groq free tier',        tier: 'T0', eurPerMonth:  0, trigger: '30 rpm llama-3.3' },
  { label: 'YouTube API free',      tier: 'T0', eurPerMonth:  0, trigger: '10K quota/jour' },
  { label: 'Cloudflare Turnstile',  tier: 'T0', eurPerMonth:  0, trigger: 'Illimité' },
  { label: 'Vercel Pro',            tier: 'T1', eurPerMonth: 20, trigger: 'Si >100GB BW' },
  { label: 'Supabase Pro',          tier: 'T1', eurPerMonth: 25, trigger: 'Si DB >500MB' },
  { label: 'Resend Pro',            tier: 'T1', eurPerMonth: 20, trigger: 'Si >3K emails/mo' },
  { label: 'Upstash PAYG',          tier: 'T1', eurPerMonth: 10, trigger: 'Si >10K cmd/jour' },
  { label: 'ElevenLabs TTS',        tier: 'T1+', eurPerMonth:  5, trigger: 'Voix tutoriels premium' },
  { label: 'Google/Meta Ads',       tier: 'T1+', eurPerMonth: 500, trigger: 'Si on active lever paid_ads' },
]

export function budgetTotal(tier: 'T0' | 'T1' | 'T1+' | 'all'): number {
  return BUDGET_MODEL
    .filter((r) => tier === 'all' || r.tier === tier || (tier === 'T1' && r.tier === 'T0') || (tier === 'T1+' && (r.tier === 'T0' || r.tier === 'T1')))
    .reduce((a, r) => a + r.eurPerMonth, 0)
}
