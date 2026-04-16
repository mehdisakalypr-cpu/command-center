import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

// Pricing mixes: how the paid base splits across tiers. The resulting avgMrr
// drives everything downstream. Keep these labels visible in the UI.
type PricingMix = { id: string; label: string; avgMrr: number; why: string }

// Per-product defaults (mirrors /admin/simulator/page.tsx). Keep in sync.
const PRODUCT_DEFAULTS: Record<string, {
  avgMrr: number
  pricingMixes: PricingMix[]
  funnel: { id: string; label: string; defaultRate: number }[]
  agentsCapacity: { name: string; perDay: number }[]
  maxByObjective: Record<string, number>
}> = {
  ofa: {
    // Modernization pivot (2026-04-14): we now target businesses that ALREADY
    // have a website and pitch a free before/after. TAM jumps from ~1M scouted
    // contacts to ~10M+ globally scrapable sites. Contact-extraction yield
    // also jumps (legal pages expose email) so the funnel is ~2.6× better.
    avgMrr: 14.98, // €149 one-shot + €9.99/mo maintenance avg across 12m
    // OFA pricing mixes reflect SEO GEO tier uptake on top of base (149€+9.99/mo):
    //   - core: 100% achat+maintenance, no SEO tier (baseline 14.98€)
    //   - seo_pro: 30% des payants prennent SEO GEO Pro 39€/mo → avgMrr += 0.3×39 = 11.70
    //   - seo_elite: 15% Elite 79€ + 20% Pro 39€ → avgMrr += 0.15×79 + 0.20×39 = 19.65
    pricingMixes: [
      { id: 'core',      label: 'Mix core (100% achat seul)',         avgMrr: 14.98,              why: 'Aucun SEO GEO actif. Socle minimal.' },
      { id: 'seo_pro',   label: 'Mix Pro (30% SEO Pro 39€/mo)',       avgMrr: 14.98 + 11.70,      why: 'Tier SEO GEO Pro vendu à 30% des payants. Auto-financé.' },
      { id: 'seo_elite', label: 'Mix Elite (15% Elite + 20% Pro)',    avgMrr: 14.98 + 11.85 + 7.80, why: 'Mix mature — Elite 79€ à 15%, Pro 39€ à 20%, reste core.' },
    ],
    funnel: [
      { id: 'siteAnalyzed',     label: 'Lead → site analysé (platform/mobile)', defaultRate: 0.95 },
      { id: 'uglyQualified',    label: 'Analysé → ugly-score ≥ 50 (pitch-worthy)', defaultRate: 0.55 },
      { id: 'contactExtracted', label: 'Ugly → email/phone extrait (legal pages)', defaultRate: 0.70 },
      { id: 'pitched',          label: 'Contact → pitch before/after envoyé',     defaultRate: 0.95 },
      { id: 'opened',           label: 'Pitché → ouvert (personnalisé)',          defaultRate: 0.55 },
      { id: 'responded',        label: 'Ouvert → réponse (ROI chiffré)',          defaultRate: 0.12 },
      { id: 'demo',             label: 'Réponse → preview 3 designs visités',     defaultRate: 0.55 },
      { id: 'paid',             label: 'Preview → achat 149€',                    defaultRate: 0.35 },
    ],
    agentsCapacity: [
      { name: 'website-scout',     perDay: 20000 }, // fetch + platform detection is cheap
      { name: 'screenshot-capture', perDay: 8000 }, // ScreenshotOne rate-limit band
      { name: 'lighthouse-audit',  perDay: 6000 },  // PageSpeed API free tier
      { name: 'seo-geo-audit',     perDay: 4000 },  // Serper queries per lead
      { name: 'contact-extractor', perDay: 8000 },  // regex first, LLM fallback
      { name: 'site-generator',    perDay: 2000 },  // existing
      { name: 'pitcher',           perDay: 4000 },  // multi-channel (email/WA/SMS)
    ],
    maxByObjective: { mrr: 1_500_000, clients: 150_000, revenue: 30_000_000 },
  },
  ftg: {
    avgMrr: 49,
    // FTG pricing mixes reflect plan distribution across paying users:
    //   - data_heavy: 80% Data 29 + 15% Strategy 99 + 5% Premium 149 = 38.30
    //   - balanced: 50% Data 29 + 35% Strategy 99 + 15% Premium 149 = 71.50
    //   - premium: 30% Data 29 + 40% Strategy 99 + 30% Premium 149 = 93.00
    pricingMixes: [
      { id: 'data_heavy', label: 'Mix Data-heavy (80/15/5)',   avgMrr: 0.80 * 29 + 0.15 * 99 + 0.05 * 149,  why: 'Onboarding majoritairement gratuit → Data. Upsell non agressif.' },
      { id: 'balanced',   label: 'Mix équilibré (50/35/15)',   avgMrr: 0.50 * 29 + 0.35 * 99 + 0.15 * 149,  why: 'Funnel mature avec upsell Strategy actif et quelques Premium.' },
      { id: 'premium',    label: 'Mix Premium (30/40/30)',     avgMrr: 0.30 * 29 + 0.40 * 99 + 0.30 * 149,  why: 'Cible entrepreneurs early-adopters — passer Free→Premium rapidement.' },
    ],
    funnel: [
      { id: 'sourced',    label: 'Prospect sourcé',            defaultRate: 1 },
      { id: 'enriched',   label: 'Sourcé → contact trouvé',    defaultRate: 0.50 },
      { id: 'outreached', label: 'Contact → outreach envoyé',  defaultRate: 0.90 },
      { id: 'responded',  label: 'Outreach → réponse',         defaultRate: 0.05 },
      { id: 'demo',       label: 'Réponse → demo',             defaultRate: 0.40 },
      { id: 'paid',       label: 'Demo → abonné',              defaultRate: 0.20 },
    ],
    agentsCapacity: [
      { name: 'ftg-vc-scout',      perDay: 500 },
      { name: 'ftg-angel-scout',   perDay: 300 },
      { name: 'ftg-founder-scout', perDay: 800 },
      { name: 'contact-finder',    perDay: 1500 },
      { name: 'email-nurture',     perDay: 3000 },
    ],
    maxByObjective: { mrr: 1_000_000, clients: 20_408, revenue: 12_000_000 },
  },
}

