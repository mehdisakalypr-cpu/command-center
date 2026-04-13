import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

// Per-product defaults (mirrors /admin/simulator/page.tsx). Keep in sync.
const PRODUCT_DEFAULTS: Record<string, {
  avgMrr: number
  funnel: { id: string; label: string; defaultRate: number }[]
  agentsCapacity: { name: string; perDay: number }[]
  maxByObjective: Record<string, number>
}> = {
  ofa: {
    avgMrr: 14.98,
    funnel: [
      { id: 'enriched',  label: 'Lead → enrichi',               defaultRate: 0.35 },
      { id: 'pitched',   label: 'Enrichi → pitché multi-canal', defaultRate: 0.95 },
      { id: 'opened',    label: 'Pitché → ouvert/lu',           defaultRate: 0.50 },
      { id: 'responded', label: 'Ouvert → réponse engagée',     defaultRate: 0.08 },
      { id: 'demo',      label: 'Réponse → demo concret',       defaultRate: 0.45 },
      { id: 'paid',      label: 'Demo → payant',                defaultRate: 0.28 },
    ],
    agentsCapacity: [
      { name: 'lead-scout',     perDay: 5000 },
      { name: 'contact-finder', perDay: 2000 },
      { name: 'site-generator', perDay: 2000 },
      { name: 'pitcher',        perDay: 2500 },
    ],
    maxByObjective: { mrr: 450_000, clients: 30_000, revenue: 5_000_000 },
  },
  ftg: {
    avgMrr: 49,
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
    const need = a.name.includes('scout') ? leadsNeeded
      : a.name.includes('contact-finder') ? Math.ceil(leadsNeeded * (funnel[0]?.defaultRate || 0.35))
      : a.name.includes('pitcher') ? Math.ceil(leadsNeeded * 0.3)
      : a.name.includes('site-generator') ? Math.ceil(leadsNeeded * 0.4)
      : a.name.includes('email-nurture') ? Math.ceil(leadsNeeded * 0.5)
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

  const scenarios = tiers.map(t => {
    const funnel = bendFunnel(p.funnel, t.bias)
    const results = computeResults(p, 'mrr', t.mrr, horizonDays, funnel, p.avgMrr)
    // Suggested scale multiplier per goulot agent so the UI can spawn fixes.
    const scaleSuggestions = results.capacity
      .filter(a => !a.ok)
      .map(a => ({
        name: a.name,
        instances: Math.min(10, Math.max(2, Math.ceil(a.need / a.capacity))),
        reason: `Besoin ${a.need.toLocaleString('fr-FR')} vs capacité ${a.capacity.toLocaleString('fr-FR')} (×1)`,
      }))
    return {
      tier: t.name,
      label: t.label,
      why: t.why,
      objectiveType: 'mrr' as const,
      objectiveValue: t.mrr,
      horizonDays,
      avgMrr: p.avgMrr,
      funnel,
      results,
      scaleSuggestions,
    }
  })

  return NextResponse.json({ ok: true, product, ctx, scenarios })
}
