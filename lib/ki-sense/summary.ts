/**
 * Ki Sense — flywheel health summary.
 *
 * Aggregates autonomous signals (Hisoka discovery + AAM forge + Auto-push + AI pool)
 * into a single snapshot consumed by /admin/ki-sense and /api/ki-sense/summary.
 *
 * Pull-only. Zero side-effects. Safe to call on every page render.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export type CronStatus = 'ok' | 'warn' | 'fail' | 'unknown'

export type CronHealth = {
  key: string
  path: string
  label: string
  schedule: string
  icon: string
  expectedEveryHours: number
  lastRunAt: string | null
  status: CronStatus
  hoursSinceLastRun: number | null
  cost7dEur: number
  runs7d: number
  fails7d: number
  note?: string
}

export type FlywheelHealth = {
  ideasGenerated7d: number
  ideasTotalActive: number
  pushedToMinato7d: number
  forgeAttempts7d: number
  forgePromoted7d: number
  forgeFailed7d: number
  forgeCost7dEur: number
  hunterCost7dEur: number
  avgAutonomyTop20: number | null
  highAutonomyReady: number // ideas ≥0.92 not yet pushed
}

export type Anomaly = {
  severity: 'critical' | 'warn' | 'info'
  code: string
  title: string
  detail: string
}

export type ProviderPoolHealth = {
  provider: string
  calls24h: number
  fails24h: number
  rateLimit24h: number
  quotaExhausted24h: number
  cost24hUsd: number
  distinctKeys24h: number
  status: 'ok' | 'warn' | 'degraded'
}

export type KiSenseSummary = {
  generatedAt: string
  crons: CronHealth[]
  flywheel: FlywheelHealth
  anomalies: Anomaly[]
  llmPool: ProviderPoolHealth[]
}

const DAY_MS = 86_400_000

// ──────────────────────────────────────────────────────────────────────────────
// Cron registry — kept in sync with vercel.json.
// ──────────────────────────────────────────────────────────────────────────────

type CronDef = {
  key: string
  path: string
  label: string
  schedule: string
  icon: string
  /** Expected interval in hours. Used for OK/WARN/FAIL thresholds. */
  expectedEveryHours: number
}

const CRON_REGISTRY: CronDef[] = [
  {
    key: 'hisoka-harvest',
    path: '/api/business-hunter/run-cron',
    label: 'Hisoka — Business Hunter harvest',
    schedule: '0 2 * * *',
    icon: '🃏',
    expectedEveryHours: 24,
  },
  {
    key: 'aam-forge',
    path: '/api/business-hunter/aam/cron',
    label: 'AAM Forge — lift 0.75–0.89 ideas',
    schedule: '0 3 * * *',
    icon: '💪',
    expectedEveryHours: 24,
  },
  {
    key: 'auto-push-minato',
    path: '/api/business-hunter/auto-push-cron',
    label: 'Auto-push ≥0.92 → Minato',
    schedule: '30 3 * * *',
    icon: '⚡',
    expectedEveryHours: 24,
  },
  {
    key: 'aam-kaizen',
    path: '/api/business-hunter/aam/kaizen',
    label: 'AAM Kaizen — weekly failure patterns',
    schedule: '0 4 * * 0',
    icon: '🌀',
    expectedEveryHours: 168, // weekly
  },
]

// ──────────────────────────────────────────────────────────────────────────────
// Cron health — inferred from DB signals (no direct Vercel logs access).
//
// Strategy: each cron leaves a trace in DB.
//   hisoka-harvest      → business_hunter_runs row (trigger='cron')
//   aam-forge           → automation_upgrades rows (verdict in promoted/failed/needs_human/out_of_budget)
//   auto-push-minato    → business_ideas.pushed_to_minato_at populated + ticket in minato_tickets
//   aam-kaizen          → automation_upgrades row with test_output.kaizen_summary
//
// If the table doesn't exist → status='unknown', no crash.
// ──────────────────────────────────────────────────────────────────────────────