function bendFunnel(base: { id: string; label: string; defaultRate: number }[], bias: 'pessimistic' | 'baseline' | 'optimistic') {
  const factor = bias === 'pessimistic' ? 0.75 : bias === 'optimistic' ? 1.2 : 1
  return base.map(s => ({ ...s, defaultRate: Math.min(1, Math.max(0.01, s.defaultRate * factor)) }))
}

function computeResults(
  p: typeof PRODUCT_DEFAULTS['ofa'],
  objectiveType: 'mrr' | 'clients' | 'revenue',
  objectiveValue: number,
  horizonDays: number,
  funnel: { id: string; label: string; defaultRate: number }[],
  avgMrr: number,
) {
  const paidNeeded = objectiveType === 'mrr'
    ? Math.ceil(objectiveValue / avgMrr)
    : objectiveType === 'clients' ? objectiveValue : Math.ceil(objectiveValue / 149)
  const totalConv = funnel.reduce((acc, s) => acc * s.defaultRate, 1)
  const leadsNeeded = Math.ceil(paidNeeded / totalConv)
  const stageVolumes = funnel.reduce<{ id: string; label: string; volume: number }[]>((acc, s, i) => {
    const prev = i === 0 ? leadsNeeded : acc[i - 1].volume
    acc.push({ id: s.id, label: s.label, volume: Math.ceil(prev * s.defaultRate) })
    return acc
  }, [])
  const mrr = paidNeeded * avgMrr
  const capacity = p.agentsCapacity.map(a => {
    // Coarse mapping of per-stage volume to the agent that serves it.
    // Keep this in sync with the funnel stage ids above.
    const stageRate = (id: string): number => funnel.find(s => s.id === id)?.defaultRate ?? 1
    const n = a.name
    const qualifiedLeads = Math.ceil(leadsNeeded * stageRate('siteAnalyzed') * stageRate('uglyQualified'))
    const need = n.includes('website-scout') ? leadsNeeded
      : n.includes('screenshot-capture') ? qualifiedLeads
      : n.includes('lighthouse-audit') ? qualifiedLeads
      : n.includes('seo-geo-audit') ? qualifiedLeads
      : n.includes('contact-extractor') ? qualifiedLeads
      : n.includes('site-generator') ? Math.ceil(qualifiedLeads * stageRate('contactExtracted'))
      : n.includes('pitcher') ? Math.ceil(qualifiedLeads * stageRate('contactExtracted') * stageRate('pitched'))
      : n.includes('contact-finder') ? Math.ceil(leadsNeeded * (funnel[0]?.defaultRate || 0.35))
      : n.includes('email-nurture') ? Math.ceil(leadsNeeded * 0.5)
      : n.includes('scout') ? leadsNeeded
      : leadsNeeded
    const capTotal = a.perDay * horizonDays
    return { name: a.name, need, capacity: capTotal, ok: capTotal >= need, perDay: a.perDay }
  })
  return { paidNeeded, leadsNeeded, stageVolumes, mrr, capacity, totalConv }
}

