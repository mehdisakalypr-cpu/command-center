import type { SupabaseClient } from '@supabase/supabase-js';
import { withFallback, extractJSON } from '@/lib/ai-pool/cascade';
import { getBricks, getMinatoAgents } from './registries';
import { IDEATOR_SYSTEM, buildIdeatorUserPrompt } from './prompts';
import { hardGates, baseScore, normalizeIdea } from './scoring';
import { harvestSignals } from './harvester';
import type { ScoredIdea, HunterRunResult } from './types';

const DEFAULT_COUNT = 30;
const TOP_N = 20;

export async function runDiscovery(
  supabaseAdmin: SupabaseClient,
  opts: { trigger: 'manual' | 'cron'; countTarget?: number; vertical?: string } = { trigger: 'manual' },
): Promise<HunterRunResult> {
  // 1. Insert run row
  const { data: runRow, error: runErr } = await supabaseAdmin
    .from('business_hunter_runs')
    .insert({ trigger: opts.trigger, status: 'running' })
    .select('id').single();
  if (runErr || !runRow) throw new Error(`Cannot create run row: ${runErr?.message}`);
  const run_id: string = (runRow as { id: string }).id;

  try {
    // 2. Load context (bricks, agents, prev top 20, and real-time signals in parallel)
    const [bricks, agents, prevResult, signals] = await Promise.all([
      getBricks(),
      getMinatoAgents(),
      supabaseAdmin
        .from('business_ideas')
        .select('slug, name, score')
        .not('rank', 'is', null)
        .order('rank')
        .limit(20),
      // Harvest signals defensively — never throws, returns [] on full failure
      harvestSignals({ timeoutMs: 20_000, vertical: opts.vertical }).catch((err: unknown) => {
        console.warn('[hisoka/pipeline] harvestSignals unexpected error (graceful):', String(err));
        return [] as Awaited<ReturnType<typeof harvestSignals>>;
      }),
    ]);
    const prevTop = (prevResult.data ?? []) as Array<{ slug: string; name: string; score: number }>;
    console.log(`[hisoka/pipeline] signals_fetched: ${signals.length}`);

    // 3. LLM call — adapted to real ai-pool signature:
    //    withFallback(input: GenInput, opts?: CascadeOptions) → Promise<GenOutput>
    //    GenInput: { prompt, system?, model?, temperature?, maxTokens? }
    //    CascadeOptions: { project?, order? }
    //    GenOutput: { text, costUsd?, ... }
    //    No responseFormat — returns raw text; extractJSON handles JSON extraction.
    const userPrompt = buildIdeatorUserPrompt({
      bricks,
      agents,
      signals: signals.length > 0 ? signals : undefined,
      previousTop20: prevTop,
      countTarget: opts.countTarget ?? DEFAULT_COUNT,
      vertical: opts.vertical,
    });

    const gen = await withFallback(
      {
        system: IDEATOR_SYSTEM,
        prompt: userPrompt,
        // Groq uses llama-4-scout by default (handles large structured JSON outputs, free).
        // OpenRouter will try the specified model; if the account has credit it uses the paid model,
        // otherwise falls through to free models (capped at 4096 output tokens).
        model: 'anthropic/claude-3-5-haiku',
        temperature: 0.8,
        // 16k output — 5 ideas × dense JSON can exceed 8k; Gemini 2.5-flash
        // supports up to 65k output tokens, Groq/OpenAI also comfortable.
        maxTokens: 16000,
      },
      {
        project: 'cc',
        // Groq first (free, large outputs, reliable JSON), then openrouter as fallback.
        order: ['gemini','mistral','groq','openrouter','anthropic','openai'],
      },
    );
    const costEur = (gen.costUsd ?? 0) * 0.92;

    // 4. Parse — strip code fences defensively, then extractJSON grabs first JSON object/array.
    // If the JSON is truncated (output cutoff), extract all complete idea objects with regex.
    const cleanedText = gen.text.replace(/^```(?:json)?\n?|\n?```$/g, '').trim();
    let ideas: ScoredIdea[] = [];
    try {
      const parsed = extractJSON<{ ideas: ScoredIdea[] }>(cleanedText);
      ideas = parsed.ideas ?? [];
    } catch (_parseErr) {
      // Attempt partial recovery: grab every complete top-level object in the ideas array.
      // Match objects that start with {"slug": and end with a balanced brace.
      // [\s\S] is the ES2017-compatible equivalent of `.` with the `s` (dotall) flag.
      const partialMatches = cleanedText.matchAll(/\{\s*"slug"\s*:\s*"[^"]+"[\s\S]+?\}(?=\s*[,\]])/g);
      for (const m of partialMatches) {
        try {
          const obj = JSON.parse(m[0]) as ScoredIdea;
          if (obj.slug && obj.name) ideas.push(obj);
        } catch { /* skip malformed */ }
      }
      if (ideas.length === 0) {
        throw new Error(`LLM JSON parse failed (no recoverable ideas) | raw=${gen.text.slice(0, 400)}`);
      }
      console.warn(`[hisoka] JSON truncated — recovered ${ideas.length} ideas via partial parse`);
    }

    // 5. Drop structurally incomplete ideas (may appear when repairTruncatedJSON
    // recovers a trailing object that was partially written). hardGates + baseScore
    // assume full nested shapes — access via `idea.unit_economics.v10k.gm_pct` etc.
    const structuralDrops: Array<{ slug: string; missing: string[] }> = [];
    const structurallyComplete = ideas.filter((i) => {
      const missing: string[] = [];
      if (!i || typeof i !== 'object') missing.push('not-object');
      if (!i?.slug) missing.push('slug');
      if (!i?.name) missing.push('name');
      if (!i?.autonomy) missing.push('autonomy');
      else {
        const dims = ['acquisition','content_ops','fulfillment','support','billing','compliance'] as const;
        for (const dim of dims) {
          if (typeof (i.autonomy as Record<string, unknown>)[dim] !== 'number') missing.push(`autonomy.${dim}`);
        }
      }
      if (typeof i?.setup_hours_user !== 'number') missing.push('setup_hours_user');
      if (typeof i?.ongoing_user_hours_per_month !== 'number') missing.push('ongoing_user_hours_per_month');
      if (!Array.isArray(i?.distribution_channels)) missing.push('distribution_channels');
      if (typeof i?.self_funding_score !== 'number') missing.push('self_funding_score');
      if (!i?.llc_gate) missing.push('llc_gate');
      if (!i?.unit_economics) missing.push('unit_economics');
      else if (!i.unit_economics.v10k || typeof i.unit_economics.v10k.gm_pct !== 'number') missing.push('unit_economics.v10k.gm_pct');
      if (!i?.mrr_median) missing.push('mrr_median');
      if (!Array.isArray(i?.leverage_configs)) missing.push('leverage_configs');
      if (!Array.isArray(i?.assets_leveraged)) missing.push('assets_leveraged');
      if (missing.length > 0) {
        structuralDrops.push({ slug: String(i?.slug ?? '?'), missing });
        console.warn(`[hisoka] dropped incomplete slug="${i?.slug ?? '?'}" missing=${missing.join(',')}`);
        return false;
      }
      return true;
    });

    // 6. Normalize (auto-fix self_funding_score when GM data justifies it) → filter → score
    // Vertical-mode runs use relaxed autonomy/setup/ongoing thresholds because
    // true verticals (healthcare/legal/agri) realistically require more human
    // supervision than horizontal SaaS. baseScore still penalizes lower
    // autonomy via aScore² so they rank naturally below dev tools.
    const isVertical = !!opts.vertical;
    const gateDrops: Array<{ slug: string; reasons: string[] }> = [];
    const scored = structurallyComplete
      .map(i => normalizeIdea(i))
      .filter(i => {
        const result = hardGates(i, { vertical: isVertical });
        if (!result.passed) {
          gateDrops.push({ slug: i.slug, reasons: result.reasons });
          console.warn(`[hisoka] gate-fail slug="${i.slug}" reasons=${result.reasons.join(';')}`);
        }
        return result.passed;
      })
      .map(i => ({ idea: i, score: baseScore(i) }))
      .sort((a, b) => b.score - a.score);

    // 6. Upsert
    let upserts = 0;
    for (let i = 0; i < scored.length; i++) {
      const { idea, score } = scored[i];
      const rank = i < TOP_N ? i + 1 : null;
      const payload = {
        slug: idea.slug,
        name: idea.name,
        tagline: idea.tagline,
        category: idea.category,
        autonomy_acquisition: idea.autonomy.acquisition,
        autonomy_content_ops: idea.autonomy.content_ops,
        autonomy_fulfillment: idea.autonomy.fulfillment,
        autonomy_support: idea.autonomy.support,
        autonomy_billing: idea.autonomy.billing,
        autonomy_compliance: idea.autonomy.compliance,
        setup_hours_user: idea.setup_hours_user,
        ongoing_user_hours_per_month: idea.ongoing_user_hours_per_month,
        distribution_channels: idea.distribution_channels,
        monetization_model: idea.monetization_model,
        pricing_tiers: idea.pricing_tiers ?? null,
        assets_leveraged: idea.assets_leveraged,
        asset_leverage_bonus: 1.0 + 0.1 * (idea.assets_leveraged?.length ?? 0),
        unit_economics: idea.unit_economics,
        self_funding_score: idea.self_funding_score,
        infra_scaling_curve: idea.infra_scaling_curve ?? null,
        llc_gate: idea.llc_gate,
        compliance_notes: idea.compliance_notes ?? null,
        effort_weeks: idea.effort_weeks,
        monthly_ops_cost_eur: idea.monthly_ops_cost_eur,
        scalability_per_worker: idea.scalability_per_worker,
        mrr_conservative: idea.mrr_conservative,
        mrr_median: idea.mrr_median,
        mrr_optimistic: idea.mrr_optimistic,
        fleet_multipliers: idea.fleet_multipliers ?? null,
        leverage_configs: idea.leverage_configs,
        optimal_config: idea.optimal_config ?? idea.leverage_configs[0] ?? null,
        leverage_elasticity: idea.leverage_elasticity ?? null,
        sources: idea.sources ?? [],
        rationale: idea.rationale,
        rank,
        score,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabaseAdmin
        .from('business_ideas')
        .upsert(payload, { onConflict: 'slug' });
      if (!error) upserts++;
    }

    // Archive evictions: clear rank on ideas that were ranked but are NOT in the new top 20
    const keptSlugs = scored.slice(0, TOP_N).map(s => s.idea.slug);
    if (keptSlugs.length > 0) {
      await supabaseAdmin
        .from('business_ideas')
        .update({ rank: null, archived_at: new Date().toISOString() })
        .not('rank', 'is', null)
        .not('slug', 'in', `(${keptSlugs.map(s => `"${s}"`).join(',')})`);
    }

    // 7. Close run row — success
    await supabaseAdmin
      .from('business_hunter_runs')
      .update({
        finished_at: new Date().toISOString(),
        ideas_discovered: ideas.length,
        ideas_upserted: upserts,
        cost_eur: costEur,
        status: 'success',
      })
      .eq('id', run_id);

    return {
      run_id,
      ideas_discovered: ideas.length,
      ideas_upserted: upserts,
      cost_eur: costEur,
      top20_slugs: keptSlugs,
      // Debug fields when nothing upserted — help diagnose gate failures
      ...(upserts === 0 && (structuralDrops.length > 0 || gateDrops.length > 0) ? {
        debug_structural_drops: structuralDrops.slice(0, 5),
        debug_gate_drops: gateDrops.slice(0, 5),
      } : {}),
    };
  } catch (e) {
    await supabaseAdmin
      .from('business_hunter_runs')
      .update({
        finished_at: new Date().toISOString(),
        status: 'failed',
        error: String(e).slice(0, 2000),
      })
      .eq('id', run_id);
    throw e;
  }
}