function classify(hoursSince: number | null, expectedEvery: number): CronStatus {
  if (hoursSince === null) return 'unknown'
  if (hoursSince <= expectedEvery * 1.1) return 'ok'
  if (hoursSince <= expectedEvery * 2) return 'warn'
  return 'fail'
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function safeQuery<T = any>(p: Promise<{ data: T | null; error: unknown }>): Promise<T | null> {
  try {
    const r = await p
    if (r.error) return null
    return (r.data as T) ?? null
  } catch {
    return null
  }
}

type HunterRun = {
  started_at: string
  finished_at: string | null
  cost_eur: number | null
  status: string
  trigger: string
}

type UpgradeRow = {
  started_at: string
  finished_at: string | null
  cost_eur: number | null
  verdict: string
  dim_targeted: string | null
  test_output: unknown
  idea_id: string
}

type IdeaRow = {
  id: string
  name: string
  autonomy_score: number | null
  pushed_to_minato_at: string | null
  forge_status: string | null
  discovered_at: string | null
  rank: number | null
}

type AIEventRow = {
  provider: string
  key_label: string
  event: string
  cost_usd: number | null
  created_at: string
}

async function computeCronHealth(sb: SupabaseClient): Promise<CronHealth[]> {
  const since7d = new Date(Date.now() - 7 * DAY_MS).toISOString()

  const [hunterRuns, upgrades, pushedIdeas] = await Promise.all([
    safeQuery<HunterRun[]>(
      sb.from('business_hunter_runs')
        .select('started_at, finished_at, cost_eur, status, trigger')
        .gte('started_at', since7d)
        .order('started_at', { ascending: false })
        .limit(200) as unknown as Promise<{ data: HunterRun[] | null; error: unknown }>,
    ),
    safeQuery<UpgradeRow[]>(
      sb.from('automation_upgrades')
        .select('started_at, finished_at, cost_eur, verdict, dim_targeted, test_output, idea_id')
        .gte('started_at', since7d)
        .order('started_at', { ascending: false })
        .limit(500) as unknown as Promise<{ data: UpgradeRow[] | null; error: unknown }>,
    ),
    safeQuery<IdeaRow[]>(
      sb.from('business_ideas')
        .select('id, name, autonomy_score, pushed_to_minato_at, forge_status, discovered_at, rank')
        .not('pushed_to_minato_at', 'is', null)
        .gte('pushed_to_minato_at', since7d)
        .order('pushed_to_minato_at', { ascending: false })
        .limit(500) as unknown as Promise<{ data: IdeaRow[] | null; error: unknown }>,
    ),
  ])

  const now = Date.now()

  const out: CronHealth[] = CRON_REGISTRY.map((def) => {
    let lastRunAt: string | null = null
    let cost7d = 0
    let runs7d = 0
    let fails7d = 0

    if (def.key === 'hisoka-harvest' && hunterRuns) {
      const cronRuns = hunterRuns.filter((r) => r.trigger === 'cron' || r.trigger === 'manual')
      runs7d = cronRuns.length
      fails7d = cronRuns.filter((r) => r.status === 'failed').length
      cost7d = cronRuns.reduce((s, r) => s + Number(r.cost_eur ?? 0), 0)
      lastRunAt = cronRuns[0]?.started_at ?? null
    } else if (def.key === 'aam-forge' && upgrades) {
      // Exclude kaizen sentinel rows (attempt 0 / verdict=needs_human with kaizen_summary in test_output)
      const forgeRows = upgrades.filter((u) => {
        const to = u.test_output as { kaizen_summary?: unknown } | null
        return !(u.verdict === 'needs_human' && to && typeof to === 'object' && 'kaizen_summary' in to)
      })
      runs7d = forgeRows.length
      fails7d = forgeRows.filter((u) => u.verdict === 'failed' || u.verdict === 'out_of_budget').length
      cost7d = forgeRows.reduce((s, u) => s + Number(u.cost_eur ?? 0), 0)
      lastRunAt = forgeRows[0]?.started_at ?? null
    } else if (def.key === 'auto-push-minato' && pushedIdeas) {
      runs7d = pushedIdeas.length
      lastRunAt = pushedIdeas[0]?.pushed_to_minato_at ?? null
      // cost is effectively 0 (no LLM calls, just DB insert)
      cost7d = 0
    } else if (def.key === 'aam-kaizen' && upgrades) {
      const kaizenRows = upgrades.filter((u) => {
        const to = u.test_output as { kaizen_summary?: unknown } | null
        return !!(to && typeof to === 'object' && 'kaizen_summary' in to)
      })
      runs7d = kaizenRows.length
      cost7d = kaizenRows.reduce((s, u) => s + Number(u.cost_eur ?? 0), 0)
      lastRunAt = kaizenRows[0]?.started_at ?? null
    }

    const hoursSince = lastRunAt ? (now - new Date(lastRunAt).getTime()) / 3_600_000 : null
    const status = classify(hoursSince, def.expectedEveryHours)

    let note: string | undefined
    if (def.key === 'auto-push-minato' && runs7d === 0) {
      note = 'Aucune idée ≥0.92 prête à pousser — normal si forge en rodage'
    }

    return {
      key: def.key,
      path: def.path,
      label: def.label,
      schedule: def.schedule,
      icon: def.icon,
      expectedEveryHours: def.expectedEveryHours,
      lastRunAt,
      hoursSinceLastRun: hoursSince,
      status,
      cost7dEur: Math.round(cost7d * 100) / 100,
      runs7d,
      fails7d,
      note,
    }
  })

  return out
}

// ──────────────────────────────────────────────────────────────────────────────
// Flywheel health
// ──────────────────────────────────────────────────────────────────────────────

async function computeFlywheel(sb: SupabaseClient): Promise<FlywheelHealth> {
  const since7d = new Date(Date.now() - 7 * DAY_MS).toISOString()

  const [ideasNew, ideasTotal, ideasPushed, upgrades, hunterRuns, top20] = await Promise.all([
    safeQuery<{ id: string }[]>(
      sb.from('business_ideas').select('id').gte('discovered_at', since7d).limit(2000) as unknown as Promise<{ data: { id: string }[] | null; error: unknown }>,
    ),
    safeQuery<{ id: string }[]>(
      sb.from('business_ideas').select('id').is('archived_at', null).limit(2000) as unknown as Promise<{ data: { id: string }[] | null; error: unknown }>,
    ),
    safeQuery<{ id: string }[]>(
      sb.from('business_ideas').select('id').gte('pushed_to_minato_at', since7d).limit(2000) as unknown as Promise<{ data: { id: string }[] | null; error: unknown }>,
    ),
    safeQuery<UpgradeRow[]>(
      sb.from('automation_upgrades').select('started_at, verdict, cost_eur, test_output').gte('started_at', since7d).limit(2000) as unknown as Promise<{ data: UpgradeRow[] | null; error: unknown }>,
    ),
    safeQuery<HunterRun[]>(
      sb.from('business_hunter_runs').select('cost_eur').gte('started_at', since7d).limit(500) as unknown as Promise<{ data: HunterRun[] | null; error: unknown }>,
    ),
    safeQuery<IdeaRow[]>(
      sb.from('business_ideas').select('id, name, autonomy_score, pushed_to_minato_at, forge_status, discovered_at, rank').not('rank', 'is', null).order('rank').limit(20) as unknown as Promise<{ data: IdeaRow[] | null; error: unknown }>,
    ),
  ])

  const forgeReal = (upgrades ?? []).filter((u) => {
    const to = u.test_output as { kaizen_summary?: unknown } | null
    return !(u.verdict === 'needs_human' && to && typeof to === 'object' && 'kaizen_summary' in to)
  })

  const avgAutonomy = top20 && top20.length > 0
    ? top20.reduce((s, r) => s + Number(r.autonomy_score ?? 0), 0) / top20.length
    : null

  const highAutonomyReady = (top20 ?? []).filter(
    (r) => Number(r.autonomy_score ?? 0) >= 0.92 && !r.pushed_to_minato_at,
  ).length

  return {
    ideasGenerated7d: ideasNew?.length ?? 0,
    ideasTotalActive: ideasTotal?.length ?? 0,
    pushedToMinato7d: ideasPushed?.length ?? 0,
    forgeAttempts7d: forgeReal.length,
    forgePromoted7d: forgeReal.filter((u) => u.verdict === 'promoted').length,
    forgeFailed7d: forgeReal.filter((u) => u.verdict === 'failed' || u.verdict === 'out_of_budget').length,
    forgeCost7dEur: Math.round(forgeReal.reduce((s, u) => s + Number(u.cost_eur ?? 0), 0) * 100) / 100,
    hunterCost7dEur: Math.round((hunterRuns ?? []).reduce((s, r) => s + Number(r.cost_eur ?? 0), 0) * 100) / 100,
    avgAutonomyTop20: avgAutonomy === null ? null : Math.round(avgAutonomy * 100) / 100,
    highAutonomyReady,
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// LLM pool health (24h)
// ──────────────────────────────────────────────────────────────────────────────

async function computeLlmPool(sb: SupabaseClient): Promise<ProviderPoolHealth[]> {
  const since24h = new Date(Date.now() - DAY_MS).toISOString()
  const rows = await safeQuery<AIEventRow[]>(
    sb.from('ai_key_events')
      .select('provider, key_label, event, cost_usd, created_at')
      .gte('created_at', since24h)
      .limit(20_000) as unknown as Promise<{ data: AIEventRow[] | null; error: unknown }>,
  )
  if (!rows) return []

  const byProvider = new Map<string, {
    calls: number; fails: number; rl: number; qe: number; cost: number; keys: Set<string>
  }>()

  for (const e of rows) {
    const agg = byProvider.get(e.provider) ?? { calls: 0, fails: 0, rl: 0, qe: 0, cost: 0, keys: new Set<string>() }
    agg.keys.add(e.key_label)
    if (e.event === 'call_ok') agg.calls++
    else if (e.event === 'call_fail') agg.fails++
    else if (e.event === 'rate_limit') agg.rl++
    else if (e.event === 'quota_exhausted') agg.qe++
    agg.cost += Number(e.cost_usd ?? 0)
    byProvider.set(e.provider, agg)
  }

  const out: ProviderPoolHealth[] = []
  for (const [provider, a] of byProvider.entries()) {
    const total = a.calls + a.fails + a.rl + a.qe
    const failureRate = total > 0 ? (a.fails + a.rl + a.qe) / total : 0
    const status: ProviderPoolHealth['status'] =
      a.qe > 0 || failureRate > 0.5 ? 'degraded'
      : failureRate > 0.15 || a.rl > 3 ? 'warn'
      : 'ok'
    out.push({
      provider,
      calls24h: a.calls,
      fails24h: a.fails,
      rateLimit24h: a.rl,
      quotaExhausted24h: a.qe,
      cost24hUsd: Math.round(a.cost * 10_000) / 10_000,
      distinctKeys24h: a.keys.size,
      status,
    })
  }

  out.sort((x, y) => y.calls24h - x.calls24h)
  return out
}

// ──────────────────────────────────────────────────────────────────────────────
// Anomaly detection — derived from the three blocks above.
// ──────────────────────────────────────────────────────────────────────────────

function detectAnomalies(
  crons: CronHealth[],
  flywheel: FlywheelHealth,
  llm: ProviderPoolHealth[],
): Anomaly[] {
  const out: Anomaly[] = []

  // 1. Cron failures
  for (const c of crons) {
    if (c.status === 'fail') {
      out.push({
        severity: 'critical',
        code: `cron.fail.${c.key}`,
        title: `${c.icon} Cron ${c.label} n'a pas tourné`,
        detail: c.hoursSinceLastRun === null
          ? 'Aucune trace DB trouvée — le cron ne déclenche pas ou la table est vide.'
          : `Dernière exécution il y a ${c.hoursSinceLastRun.toFixed(1)}h (attendu ≤ ${c.expectedEveryHours}h).`,
      })
    } else if (c.status === 'warn') {
      out.push({
        severity: 'warn',
        code: `cron.warn.${c.key}`,
        title: `${c.icon} ${c.label} en retard`,
        detail: `Dernière exécution il y a ${c.hoursSinceLastRun?.toFixed(1)}h (attendu ~${c.expectedEveryHours}h).`,
      })
    }
    if (c.fails7d >= 3) {
      out.push({
        severity: 'warn',
        code: `cron.repeated_fails.${c.key}`,
        title: `${c.icon} Échecs répétés sur ${c.label}`,
        detail: `${c.fails7d} runs en échec sur 7 jours.`,
      })
    }
    if (c.cost7dEur > 7) {
      out.push({
        severity: 'warn',
        code: `cron.cost_high.${c.key}`,
        title: `💸 Coût élevé sur ${c.label}`,
        detail: `€${c.cost7dEur.toFixed(2)} sur 7j (>€1/j).`,
      })
    }
  }

  // 2. Flywheel dryness
  if (flywheel.ideasGenerated7d === 0 && flywheel.ideasTotalActive > 0) {
    out.push({
      severity: 'critical',
      code: 'flywheel.no_ideas_7d',
      title: '🃏 Aucune nouvelle idée sur 7 jours',
      detail: 'Hisoka n\'a produit aucun candidat — harvester down ou LLM pool vide.',
    })
  }
  if (flywheel.forgeAttempts7d === 0) {
    out.push({
      severity: 'info',
      code: 'flywheel.no_forge_7d',
      title: '💪 AAM Forge au repos',
      detail: 'Aucune tentative de forge sur 7j — soit queue vide soit budget saturé.',
    })
  }
  if (flywheel.forgeAttempts7d >= 5) {
    const failRate = flywheel.forgeFailed7d / flywheel.forgeAttempts7d
    if (failRate > 0.8) {
      out.push({
        severity: 'warn',
        code: 'flywheel.forge_fail_rate_high',
        title: '💪 Taux d\'échec Forge > 80%',
        detail: `${flywheel.forgeFailed7d}/${flywheel.forgeAttempts7d} tentatives échouent — relancer Kaizen ou revoir candidats.`,
      })
    }
  }
  if (flywheel.highAutonomyReady >= 3) {
    out.push({
      severity: 'warn',
      code: 'flywheel.push_backlog',
      title: '⚡ Auto-push en retard',
      detail: `${flywheel.highAutonomyReady} idées ≥0.92 attendent d'être poussées à Minato.`,
    })
  }
  if ((flywheel.hunterCost7dEur + flywheel.forgeCost7dEur) > 7) {
    out.push({
      severity: 'warn',
      code: 'flywheel.cost_high',
      title: '💸 Coût flywheel > €1/j',
      detail: `€${(flywheel.hunterCost7dEur + flywheel.forgeCost7dEur).toFixed(2)} sur 7j (harvest + forge).`,
    })
  }

  // 3. LLM pool
  for (const p of llm) {
    if (p.status === 'degraded') {
      out.push({
        severity: 'critical',
        code: `llm.degraded.${p.provider}`,
        title: `🔌 ${p.provider} dégradé`,
        detail: `${p.quotaExhausted24h} quotas épuisés, ${p.rateLimit24h} rate-limits, ${p.fails24h} erreurs sur 24h.`,
      })
    } else if (p.status === 'warn') {
      out.push({
        severity: 'warn',
        code: `llm.warn.${p.provider}`,
        title: `🔌 ${p.provider} sous pression`,
        detail: `${p.rateLimit24h} rate-limits, ${p.fails24h} erreurs sur 24h.`,
      })
    }
  }

  // Sort: critical first then warn then info
  const weight: Record<Anomaly['severity'], number> = { critical: 0, warn: 1, info: 2 }
  out.sort((a, b) => weight[a.severity] - weight[b.severity])
  return out
}

// ──────────────────────────────────────────────────────────────────────────────
// Orchestrator
// ──────────────────────────────────────────────────────────────────────────────

export async function buildKiSenseSummary(sb: SupabaseClient): Promise<KiSenseSummary> {
  const [crons, flywheel, llmPool] = await Promise.all([
    computeCronHealth(sb),
    computeFlywheel(sb),
    computeLlmPool(sb),
  ])
  const anomalies = detectAnomalies(crons, flywheel, llmPool)
  return {
    generatedAt: new Date().toISOString(),
    crons,
    flywheel,
    anomalies,
    llmPool,
  }
}