// POST /api/simulator/generate-scenarios  { product, horizonDays? }
// Returns 3 Minato-flavoured scenarios: conservative / balanced / aggressive.
// Math-driven (fast, deterministic) rather than LLM so we stay free-tier and
// the UI gets an immediate response. The narrative tone is "Minato" — aimed
// at the top 1% but grounded by the actual product capacity.
export async function POST(req: Request) {
  const { product = 'ofa', horizonDays = 30 } = await req.json().catch(() => ({}))
  const p = PRODUCT_DEFAULTS[product]
  if (!p) return NextResponse.json({ ok: false, error: 'unknown product' }, { status: 400 })

  // Pull current DB state so scenarios reference reality.
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
  const ctx: any = { product }
  try {
    if (product === 'ofa') {
      const [{ count: leads }, { count: sites }, { count: sent }] = await Promise.all([
        sb.from('commerce_leads').select('*', { count: 'exact', head: true }),
        sb.from('generated_sites').select('*', { count: 'exact', head: true }).eq('status', 'claimed'),
        sb.from('commerce_leads').select('*', { count: 'exact', head: true }).not('outreach_sent_at', 'is', null),
      ])
      ctx.leads = leads ?? 0; ctx.sites = sites ?? 0; ctx.sent = sent ?? 0
    } else if (product === 'ftg') {
      const e = await sb.from('entrepreneurs').select('*', { count: 'exact', head: true })
      const u = await sb.from('profiles').select('*', { count: 'exact', head: true }).in('tier', ['data', 'basic', 'standard', 'strategy', 'premium'])
      ctx.entrepreneurs = e.count ?? 0
      ctx.paying = u.count ?? 0
    }
  } catch { /* best-effort context */ }

  const max = p.maxByObjective.mrr
  // Tier anchors: conservative = 10% of max · balanced = 30% · aggressive = 80%.
  const tiers: { name: 'conservative' | 'balanced' | 'aggressive'; mrr: number; bias: 'pessimistic' | 'baseline' | 'optimistic'; label: string; why: string }[] = [
    {
      name: 'conservative', mrr: Math.round(max * 0.05 / 100) * 100, bias: 'pessimistic',
      label: 'Socle — Nami prudente',
      why: 'MRR atteignable avec la capacité actuelle sans scaler les agents. Référence pour valider le pipeline avant d\'investir.',
    },
    {
      name: 'balanced', mrr: Math.round(max * 0.20 / 1000) * 1000, bias: 'baseline',
      label: 'Cible — Minato équilibre',
      why: 'Stretch goal réaliste sur 30 jours. Nécessite scale ×2-3 sur 1-2 agents goulot. Marge 70% réinvestie (Nami Reinvest).',
    },
    {
      name: 'aggressive', mrr: Math.round(max * 0.75 / 10000) * 10000, bias: 'optimistic',
      label: 'Genkidama — top 1%',
      why: 'Visée maximum. Scale ×5-10 massif. Toutes les APIs en free-tier au max, stratégies Minato activées. Risque de saturation quotas.',
    },
  ]

  // Cartesian product: 3 biais × 3 mix pricing = 9 scénarios.
  const scenarios = tiers.flatMap(t =>
    p.pricingMixes.map(mix => {
      const funnel = bendFunnel(p.funnel, t.bias)
      const results = computeResults(p, 'mrr', t.mrr, horizonDays, funnel, mix.avgMrr)
      const scaleSuggestions = results.capacity
        .filter(a => !a.ok)
        .map(a => ({
          name: a.name,
          instances: Math.min(10, Math.max(2, Math.ceil(a.need / a.capacity))),
          reason: `Besoin ${a.need.toLocaleString('fr-FR')} vs capacité ${a.capacity.toLocaleString('fr-FR')} (×1)`,
        }))
      return {
        tier: t.name,
        mix: mix.id,
        label: `${t.label} · ${mix.label}`,
        why: `${t.why} · ${mix.why}`,
        objectiveType: 'mrr' as const,
        objectiveValue: t.mrr,
        horizonDays,
        avgMrr: Math.round(mix.avgMrr * 100) / 100,
        funnel,
        results,
        scaleSuggestions,
      }
    }),
  )

  return NextResponse.json({ ok: true, product, ctx, scenarios, pricingMixes: p.pricingMixes })
}
