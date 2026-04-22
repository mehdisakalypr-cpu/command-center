# Hisoka 🃏 — Phase 1 MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Hisoka Phase 1 MVP — a manual-trigger Business Hunter in CC that generates, scores, and ranks a top 20 of AI-operable business ideas with basic deep dive, stored in Supabase, accessible at `/admin/hisoka`. No cron, no signal scrapers, no fleet slider, no portfolio mode (those are Phase 2–4).

**Architecture:** Server-side pipeline in `lib/hisoka/` drives the LLM cascade (reuses existing `lib/ai-pool`). Supabase Postgres holds 4 tables (`business_ideas`, `business_idea_deep`, `business_idea_benchmarks`, `business_hunter_runs`). Next.js App Router admin page + API routes gate admin via existing `getAuthUser` + `isAdmin` pattern. YAML-backed brick + agent registries seed the ideation context. Ideation = 1 Opus 4.7 call (prompt-cached system), scoring = Sonnet structured outputs in parallel. No cron: user clicks `▶ Hisoka, run`.

**Tech Stack:** Next.js 16.2 (App Router, React 19), Supabase SSR, TypeScript, `lib/ai-pool` cascade (OpenRouter → Groq → Gemini fallback), existing admin layout with inline dark gold theme, `tsx` smoke scripts for verification (repo has no unit-test framework).

**Verification model:** This repo has no vitest/jest. Each task ships with a smoke step: `tsx scripts/hisoka-smoke-<n>.ts` OR `curl` against dev server OR browser check. No `- [ ] Write failing test` steps — replaced by `- [ ] Write smoke script` that exits non-zero on invariant break.

**Spec source:** `docs/superpowers/specs/2026-04-22-business-hunter-design.md` (section 10 — Phase 1 scope).

**Memory rules applied:**
- `feedback_llc_gate_expat` → ideas with `llc_gate = "blocked"` auto-archived
- `feedback_infinite_overshoot` → Phase 1 cost cap ≤ €40/mo (manual runs only)
- `feedback_kakashi_reuse` → reuse `lib/ai-pool`, `lib/supabase-server`, admin layout patterns
- `feedback_commit_continu` → commit after each task (every ~15–20 min)

---

## File Structure

**Created files:**
```
command-center/
├── docs/superpowers/specs/2026-04-22-business-hunter-design.md   [already exists]
├── infra/brick-registry.yaml                                      [NEW — curated brick inventory]
├── infra/minato-roster.yaml                                       [NEW — curated agents inventory]
├── lib/hisoka/
│   ├── types.ts                                                   [NEW — shared types]
│   ├── registries.ts                                              [NEW — YAML loaders, cached]
│   ├── prompts.ts                                                 [NEW — system + user prompt builders]
│   ├── scoring.ts                                                 [NEW — hard gates + score formula, code-only]
│   ├── pipeline.ts                                                [NEW — orchestrates discovery run]
│   └── deep.ts                                                    [NEW — orchestrates deep-dive run]
├── scripts/
│   ├── hisoka-smoke-pipeline.ts                                   [NEW — end-to-end smoke]
│   └── hisoka-seed-sample.ts                                      [NEW — insert 1 fake idea for UI dev]
├── supabase/migrations/
│   └── 20260422100000_hisoka_phase1.sql                           [NEW — 4 tables + RLS]
├── app/api/business-hunter/
│   ├── run/route.ts                                               [NEW — POST trigger discovery]
│   ├── ideas/route.ts                                             [NEW — GET list]
│   ├── ideas/[id]/route.ts                                        [NEW — GET single]
│   ├── ideas/[id]/deep/route.ts                                   [NEW — POST run deep dive]
│   └── benchmark/route.ts                                         [NEW — POST user-text → scored]
└── app/admin/hisoka/
    ├── page.tsx                                                   [NEW — top-20 table + controls]
    ├── components/
    │   ├── RunButton.tsx                                          [NEW — client button with status polling]
    │   ├── IdeasTable.tsx                                         [NEW — sortable, filterable table]
    │   ├── DeepDiveDrawer.tsx                                     [NEW — right drawer with autonomy + MRR + verdict]
    │   └── BenchmarkModal.tsx                                     [NEW — textarea → scored result]
    └── types.ts                                                   [NEW — UI-only types]
```

**Modified files:**
```
app/admin/layout.tsx                                                [+1 nav item in Agents group]
```

Dependency count: 0 new npm packages (we reuse `lib/ai-pool`; YAML parsed by a tiny inline reader since yaml is not in deps — stay lean, use JSON5-like subset OR ship YAML as JSON).

> **YAML decision:** To avoid adding a new dep, registries ship as **`.json` files** (same structure as YAML in the spec). Filenames stay `brick-registry.yaml`-shaped in discussion but actual files are `.json`. Document this in Task 2.

---

## Task 1 — Supabase migration (4 tables + RLS)

**Files:**
- Create: `supabase/migrations/20260422100000_hisoka_phase1.sql`

**Scope:** All 4 tables per spec §3, admin-only RLS, generated autonomy column, sensible indexes. No view yet (Phase 4).

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260422100000_hisoka_phase1.sql`:

```sql
-- Hisoka Phase 1 — Business Hunter catalog + runs + deep dive + benchmarks.
-- Spec: docs/superpowers/specs/2026-04-22-business-hunter-design.md §3
-- RLS: admin-only read/write via site_access 'cc' + role 'admin' (pattern from auth_v2).

begin;

create extension if not exists pgcrypto;

-- ──────────────────────────────────────────────────────────────────────────────
-- business_ideas : catalog, upserted by discovery pipeline
-- ──────────────────────────────────────────────────────────────────────────────
create table if not exists public.business_ideas (
  id                        uuid primary key default gen_random_uuid(),
  slug                      text unique not null,
  name                      text not null,
  tagline                   text not null,
  category                  text not null check (category in (
                              'middleware_api','data_platform','productized_service',
                              'marketplace','content_platform','tool_utility','b2b_integration')),

  autonomy_acquisition      numeric(3,2),
  autonomy_content_ops      numeric(3,2),
  autonomy_fulfillment      numeric(3,2),
  autonomy_support          numeric(3,2),
  autonomy_billing          numeric(3,2),
  autonomy_compliance       numeric(3,2),
  autonomy_score            numeric(3,2) generated always as (
                              least(autonomy_acquisition, autonomy_content_ops, autonomy_fulfillment,
                                    autonomy_support, autonomy_billing, autonomy_compliance)
                            ) stored,

  setup_hours_user             numeric(5,1) not null,
  ongoing_user_hours_per_month numeric(4,1) not null,

  distribution_channels     jsonb not null default '[]'::jsonb,
  monetization_model        text not null,
  pricing_tiers             jsonb,

  assets_leveraged          jsonb,
  asset_leverage_bonus      numeric(3,2),

  unit_economics            jsonb,
  self_funding_score        numeric(3,2),
  infra_scaling_curve       text,

  llc_gate                  text not null check (llc_gate in ('none','needs_llc','post_expat','blocked')),
  compliance_notes          text,

  effort_weeks              numeric(4,1) not null,
  monthly_ops_cost_eur      numeric(8,2),
  scalability_per_worker    text check (scalability_per_worker in ('linear','step','capped')),

  mrr_conservative          jsonb,
  mrr_median                jsonb,
  mrr_optimistic            jsonb,

  fleet_multipliers         jsonb,
  leverage_configs          jsonb not null default '[]'::jsonb,
  optimal_config            jsonb,
  leverage_elasticity       text check (leverage_elasticity in ('high','medium','flat')),

  irr_y3_pct                numeric(6,2),
  sp500_delta_pct           numeric(6,2),
  risk_score                numeric(3,2),
  sharpe_proxy              numeric(4,2),

  minato_agents_assigned    jsonb,
  new_minato_agents_needed  jsonb,
  operability_score         numeric(3,2),

  sources                   jsonb,
  rationale                 text,

  rank                      int,
  score                     numeric(8,2),

  discovered_at             timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  archived_at               timestamptz
);

create index if not exists idx_biz_ideas_rank       on public.business_ideas(rank) where rank is not null;
create index if not exists idx_biz_ideas_category   on public.business_ideas(category);
create index if not exists idx_biz_ideas_updated    on public.business_ideas(updated_at desc);
create index if not exists idx_biz_ideas_llc_gate   on public.business_ideas(llc_gate);

-- ──────────────────────────────────────────────────────────────────────────────
-- business_idea_deep : on-click deep analysis, cached 30d
-- ──────────────────────────────────────────────────────────────────────────────
create table if not exists public.business_idea_deep (
  id                uuid primary key default gen_random_uuid(),
  idea_id           uuid not null references public.business_ideas(id) on delete cascade,
  version           int not null,
  autonomy_proof    jsonb,
  distribution_audit jsonb,
  monetization_audit jsonb,
  stack_feasibility jsonb,
  monte_carlo       jsonb,
  cumulative_pnl    jsonb,
  go_no_go          text check (go_no_go in ('go','conditional','no_go')),
  blockers          jsonb,
  assumptions       jsonb,
  analyzed_at       timestamptz not null default now(),
  cost_eur          numeric(6,2),
  unique(idea_id, version)
);
create index if not exists idx_biz_deep_idea on public.business_idea_deep(idea_id, version desc);

-- ──────────────────────────────────────────────────────────────────────────────
-- business_idea_benchmarks : user-submitted ideas scored against the catalog
-- ──────────────────────────────────────────────────────────────────────────────
create table if not exists public.business_idea_benchmarks (
  id             uuid primary key default gen_random_uuid(),
  user_input     text not null,
  scored_fields  jsonb,
  rank_if_added  int,
  verdict        text,
  analyzed_at    timestamptz not null default now(),
  cost_eur       numeric(6,2)
);

-- ──────────────────────────────────────────────────────────────────────────────
-- business_hunter_runs : log of every discovery / benchmark trigger
-- ──────────────────────────────────────────────────────────────────────────────
create table if not exists public.business_hunter_runs (
  id                uuid primary key default gen_random_uuid(),
  trigger           text not null check (trigger in ('cron','manual','benchmark')),
  started_at        timestamptz not null default now(),
  finished_at       timestamptz,
  ideas_discovered  int,
  ideas_upserted    int,
  cost_eur          numeric(6,2),
  status            text not null default 'running' check (status in ('running','success','failed')),
  error             text
);
create index if not exists idx_biz_runs_started on public.business_hunter_runs(started_at desc);

-- ──────────────────────────────────────────────────────────────────────────────
-- RLS : admin-only (service role bypasses; anon blocked)
-- ──────────────────────────────────────────────────────────────────────────────
alter table public.business_ideas             enable row level security;
alter table public.business_idea_deep         enable row level security;
alter table public.business_idea_benchmarks   enable row level security;
alter table public.business_hunter_runs       enable row level security;

-- No policies => only service_role can read/write. API routes use service role.
-- (Matches the pattern used in the cc_workers migration.)

commit;
```

- [ ] **Step 2: Apply the migration**

Two supported paths (pick whichever works first):

A — Supabase CLI:
```bash
cd /root/command-center
npx supabase db push
```

B — Management API bypass (per memory `reference_supabase_migration_bypass`):
```bash
# Requires SUPABASE_ACCESS_TOKEN and project ref in env; one-liner POSTs the SQL.
bash scripts/supabase-remote-exec.sh supabase/migrations/20260422100000_hisoka_phase1.sql
```

Expected: `NOTICE` lines from Postgres, no errors. Four new tables visible in Supabase Studio.

- [ ] **Step 3: Verify schema**

Run:
```bash
curl -s -X POST "https://$PROJECT_REF.supabase.co/rest/v1/business_ideas?select=id" \
  -H "apikey: $SERVICE_ROLE_KEY" -H "Authorization: Bearer $SERVICE_ROLE_KEY" | head -5
```
Expected: `[]` (empty array, no error).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260422100000_hisoka_phase1.sql
git commit -m "feat(hisoka): 🃏 Phase 1 migration — 4 tables (ideas/deep/benchmarks/runs) + admin RLS

Catalog, deep analysis cache, user-idea benchmarks, run log.
Generated autonomy_score column (LEAST of 6 dims, weakest-link).
RLS enabled with no policies → service_role only (API route uses service role).
Indexes on rank, category, updated_at, llc_gate.

Refs: docs/superpowers/specs/2026-04-22-business-hunter-design.md §3"
```

---

## Task 2 — Brick & Minato registries (JSON, not YAML)

**Files:**
- Create: `infra/brick-registry.json`
- Create: `infra/minato-roster.json`
- Create: `lib/hisoka/registries.ts`

**Scope:** Curated, version-controlled inventories the Ideator uses as context. Shipped as JSON (not YAML) to avoid adding a dep. Content mirrors spec §3.5.

- [ ] **Step 1: Write `infra/brick-registry.json`**

```json
{
  "bricks": [
    {
      "id": "auth_webauthn",
      "name": "WebAuthn biometric auth + Supabase + site_access",
      "projects_using": ["ftg", "ofa", "cc", "estate"],
      "files_pointer": "feel-the-gap/lib/auth, command-center/lib/auth-v2",
      "saves_dev_weeks": 4,
      "maturity": "production",
      "enables": ["user auth on any new site", "cross-site sessions", "admin gating"],
      "requires": ["supabase_shared"]
    },
    {
      "id": "marketplace_matching",
      "name": "B2B matching engine with commission",
      "projects_using": ["ftg"],
      "saves_dev_weeks": 6,
      "maturity": "production",
      "enables": ["2-sided marketplaces with escrow", "supply/demand scoring"],
      "requires": ["auth_webauthn", "stripe_subs"]
    },
    {
      "id": "scraper_oignon",
      "name": "Multi-source scraper (HN/PH/Reddit/Trends)",
      "projects_using": ["ofa", "cc"],
      "saves_dev_weeks": 3,
      "maturity": "production",
      "enables": ["signal harvesting", "competitor monitoring", "lead enrichment"]
    },
    {
      "id": "image_cascade",
      "name": "9-source image generation cascade with free-tier failover",
      "projects_using": ["ofa", "ftg"],
      "saves_dev_weeks": 5,
      "maturity": "production",
      "enables": ["illustrated content at scale", "hero images", "product shots"]
    },
    {
      "id": "llm_cascade",
      "name": "Multi-provider LLM with prompt-cache + locale-aware",
      "projects_using": ["ftg", "cc", "ofa"],
      "saves_dev_weeks": 4,
      "maturity": "production",
      "enables": ["any LLM-powered feature", "multi-lang content"]
    },
    {
      "id": "stripe_subs_tier",
      "name": "Stripe subscriptions with tier-gating matrix",
      "projects_using": ["ftg", "cc"],
      "saves_dev_weeks": 3,
      "maturity": "production",
      "enables": ["tiered pricing", "usage metering", "dunning"]
    },
    {
      "id": "geo_pricing",
      "name": "Per-country pricing with 195 multipliers (PPP + BigMac + Numbeo)",
      "projects_using": ["ftg"],
      "saves_dev_weeks": 2,
      "maturity": "production",
      "enables": ["fair regional pricing", "PPP-adjusted offers"]
    },
    {
      "id": "i18n_helpers",
      "name": "Multi-locale helpers + 12 Supabase lang tables",
      "projects_using": ["ftg", "cc", "ofa"],
      "saves_dev_weeks": 3,
      "maturity": "production",
      "enables": ["any site in 12+ languages"]
    },
    {
      "id": "warm_outreach",
      "name": "Warm-network dispatcher + 3 persona sequences",
      "projects_using": ["ftg"],
      "saves_dev_weeks": 4,
      "maturity": "production",
      "enables": ["automated cold email at scale", "CRM-free outbound"]
    },
    {
      "id": "video_gen",
      "name": "Seedance + ElevenLabs video pipeline",
      "projects_using": ["ftg"],
      "saves_dev_weeks": 3,
      "maturity": "production",
      "enables": ["ad videos", "product demos", "tutorials"]
    },
    {
      "id": "cc_fleet",
      "name": "N-worker CC fleet (tickets + claims + scoring + anti-loop)",
      "projects_using": ["cc"],
      "saves_dev_weeks": 8,
      "maturity": "beta",
      "enables": ["parallel AI dev execution"]
    }
  ]
}
```

- [ ] **Step 2: Write `infra/minato-roster.json`**

```json
{
  "minato_agents": [
    { "id": "rock_lee_v2",  "icon": "🥋", "name": "Rock Lee v2 — persistent outreach & content push",
      "covers_autonomy_dims": ["acquisition", "content_ops"], "status": "production", "ops_cost_eur_mo": 15 },
    { "id": "shikamaru",    "icon": "🧠", "name": "Shikamaru — strategic opportunity matrix",
      "covers_autonomy_dims": ["acquisition"], "status": "production" },
    { "id": "shisui",       "icon": "🧪", "name": "Shisui — content generation pipeline",
      "covers_autonomy_dims": ["content_ops"], "status": "production" },
    { "id": "itachi",       "icon": "👁", "name": "Itachi — intent reader / classifier",
      "covers_autonomy_dims": ["acquisition", "support"], "status": "production" },
    { "id": "hancock",      "icon": "💄", "name": "Hancock — charm / persuasive copy",
      "covers_autonomy_dims": ["acquisition", "content_ops"], "status": "production" },
    { "id": "kakashi",      "icon": "🔍", "name": "Kakashi — copy ninja / brick-reuse scanner",
      "covers_autonomy_dims": ["content_ops"], "status": "production" },
    { "id": "kurama",       "icon": "🦊", "name": "Kurama — image cascade (9-source failover)",
      "covers_autonomy_dims": ["content_ops"], "status": "production", "ops_cost_eur_mo": 0 },
    { "id": "dokho",        "icon": "⚖️", "name": "Dokho — guardian (DB/matviews/caches)",
      "covers_autonomy_dims": ["fulfillment", "compliance"], "status": "production" },
    { "id": "neji",         "icon": "🎯", "name": "Neji — supervisor / infinite overshoot",
      "covers_autonomy_dims": ["fulfillment"], "status": "production" },
    { "id": "senku",        "icon": "🔬", "name": "Senku — root-cause auditor",
      "covers_autonomy_dims": ["compliance", "support"], "status": "production" },
    { "id": "might_guy",    "icon": "🛡", "name": "Might Guy — security / defense",
      "covers_autonomy_dims": ["compliance"], "status": "production" },
    { "id": "kushina",      "icon": "💫", "name": "Kushina — kaizen (continuous improvement)",
      "covers_autonomy_dims": ["content_ops", "fulfillment"], "status": "production" },
    { "id": "merlin",       "icon": "🧙", "name": "Merlin — scheduled wisdom / cron strategist",
      "covers_autonomy_dims": ["fulfillment"], "status": "production" }
  ]
}
```

- [ ] **Step 3: Write `lib/hisoka/registries.ts`**

```ts
// Loads brick + agent registries from infra/*.json. Cached once per server process.
// Kept tiny — no external YAML parser.

import { promises as fs } from 'node:fs';
import path from 'node:path';

export type Brick = {
  id: string;
  name: string;
  projects_using: string[];
  files_pointer?: string;
  saves_dev_weeks: number;
  maturity?: 'prototype' | 'beta' | 'production';
  enables: string[];
  requires?: string[];
};

export type MinatoAgent = {
  id: string;
  icon: string;
  name: string;
  covers_autonomy_dims: Array<
    'acquisition' | 'content_ops' | 'fulfillment' | 'support' | 'billing' | 'compliance'
  >;
  status: 'prototype' | 'beta' | 'production';
  ops_cost_eur_mo?: number;
};

let bricksCache: Brick[] | null = null;
let agentsCache: MinatoAgent[] | null = null;

async function loadJson<T>(rel: string): Promise<T> {
  const abs = path.join(process.cwd(), rel);
  const raw = await fs.readFile(abs, 'utf-8');
  return JSON.parse(raw) as T;
}

export async function getBricks(): Promise<Brick[]> {
  if (bricksCache) return bricksCache;
  const j = await loadJson<{ bricks: Brick[] }>('infra/brick-registry.json');
  bricksCache = j.bricks;
  return bricksCache;
}

export async function getMinatoAgents(): Promise<MinatoAgent[]> {
  if (agentsCache) return agentsCache;
  const j = await loadJson<{ minato_agents: MinatoAgent[] }>('infra/minato-roster.json');
  agentsCache = j.minato_agents;
  return agentsCache;
}

// Test-only: clear the module cache (call before re-reading files in tests/smoke).
export function __clearRegistryCache() {
  bricksCache = null;
  agentsCache = null;
}
```

- [ ] **Step 4: Smoke verify**

```bash
cd /root/command-center
npx tsx -e "import('./lib/hisoka/registries.ts').then(async m => {
  const b = await m.getBricks();
  const a = await m.getMinatoAgents();
  console.log('bricks:', b.length, 'agents:', a.length);
  if (b.length < 5 || a.length < 10) { console.error('FAIL: registry too small'); process.exit(1); }
  console.log('OK');
})"
```
Expected: `bricks: 11 agents: 13\nOK`

- [ ] **Step 5: Commit**

```bash
git add infra/brick-registry.json infra/minato-roster.json lib/hisoka/registries.ts
git commit -m "feat(hisoka): 🃏 brick registry + minato roster (JSON) + loader

11 bricks (auth_webauthn, marketplace_matching, scraper_oignon, image_cascade,
llm_cascade, stripe_subs_tier, geo_pricing, i18n_helpers, warm_outreach,
video_gen, cc_fleet) + 13 minato agents with autonomy-dim coverage.
Process-lifetime cache in lib/hisoka/registries.ts."
```

---

## Task 3 — Shared types + scoring (code-only, pure functions)

**Files:**
- Create: `lib/hisoka/types.ts`
- Create: `lib/hisoka/scoring.ts`
- Create: `scripts/hisoka-smoke-scoring.ts`

**Scope:** All TS types that pipeline + API + UI share. Hard gates and score formula per spec §4, code-only (no LLM). Smoke script proves a known-good idea passes and a known-bad idea is filtered.

- [ ] **Step 1: Write `lib/hisoka/types.ts`**

```ts
// Shared Hisoka types. Kept flat so pipeline, API, and UI all import from here.

export type AutonomyDim =
  | 'acquisition' | 'content_ops' | 'fulfillment'
  | 'support' | 'billing' | 'compliance';

export type Category =
  | 'middleware_api' | 'data_platform' | 'productized_service'
  | 'marketplace' | 'content_platform' | 'tool_utility' | 'b2b_integration';

export type LlcGate = 'none' | 'needs_llc' | 'post_expat' | 'blocked';

export type MrrCurve = { m1: number; m3: number; m6: number; m12: number; m24: number; m36: number };

export type LeverageConfig = {
  label: 'bootstrap' | 'accelerated' | 'turbo' | 'overkill';
  launch_eur: number;
  workers: number;
  leverage: number;          // MRR_y3 / capital_cost, dimensionless
  mrr_curve: MrrCurve;
  irr_y3_pct: number;
  sp500_delta_pct: number;
  risk_score: number;        // 0..1
  notes?: string;
};

export type UnitEconomics = {
  v10:  { rev_eur_mo: number; cost_eur_mo: number; gm_pct: number };
  v100: { rev_eur_mo: number; cost_eur_mo: number; gm_pct: number };
  v1k:  { rev_eur_mo: number; cost_eur_mo: number; gm_pct: number };
  v10k: { rev_eur_mo: number; cost_eur_mo: number; gm_pct: number };
};

// Shape emitted by the Ideator / Scorer (before DB insert).
export type ScoredIdea = {
  slug: string;
  name: string;
  tagline: string;
  category: Category;
  autonomy: Record<AutonomyDim, number>;
  setup_hours_user: number;
  ongoing_user_hours_per_month: number;
  distribution_channels: string[];
  monetization_model: 'subscription' | 'usage' | 'hybrid' | 'commission';
  pricing_tiers?: Array<{ name: string; price_eur: number; limits?: string; gm_pct?: number }>;
  assets_leveraged: string[];   // brick ids
  unit_economics: UnitEconomics;
  self_funding_score: number;   // 1.0 = GM+ at every breakpoint
  infra_scaling_curve?: 'logarithmic' | 'linear' | 'breaks_at_Xk';
  llc_gate: LlcGate;
  compliance_notes?: string;
  effort_weeks: number;
  monthly_ops_cost_eur: number;
  scalability_per_worker: 'linear' | 'step' | 'capped';
  mrr_conservative: MrrCurve;
  mrr_median: MrrCurve;
  mrr_optimistic: MrrCurve;
  fleet_multipliers?: Record<string, number>;
  leverage_configs: LeverageConfig[];
  optimal_config?: LeverageConfig;
  leverage_elasticity?: 'high' | 'medium' | 'flat';
  minato_agents_assigned?: Partial<Record<AutonomyDim, string>>;
  new_minato_agents_needed?: Array<{ name: string; role: string; covers_dim: AutonomyDim; dev_weeks: number }>;
  operability_score?: number;
  sources?: Array<{ url: string; type: string }>;
  rationale: string;
};

export type GateResult = { passed: boolean; reasons: string[] };

export type HunterRunResult = {
  run_id: string;
  ideas_discovered: number;
  ideas_upserted: number;
  cost_eur: number;
  top20_slugs: string[];
};
```

- [ ] **Step 2: Write `lib/hisoka/scoring.ts`**

```ts
// Hard gates + base score (spec §4). Pure functions, no I/O.

import type { ScoredIdea, GateResult } from './types';

const MIN_AUTONOMY = 0.9;
const MAX_SETUP_HOURS = 40;
const MAX_ONGOING_HOURS_PER_MONTH = 1;

const HOURLY_RATE_PROXY_EUR = 100;     // implicit user-time cost
const WORKER_COST_OVER_3Y_EUR = 7200;  // ~€200/mo × 36

export function autonomyScore(a: ScoredIdea['autonomy']): number {
  return Math.min(a.acquisition, a.content_ops, a.fulfillment, a.support, a.billing, a.compliance);
}

export function hardGates(idea: ScoredIdea): GateResult {
  const reasons: string[] = [];
  const aScore = autonomyScore(idea.autonomy);
  if (aScore < MIN_AUTONOMY) reasons.push(`autonomy ${aScore.toFixed(2)} < ${MIN_AUTONOMY}`);
  if (idea.setup_hours_user > MAX_SETUP_HOURS)
    reasons.push(`setup ${idea.setup_hours_user}h > ${MAX_SETUP_HOURS}h`);
  if (idea.ongoing_user_hours_per_month > MAX_ONGOING_HOURS_PER_MONTH)
    reasons.push(`ongoing ${idea.ongoing_user_hours_per_month}h/mo > ${MAX_ONGOING_HOURS_PER_MONTH}h/mo`);
  if (!idea.distribution_channels?.length) reasons.push('no distribution channel');
  if (idea.self_funding_score < 1.0) reasons.push(`self_funding_score ${idea.self_funding_score} < 1.0`);
  if (idea.llc_gate === 'blocked') reasons.push('llc_gate=blocked');
  return { passed: reasons.length === 0, reasons };
}

export function assetLeverageBonus(assetsLeveraged: string[]): number {
  // 1.0 base + 0.1 per reused brick, capped at 1.5
  return Math.min(1.5, 1.0 + 0.1 * (assetsLeveraged?.length ?? 0));
}

// MRR_y3 approx = median m36 value (end of year 3). Sum of curve would overweight tail; use m36.
export function mrrY3Cumulative(median: ScoredIdea['mrr_median']): number {
  // Sum monthly MRR×12 across years — cheap proxy for cumulative revenue.
  // Interpolate between anchor points linearly.
  const anchors: Array<[number, number]> = [
    [1, median.m1], [3, median.m3], [6, median.m6],
    [12, median.m12], [24, median.m24], [36, median.m36],
  ];
  let total = 0;
  for (let m = 1; m <= 36; m++) {
    // find bracket
    let lo = anchors[0], hi = anchors[anchors.length - 1];
    for (let i = 0; i < anchors.length - 1; i++) {
      if (anchors[i][0] <= m && anchors[i + 1][0] >= m) { lo = anchors[i]; hi = anchors[i + 1]; break; }
    }
    const t = hi[0] === lo[0] ? 0 : (m - lo[0]) / (hi[0] - lo[0]);
    total += lo[1] + (hi[1] - lo[1]) * t;
  }
  return total;
}

export function baseScore(idea: ScoredIdea): number {
  const aScore = autonomyScore(idea.autonomy);
  const mrr = mrrY3Cumulative(idea.mrr_median);
  const launchEur = idea.leverage_configs[0]?.launch_eur ?? 0;   // bootstrap envelope
  const workers  = idea.leverage_configs[0]?.workers ?? 1;
  const denom =
    launchEur +
    workers * WORKER_COST_OVER_3Y_EUR +
    idea.setup_hours_user * HOURLY_RATE_PROXY_EUR;
  const leverage = denom > 0 ? (mrr * aScore * aScore) / denom : 0;
  const gmAt10k = (idea.unit_economics.v10k.gm_pct ?? 0) / 100;
  const llcPenalty = idea.llc_gate === 'none' ? 1.0 : 0.7;
  return leverage * assetLeverageBonus(idea.assets_leveraged) * gmAt10k * llcPenalty;
}
```

- [ ] **Step 3: Write `scripts/hisoka-smoke-scoring.ts`**

```ts
// Smoke: feed a known-good + known-bad idea. Assert gates + ordering.

import { hardGates, baseScore, autonomyScore } from '../lib/hisoka/scoring';
import type { ScoredIdea } from '../lib/hisoka/types';

const ideaGood: ScoredIdea = {
  slug: 'good',
  name: 'Test Good',
  tagline: 't',
  category: 'middleware_api',
  autonomy: { acquisition: 0.95, content_ops: 0.95, fulfillment: 0.92, support: 0.9, billing: 1, compliance: 0.95 },
  setup_hours_user: 20,
  ongoing_user_hours_per_month: 0.5,
  distribution_channels: ['seo', 'ph_launch'],
  monetization_model: 'subscription',
  assets_leveraged: ['llm_cascade', 'auth_webauthn'],
  unit_economics: {
    v10:  { rev_eur_mo: 200,   cost_eur_mo: 50,   gm_pct: 75 },
    v100: { rev_eur_mo: 2000,  cost_eur_mo: 400,  gm_pct: 80 },
    v1k:  { rev_eur_mo: 20000, cost_eur_mo: 3000, gm_pct: 85 },
    v10k: { rev_eur_mo: 200000,cost_eur_mo: 25000,gm_pct: 87 },
  },
  self_funding_score: 1.0,
  llc_gate: 'none',
  effort_weeks: 2,
  monthly_ops_cost_eur: 20,
  scalability_per_worker: 'linear',
  mrr_conservative: { m1: 0,   m3: 100,  m6: 500,   m12: 2000,  m24: 8000,  m36: 20000 },
  mrr_median:       { m1: 100, m3: 500,  m6: 2000,  m12: 8000,  m24: 30000, m36: 70000 },
  mrr_optimistic:   { m1: 300, m3: 2000, m6: 8000,  m12: 30000, m24: 100000,m36: 250000 },
  leverage_configs: [{ label: 'bootstrap', launch_eur: 0, workers: 1, leverage: 50, mrr_curve: { m1:100,m3:500,m6:2000,m12:8000,m24:30000,m36:70000 }, irr_y3_pct: 200, sp500_delta_pct: 190, risk_score: 0.4 }],
  rationale: 'ok',
};

const ideaBadAutonomy: ScoredIdea = { ...ideaGood, slug: 'bad-autonomy',
  autonomy: { ...ideaGood.autonomy, support: 0.5 } };

const ideaBadLlc: ScoredIdea = { ...ideaGood, slug: 'bad-llc', llc_gate: 'blocked' };

const results = [
  { name: 'good passes',     r: hardGates(ideaGood).passed, expect: true },
  { name: 'bad-autonomy fails', r: hardGates(ideaBadAutonomy).passed, expect: false },
  { name: 'bad-llc fails',   r: hardGates(ideaBadLlc).passed, expect: false },
];
let failed = 0;
for (const t of results) {
  const ok = t.r === t.expect;
  console.log(ok ? 'OK  ' : 'FAIL', t.name, `(got ${t.r}, expected ${t.expect})`);
  if (!ok) failed++;
}
const sGood = baseScore(ideaGood);
console.log(`baseScore(good) = ${sGood.toFixed(2)} (should be > 0)`);
if (sGood <= 0) { console.log('FAIL baseScore not positive'); failed++; }
console.log(`autonomyScore(good) = ${autonomyScore(ideaGood.autonomy).toFixed(2)} (should be 0.90)`);
process.exit(failed ? 1 : 0);
```

- [ ] **Step 4: Run smoke**

```bash
cd /root/command-center
npx tsx scripts/hisoka-smoke-scoring.ts
```
Expected: 3 `OK`, positive base score, exit 0.

- [ ] **Step 5: Commit**

```bash
git add lib/hisoka/types.ts lib/hisoka/scoring.ts scripts/hisoka-smoke-scoring.ts
git commit -m "feat(hisoka): 🃏 shared types + hard gates + base score formula

Pure functions, no I/O. Hard gates: autonomy≥0.9, setup≤40h, ongoing≤1h/mo,
self_funding=1.0, llc_gate≠blocked, ≥1 distribution channel.
Base score = leverage × asset_bonus × gm_10k × llc_penalty (spec §4).
Smoke script asserts good passes, bad-autonomy + bad-llc both fail."
```

---

## Task 4 — Prompt builders (system + user) for Ideator and Scorer

**Files:**
- Create: `lib/hisoka/prompts.ts`

**Scope:** Pure functions that build two prompts: the Ideator system prompt (stable, prompt-cacheable) and the user prompt per run (context-injected). Plus a Scorer prompt shape for parallel per-candidate scoring. Keep stable text in a module constant for cache hits.

- [ ] **Step 1: Write `lib/hisoka/prompts.ts`**

```ts
import type { Brick, MinatoAgent } from './registries';

// Stable across runs → prompt-cacheable.
export const IDEATOR_SYSTEM = `You are Hisoka, Minato's apex Business Hunter.
You generate business ideas that can be operated 24/7 by AI with near-zero ongoing human involvement.

Hard constraints on every idea:
- ALL 6 autonomy dimensions (acquisition, content_ops, fulfillment, support, billing, compliance) ≥ 0.9 plausible
- Setup user time ≤ 40 hours total
- Ongoing user time ≤ 1 hour per month
- Self-funding at every volume tier (v10, v100, v1k, v10k users): GM positive
- At least 1 validated distribution channel (SEO, outbound email, PH launch, community, partnerships)
- Prefer ideas that reuse 2+ existing bricks
- Penalize ideas that require a US LLC if the user is still EU-resident (llc_gate: "needs_llc" or "blocked")

Output strict JSON matching the schema you are given. No prose. No markdown.
Each idea includes: slug, name, tagline, category, autonomy (6 dims), setup_hours_user,
ongoing_user_hours_per_month, distribution_channels, monetization_model, pricing_tiers,
assets_leveraged (brick ids), unit_economics (v10/v100/v1k/v10k with rev_eur_mo + cost_eur_mo + gm_pct),
self_funding_score, llc_gate, effort_weeks, monthly_ops_cost_eur, scalability_per_worker,
mrr_conservative/median/optimistic (m1,m3,m6,m12,m24,m36), leverage_configs
(bootstrap/accelerated/turbo/overkill with launch_eur, workers, mrr_curve, irr_y3_pct,
sp500_delta_pct, risk_score), rationale.

Baseline comparisons: HYSA 2%/yr, bonds 4%/yr, S&P 500 10%/yr. An idea is only worth surfacing
if its median IRR_y3 clearly beats S&P 500 at its optimal leverage config.`;

export function buildIdeatorUserPrompt(opts: {
  bricks: Brick[];
  agents: MinatoAgent[];
  previousTop20?: Array<{ slug: string; name: string; score: number }>;
  countTarget?: number;
}): string {
  const bricksList = opts.bricks.map(b =>
    `- ${b.id}: ${b.name} [saves ~${b.saves_dev_weeks}w] (used in: ${b.projects_using.join(',')})`
  ).join('\n');
  const agentsList = opts.agents.map(a =>
    `- ${a.id} ${a.icon} — covers: ${a.covers_autonomy_dims.join(',')}`
  ).join('\n');
  const prev = (opts.previousTop20 ?? []).slice(0, 20).map(p =>
    `- ${p.slug}: ${p.name} (score ${p.score.toFixed(1)})`
  ).join('\n') || '(none — first run)';
  const n = opts.countTarget ?? 30;

  return `AVAILABLE BRICKS (rewardable via assets_leveraged):
${bricksList}

AVAILABLE MINATO AGENTS (map autonomy dims to these where possible):
${agentsList}

PREVIOUS TOP 20 (avoid duplicates; generate distinct ideas):
${prev}

TASK: generate ${n} distinct business idea candidates meeting the hard constraints above.
Diversify across categories (middleware_api, data_platform, productized_service, marketplace,
content_platform, tool_utility, b2b_integration). Return strict JSON: { "ideas": [ ... ${n} items ... ] }.`;
}

// Scorer runs per candidate in parallel; prompt is short + structured.
export function buildScorerPrompt(candidateSummary: string): string {
  return `Refine and complete the following business-idea candidate with rigorous numbers:
${candidateSummary}

Output strict JSON matching the ScoredIdea schema. No prose. If any hard constraint fails,
set the offending field to its true value anyway — filtering happens in code, not here.`;
}
```

- [ ] **Step 2: Smoke verify shape**

```bash
cd /root/command-center
npx tsx -e "import('./lib/hisoka/prompts.ts').then(async m => {
  const r = await import('./lib/hisoka/registries.ts');
  const bricks = await r.getBricks();
  const agents = await r.getMinatoAgents();
  const p = m.buildIdeatorUserPrompt({ bricks, agents, countTarget: 5 });
  if (!p.includes('AVAILABLE BRICKS') || !p.includes('AVAILABLE MINATO AGENTS')) {
    console.error('FAIL'); process.exit(1);
  }
  console.log('prompt chars:', p.length, 'system chars:', m.IDEATOR_SYSTEM.length);
  console.log('OK');
})"
```
Expected: `OK`, prompt > 500 chars.

- [ ] **Step 3: Commit**

```bash
git add lib/hisoka/prompts.ts
git commit -m "feat(hisoka): 🃏 prompt builders (Ideator system + user, Scorer refiner)

IDEATOR_SYSTEM is a stable module constant → prompt-cacheable on the LLM side.
User prompt injects: bricks inventory, minato agents roster, previous top 20 slugs
(anti-duplicate), count target. Scorer prompt is short + per-candidate."
```

---

## Task 5 — Pipeline orchestrator (single-LLM MVP path)

**Files:**
- Create: `lib/hisoka/pipeline.ts`

**Scope:** One exported function `runDiscovery(supabaseAdmin)` that:
1. Inserts a `business_hunter_runs` row (status=running).
2. Loads registries + previous top 20.
3. Calls ONE LLM via `lib/ai-pool` cascade (Sonnet via OpenRouter by default) with `IDEATOR_SYSTEM` + user prompt.
4. Parses JSON response → `ScoredIdea[]`.
5. Applies `hardGates` + `baseScore` in code.
6. Upserts into `business_ideas` by `slug` with `rank` = 1..20 (top 20 only), `rank` = null for the rest (archived).
7. Updates the run row (status=success, ideas_discovered, ideas_upserted, cost_eur).

Phase 1 uses a single Sonnet call (no Opus ideation yet, no parallel scorer per §8 Phase 1 rollout → ~€0.20-0.40/run).

- [ ] **Step 1: Write `lib/hisoka/pipeline.ts`**

```ts
import type { SupabaseClient } from '@supabase/supabase-js';
import { withFallback } from '@/lib/ai-pool/cascade';
import { getBricks, getMinatoAgents } from './registries';
import { IDEATOR_SYSTEM, buildIdeatorUserPrompt } from './prompts';
import { hardGates, baseScore, autonomyScore } from './scoring';
import type { ScoredIdea, HunterRunResult } from './types';

const DEFAULT_COUNT = 30;
const TOP_N = 20;

export async function runDiscovery(
  supabaseAdmin: SupabaseClient,
  opts: { trigger: 'manual' | 'cron'; countTarget?: number } = { trigger: 'manual' },
): Promise<HunterRunResult> {
  // 1. Insert run row
  const { data: runRow, error: runErr } = await supabaseAdmin
    .from('business_hunter_runs')
    .insert({ trigger: opts.trigger, status: 'running' })
    .select('id').single();
  if (runErr || !runRow) throw new Error(`Cannot create run row: ${runErr?.message}`);
  const run_id: string = runRow.id;

  try {
    // 2. Load context
    const [bricks, agents, prevTop] = await Promise.all([
      getBricks(),
      getMinatoAgents(),
      supabaseAdmin.from('business_ideas')
        .select('slug, name, score').not('rank', 'is', null).order('rank').limit(20)
        .then(r => r.data ?? []),
    ]);

    // 3. LLM call (single Sonnet call for Phase 1)
    const userPrompt = buildIdeatorUserPrompt({
      bricks, agents,
      previousTop20: prevTop as Array<{ slug: string; name: string; score: number }>,
      countTarget: opts.countTarget ?? DEFAULT_COUNT,
    });
    const gen = await withFallback([
      { provider: 'openrouter', model: 'anthropic/claude-sonnet-4-6' },
    ], {
      system: IDEATOR_SYSTEM,
      user: userPrompt,
      temperature: 0.8,
      maxTokens: 8000,
      responseFormat: 'json',
    }, 'cc' /* ProjectTag */);
    const costEur = (gen.costUsd ?? 0) * 0.92; // USD→EUR rough

    // 4. Parse
    let parsed: { ideas: ScoredIdea[] };
    try { parsed = JSON.parse(gen.text); }
    catch (e) { throw new Error(`LLM JSON parse failed: ${String(e).slice(0, 200)}`); }
    const ideas = parsed.ideas ?? [];

    // 5. Filter + score
    const scored = ideas
      .filter(i => hardGates(i).passed)
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
        rank, score, updated_at: new Date().toISOString(),
      };
      const { error } = await supabaseAdmin
        .from('business_ideas')
        .upsert(payload, { onConflict: 'slug' });
      if (!error) upserts++;
    }

    // Archive everything previously ranked that is no longer in top 20
    const keptSlugs = scored.slice(0, TOP_N).map(s => s.idea.slug);
    await supabaseAdmin.from('business_ideas')
      .update({ rank: null, archived_at: new Date().toISOString() })
      .not('rank', 'is', null)
      .not('slug', 'in', `(${keptSlugs.map(s => `"${s}"`).join(',')})`);

    // 7. Close run
    await supabaseAdmin.from('business_hunter_runs').update({
      finished_at: new Date().toISOString(),
      ideas_discovered: ideas.length,
      ideas_upserted: upserts,
      cost_eur: costEur,
      status: 'success',
    }).eq('id', run_id);

    return {
      run_id, ideas_discovered: ideas.length, ideas_upserted: upserts,
      cost_eur: costEur, top20_slugs: keptSlugs,
    };
  } catch (e) {
    await supabaseAdmin.from('business_hunter_runs').update({
      finished_at: new Date().toISOString(),
      status: 'failed', error: String(e).slice(0, 2000),
    }).eq('id', run_id);
    throw e;
  }
}
```

> **Note on `withFallback` signature:** Check the actual exports of `lib/ai-pool/cascade.ts` before coding — if the function name or argument shape differs, adapt the call and the pipeline's parsing of `.text` and `.costUsd`. No other callers need to change.

- [ ] **Step 2: Pre-check ai-pool shape**

```bash
cd /root/command-center
npx tsx -e "const m = await import('./lib/ai-pool/index.ts'); console.log(Object.keys(m));"
```
If the exported name is NOT `withFallback`, fix the import in Step 1 accordingly before continuing.

- [ ] **Step 3: Commit**

```bash
git add lib/hisoka/pipeline.ts
git commit -m "feat(hisoka): 🃏 discovery pipeline orchestrator (Phase 1, single Sonnet call)

Flow: insert run row → load registries + prev top 20 → Sonnet call via ai-pool
cascade → JSON.parse → hardGates filter → baseScore sort → upsert with rank 1-20
→ archive evictions → close run row. ~€0.20-0.40/run, no cron."
```

---

## Task 6 — API routes

**Files:**
- Create: `app/api/business-hunter/run/route.ts`
- Create: `app/api/business-hunter/ideas/route.ts`
- Create: `app/api/business-hunter/ideas/[id]/route.ts`
- Create: `app/api/business-hunter/benchmark/route.ts`

**Scope:** Admin-gated endpoints. The service-role key is needed server-side for writes since RLS blocks anon. Pattern: `createSupabaseAdmin()` helper in `lib/supabase-server.ts` — **check if it exists; if not, inline** using `SUPABASE_SERVICE_ROLE_KEY`.

> **Sanity gate:** Before writing routes, verify `createSupabaseAdmin` is exported. If not, add a small helper in Task 6.1 and reuse it here.

- [ ] **Step 1: Check admin client helper**

```bash
cd /root/command-center
grep -n "service_role\|SERVICE_ROLE\|createSupabaseAdmin" lib/supabase-server.ts lib/supabase.ts
```
If missing, append to `lib/supabase-server.ts`:

```ts
import { createClient } from '@supabase/supabase-js';
export function createSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}
```

- [ ] **Step 2: Admin guard pattern (reused)**

Look at an existing admin API route (e.g. `app/api/cc-fleet/gap-estimate/route.ts`) to copy the admin check. Use the SAME pattern verbatim.

- [ ] **Step 3: Write `app/api/business-hunter/run/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { createSupabaseAdmin, getAuthUser } from '@/lib/supabase-server';
import { runDiscovery } from '@/lib/hisoka/pipeline';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 min max for LLM call

export async function POST() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  // TODO admin role check — reuse existing isAdmin pattern from /api/cc-fleet/gap-estimate
  try {
    const admin = createSupabaseAdmin();
    const result = await runDiscovery(admin, { trigger: 'manual' });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e).slice(0, 500) }, { status: 500 });
  }
}
```

- [ ] **Step 4: Write `app/api/business-hunter/ideas/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { createSupabaseAdmin, getAuthUser } from '@/lib/supabase-server';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  const url = new URL(req.url);
  const top = url.searchParams.get('top') === 'true';
  const admin = createSupabaseAdmin();
  let q = admin.from('business_ideas').select('*').order('score', { ascending: false }).limit(50);
  if (top) q = q.not('rank', 'is', null).order('rank').limit(20);
  const { data, error } = await q;
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, ideas: data ?? [] });
}
```

- [ ] **Step 5: Write `app/api/business-hunter/ideas/[id]/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { createSupabaseAdmin, getAuthUser } from '@/lib/supabase-server';

export const runtime = 'nodejs';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const admin = createSupabaseAdmin();
  const [{ data: idea, error: e1 }, { data: deep, error: e2 }] = await Promise.all([
    admin.from('business_ideas').select('*').eq('id', id).single(),
    admin.from('business_idea_deep').select('*').eq('idea_id', id).order('version', { ascending: false }).limit(1),
  ]);
  if (e1) return NextResponse.json({ ok: false, error: e1.message }, { status: 404 });
  return NextResponse.json({ ok: true, idea, deep: (deep?.[0]) ?? null, deep_err: e2?.message ?? null });
}
```

- [ ] **Step 6: Write `app/api/business-hunter/benchmark/route.ts` (stub for Phase 1)**

```ts
import { NextResponse } from 'next/server';
import { createSupabaseAdmin, getAuthUser } from '@/lib/supabase-server';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  const { text } = await req.json() as { text?: string };
  if (!text || text.length < 10 || text.length > 500) {
    return NextResponse.json({ ok: false, error: 'text must be 10-500 chars' }, { status: 400 });
  }
  const admin = createSupabaseAdmin();
  const { data, error } = await admin.from('business_idea_benchmarks')
    .insert({ user_input: text, verdict: 'pending (Phase 2 feature)', cost_eur: 0 })
    .select().single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, benchmark: data, note: 'scoring deferred to Phase 2' });
}
```

- [ ] **Step 7: Dev smoke**

```bash
cd /root/command-center
npm run dev &
sleep 6
curl -s http://localhost:3000/api/business-hunter/ideas?top=true | head -200
# Expected: { "ok": true, "ideas": [] }
kill %1
```

- [ ] **Step 8: Commit**

```bash
git add app/api/business-hunter/ lib/supabase-server.ts
git commit -m "feat(hisoka): 🃏 API routes — run + ideas + ideas/[id] + benchmark stub

POST /api/business-hunter/run      → runDiscovery(), returns top20_slugs + cost
GET  /api/business-hunter/ideas    → list top 20 (top=true) or all sorted by score
GET  /api/business-hunter/ideas/id → idea + latest deep analysis (null in Phase 1)
POST /api/business-hunter/benchmark → stores user text, scoring deferred to Phase 2
Auth: getAuthUser gate; admin role check stubbed (reuses cc-fleet pattern). 5min maxDuration."
```

---

## Task 7 — Admin page `/admin/hisoka` + sub-components

**Files:**
- Create: `app/admin/hisoka/page.tsx`
- Create: `app/admin/hisoka/components/RunButton.tsx`
- Create: `app/admin/hisoka/components/IdeasTable.tsx`
- Create: `app/admin/hisoka/components/DeepDiveDrawer.tsx`
- Create: `app/admin/hisoka/components/BenchmarkModal.tsx`
- Create: `app/admin/hisoka/types.ts`

**Scope:** Server component page loads initial top 20 (via direct Supabase call server-side); client island handles run button + table sorting + drawer + benchmark modal. Match existing dark-gold admin theme (inline styles, `#0A1A2E` / `#C9A84C`). No charts in Phase 1 — autonomy bar, MRR table, verdict text.

> **Design constraint:** this page is Phase 1 — ship with the minimum set of columns: #, Name, Category, Autonomy, Score, Leverage@bootstrap, LLC, Action. Sliders, elasticity filter, category chips are Phase 3.

- [ ] **Step 1: Write `app/admin/hisoka/types.ts`**

```ts
export type IdeaRow = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  category: string;
  autonomy_score: number;
  score: number;
  rank: number | null;
  llc_gate: 'none' | 'needs_llc' | 'post_expat' | 'blocked';
  assets_leveraged: string[] | null;
  leverage_configs: Array<{ label: string; leverage: number }> | null;
};
```

- [ ] **Step 2: Write `app/admin/hisoka/page.tsx`** (server component)

```tsx
import { createSupabaseAdmin } from '@/lib/supabase-server';
import type { IdeaRow } from './types';
import RunButton from './components/RunButton';
import IdeasTable from './components/IdeasTable';

export const dynamic = 'force-dynamic';

export default async function HisokaPage() {
  const admin = createSupabaseAdmin();
  const { data: ideas } = await admin.from('business_ideas')
    .select('id, slug, name, tagline, category, autonomy_score, score, rank, llc_gate, assets_leveraged, leverage_configs')
    .not('rank', 'is', null).order('rank').limit(20);

  const { data: lastRun } = await admin.from('business_hunter_runs')
    .select('started_at, status, cost_eur, ideas_upserted')
    .order('started_at', { ascending: false }).limit(1).single();

  return (
    <div style={{ padding: 24, color: '#E6EEF7' }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#C9A84C' }}>
          🃏 Hisoka — Business Hunter
        </h1>
        <div style={{ fontSize: 13, color: '#9BA8B8' }}>
          <em>"The predator who scores what others miss."</em>
          {' · '}
          Last hunt: {lastRun?.started_at ? new Date(lastRun.started_at).toLocaleString('fr-FR') : 'never'}
          {lastRun?.cost_eur ? ` · €${Number(lastRun.cost_eur).toFixed(2)}` : ''}
          {' · '}{ideas?.length ?? 0} preys in top 20
        </div>
      </div>
      <RunButton />
      <div style={{ marginTop: 16 }}>
        <IdeasTable initialIdeas={(ideas ?? []) as IdeaRow[]} />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Write `app/admin/hisoka/components/RunButton.tsx`** (client)

```tsx
'use client';
import { useState } from 'react';

export default function RunButton() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function run() {
    setBusy(true); setMsg('🃏 Hunting…');
    try {
      const r = await fetch('/api/business-hunter/run', { method: 'POST' });
      const j = await r.json();
      if (j.ok) {
        setMsg(`✓ ${j.ideas_upserted} upserted · €${Number(j.cost_eur).toFixed(2)} · reload to see`);
      } else {
        setMsg(`✗ ${j.error ?? 'failed'}`);
      }
    } catch (e) {
      setMsg(`✗ ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      <button
        onClick={run}
        disabled={busy}
        style={{
          background: busy ? '#333' : '#C9A84C', color: '#0A1A2E', fontWeight: 700,
          border: 'none', padding: '8px 16px', borderRadius: 6, cursor: busy ? 'wait' : 'pointer',
        }}>
        {busy ? '⏳ Hunting…' : '▶ Hisoka, run'}
      </button>
      {msg && <span style={{ color: '#9BA8B8', fontSize: 13 }}>{msg}</span>}
    </div>
  );
}
```

- [ ] **Step 4: Write `app/admin/hisoka/components/IdeasTable.tsx`** (client)

```tsx
'use client';
import { useState } from 'react';
import type { IdeaRow } from '../types';
import DeepDiveDrawer from './DeepDiveDrawer';

export default function IdeasTable({ initialIdeas }: { initialIdeas: IdeaRow[] }) {
  const [ideas] = useState(initialIdeas);
  const [openId, setOpenId] = useState<string | null>(null);

  if (!ideas.length) {
    return (
      <div style={{ background: '#0A1A2E', padding: 24, borderRadius: 8, border: '1px solid rgba(201,168,76,.15)',
                    color: '#9BA8B8', fontSize: 14 }}>
        Aucune proie encore. Lance Hisoka avec le bouton ci-dessus.
      </div>
    );
  }

  return (
    <>
      <div style={{ background: '#0A1A2E', borderRadius: 8, border: '1px solid rgba(201,168,76,.15)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,.03)' }}>
              {['#', 'Name', 'Category', 'Autonomy', 'Score', 'Leverage@boot', 'LLC', 'Action'].map(h => (
                <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: '#C9A84C', borderBottom: '1px solid rgba(201,168,76,.15)' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ideas.map(i => {
              const leverageBoot = i.leverage_configs?.find(c => c.label === 'bootstrap')?.leverage ?? 0;
              return (
                <tr key={i.id} style={{ borderBottom: '1px solid rgba(255,255,255,.05)' }}>
                  <td style={{ padding: '8px 10px', color: '#C9A84C' }}>{i.rank}</td>
                  <td style={{ padding: '8px 10px' }}>
                    <div style={{ fontWeight: 600 }}>{i.name}</div>
                    <div style={{ color: '#9BA8B8', fontSize: 11 }}>{i.tagline}</div>
                  </td>
                  <td style={{ padding: '8px 10px', color: '#9BA8B8', fontSize: 11 }}>{i.category}</td>
                  <td style={{ padding: '8px 10px' }}>{i.autonomy_score?.toFixed(2)}</td>
                  <td style={{ padding: '8px 10px' }}>{Number(i.score).toFixed(1)}</td>
                  <td style={{ padding: '8px 10px' }}>{leverageBoot.toFixed(1)}×</td>
                  <td style={{ padding: '8px 10px' }}>
                    {i.llc_gate === 'none' ? '✓' : i.llc_gate === 'blocked' ? '🔒' : '⚠'}
                  </td>
                  <td style={{ padding: '8px 10px' }}>
                    <button onClick={() => setOpenId(i.id)}
                            style={{ background: 'transparent', border: '1px solid #C9A84C', color: '#C9A84C', padding: '4px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 11 }}>
                      👁 Deep
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {openId && <DeepDiveDrawer ideaId={openId} onClose={() => setOpenId(null)} />}
    </>
  );
}
```

- [ ] **Step 5: Write `app/admin/hisoka/components/DeepDiveDrawer.tsx`** (client, basic)

```tsx
'use client';
import { useEffect, useState } from 'react';

export default function DeepDiveDrawer({ ideaId, onClose }: { ideaId: string; onClose: () => void }) {
  const [data, setData] = useState<any | null>(null);
  useEffect(() => {
    fetch(`/api/business-hunter/ideas/${ideaId}`).then(r => r.json()).then(setData);
  }, [ideaId]);

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, width: 520, height: '100vh',
      background: '#0A1A2E', borderLeft: '1px solid rgba(201,168,76,.2)',
      padding: 20, overflowY: 'auto', color: '#E6EEF7', zIndex: 100,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ color: '#C9A84C', fontWeight: 700, fontSize: 18 }}>{data?.idea?.name ?? '…'}</h2>
        <button onClick={onClose} style={{ background: 'transparent', color: '#9BA8B8', border: 'none', fontSize: 20, cursor: 'pointer' }}>✕</button>
      </div>
      {!data && <div>Loading…</div>}
      {data?.idea && (
        <>
          <div style={{ color: '#9BA8B8', fontSize: 13, marginBottom: 12 }}>{data.idea.tagline}</div>
          <section style={{ marginBottom: 16 }}>
            <div style={{ color: '#C9A84C', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Autonomy (6 dims)</div>
            {(['acquisition', 'content_ops', 'fulfillment', 'support', 'billing', 'compliance'] as const).map(d => {
              const v = data.idea[`autonomy_${d}`] ?? 0;
              return (
                <div key={d} style={{ marginBottom: 4, fontSize: 12 }}>
                  <span style={{ display: 'inline-block', width: 120 }}>{d}</span>
                  <span style={{ display: 'inline-block', width: 200, background: '#112233', height: 8, borderRadius: 4, verticalAlign: 'middle' }}>
                    <span style={{ display: 'block', width: `${v * 100}%`, background: v >= 0.9 ? '#6BCB77' : '#FFB84C', height: 8, borderRadius: 4 }} />
                  </span>
                  <span style={{ marginLeft: 8 }}>{Number(v).toFixed(2)}</span>
                </div>
              );
            })}
          </section>
          <section style={{ marginBottom: 16 }}>
            <div style={{ color: '#C9A84C', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>MRR Median (€/mo)</div>
            <pre style={{ background: '#112233', padding: 10, borderRadius: 4, fontSize: 11, overflowX: 'auto' }}>
              {JSON.stringify(data.idea.mrr_median, null, 2)}
            </pre>
          </section>
          <section style={{ marginBottom: 16 }}>
            <div style={{ color: '#C9A84C', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Rationale</div>
            <div style={{ fontSize: 12, color: '#9BA8B8' }}>{data.idea.rationale}</div>
          </section>
          <section>
            <div style={{ color: '#C9A84C', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Bricks reused</div>
            <div style={{ fontSize: 11 }}>{(data.idea.assets_leveraged ?? []).map((b: string) => (
              <span key={b} style={{ display: 'inline-block', margin: '2px 4px 2px 0', padding: '2px 8px', background: '#112233', borderRadius: 4 }}>+{b}</span>
            ))}</div>
          </section>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Write `app/admin/hisoka/components/BenchmarkModal.tsx`** (client, minimal Phase 1)

```tsx
'use client';
import { useState } from 'react';

export default function BenchmarkModal({ onClose }: { onClose: () => void }) {
  const [text, setText] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    const r = await fetch('/api/business-hunter/benchmark', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    const j = await r.json();
    setResult(j.ok ? (j.note ?? 'saved') : `error: ${j.error}`);
    setBusy(false);
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#0A1A2E', padding: 24, borderRadius: 8, width: 480, color: '#E6EEF7' }}>
        <h3 style={{ color: '#C9A84C', marginBottom: 10 }}>📝 Benchmark My Idea</h3>
        <textarea value={text} onChange={e => setText(e.target.value.slice(0, 500))} rows={6}
                  placeholder="Décris ton idée en 1-2 phrases…" style={{ width: '100%', background: '#112233', color: '#E6EEF7', border: '1px solid rgba(201,168,76,.2)', padding: 8 }} />
        <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between' }}>
          <button onClick={onClose} style={{ background: 'transparent', color: '#9BA8B8', border: '1px solid #444', padding: '6px 12px', borderRadius: 4 }}>Annuler</button>
          <button onClick={submit} disabled={busy || text.length < 10}
                  style={{ background: '#C9A84C', color: '#0A1A2E', fontWeight: 700, border: 'none', padding: '6px 12px', borderRadius: 4 }}>
            {busy ? '…' : 'Analyser'}
          </button>
        </div>
        {result && <div style={{ marginTop: 12, fontSize: 12, color: '#6BCB77' }}>{result}</div>}
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Add nav item**

Edit `app/admin/layout.tsx`, Agents group (line 34 onwards). Insert after the `cc-fleet` entry:

```tsx
{ href: '/admin/hisoka', label: 'Hisoka', icon: '🃏', desc: 'Business Hunter · top 20 preys · deep analysis' },
```

- [ ] **Step 8: Dev smoke (browser)**

```bash
cd /root/command-center
npm run dev
```

In browser: visit http://localhost:3000/admin/hisoka
- Expected: page loads with "Aucune proie encore" empty state, ▶ button visible.
- Click ▶. Watch Network tab. Expected: 200 response. Wait ~30-60s for Sonnet call.
- Reload. Expected: table with 20 rows.
- Click 👁 Deep on a row. Expected: drawer opens with autonomy bars + MRR + rationale.

Log output evidence goes in the commit message.

- [ ] **Step 9: Commit**

```bash
git add app/admin/hisoka/ app/admin/layout.tsx
git commit -m "feat(hisoka): 🃏 /admin/hisoka page + components (Phase 1 UI)

Server page loads top 20 + lastRun. Client island: RunButton polls /run endpoint,
IdeasTable shows 8 columns, DeepDiveDrawer fetches /ideas/[id] and renders
autonomy bars + MRR median + rationale + bricks reused. BenchmarkModal is a
stub that stores the user's text (scoring deferred to Phase 2).

Nav entry added under Agents group (after CC Fleet)."
```

---

## Task 8 — End-to-end smoke + seed sample

**Files:**
- Create: `scripts/hisoka-seed-sample.ts`
- Create: `scripts/hisoka-smoke-pipeline.ts`

**Scope:** Seed one hand-rolled idea so the UI works without an LLM call, then a full pipeline smoke with a real (but cheap) LLM call to catch provider/prompt regressions.

- [ ] **Step 1: Write `scripts/hisoka-seed-sample.ts`**

```ts
// Inserts 1 canned idea at rank=1 so the UI has something before the first LLM run.
import { createSupabaseAdmin } from '../lib/supabase-server';

const sample = {
  slug: 'sample-ppp-pricing-api',
  name: 'PPP Pricing API',
  tagline: 'Geo-aware SaaS pricing as a service (195 countries, 4 sources).',
  category: 'middleware_api',
  autonomy_acquisition: 0.92, autonomy_content_ops: 0.95, autonomy_fulfillment: 0.98,
  autonomy_support: 0.9, autonomy_billing: 0.97, autonomy_compliance: 0.95,
  setup_hours_user: 16,
  ongoing_user_hours_per_month: 0.5,
  distribution_channels: ['seo', 'ph_launch', 'dev_tools_directories'],
  monetization_model: 'subscription',
  assets_leveraged: ['geo_pricing', 'stripe_subs_tier', 'llm_cascade'],
  asset_leverage_bonus: 1.3,
  unit_economics: {
    v10:  { rev_eur_mo: 200,   cost_eur_mo: 40,   gm_pct: 80 },
    v100: { rev_eur_mo: 2000,  cost_eur_mo: 300,  gm_pct: 85 },
    v1k:  { rev_eur_mo: 20000, cost_eur_mo: 2500, gm_pct: 87 },
    v10k: { rev_eur_mo: 200000,cost_eur_mo: 22000,gm_pct: 89 },
  },
  self_funding_score: 1.0,
  llc_gate: 'none',
  effort_weeks: 2,
  monthly_ops_cost_eur: 25,
  scalability_per_worker: 'linear',
  mrr_conservative: { m1: 50, m3: 300, m6: 900, m12: 2500, m24: 8000, m36: 18000 },
  mrr_median:       { m1: 100, m3: 800, m6: 2500, m12: 7000, m24: 25000, m36: 55000 },
  mrr_optimistic:   { m1: 200, m3: 2000, m6: 7000, m12: 20000, m24: 70000, m36: 150000 },
  leverage_configs: [
    { label: 'bootstrap',  launch_eur: 0,    workers: 1, leverage: 35, mrr_curve: { m1:100,m3:800,m6:2500,m12:7000,m24:25000,m36:55000 }, irr_y3_pct: 180, sp500_delta_pct: 170, risk_score: 0.35 },
    { label: 'accelerated',launch_eur: 1000, workers: 2, leverage: 42, mrr_curve: { m1:200,m3:1500,m6:4500,m12:12000,m24:40000,m36:85000 }, irr_y3_pct: 220, sp500_delta_pct: 210, risk_score: 0.4 },
    { label: 'turbo',      launch_eur: 3000, workers: 3, leverage: 48, mrr_curve: { m1:400,m3:3000,m6:9000,m12:22000,m24:70000,m36:140000 }, irr_y3_pct: 260, sp500_delta_pct: 250, risk_score: 0.5 },
    { label: 'overkill',   launch_eur: 5000, workers: 5, leverage: 40, mrr_curve: { m1:600,m3:4500,m6:12000,m12:28000,m24:85000,m36:165000 }, irr_y3_pct: 240, sp500_delta_pct: 230, risk_score: 0.6 },
  ],
  optimal_config: { label: 'turbo', leverage: 48 },
  leverage_elasticity: 'high',
  rationale: 'Geo-pricing brick ready, LLM + Stripe already wired. Dev-tools directories + PH launch = low-CAC distribution. GM > 80% at every tier.',
  rank: 1,
  score: 120.5,
};

const admin = createSupabaseAdmin();
const { error } = await admin.from('business_ideas').upsert(sample, { onConflict: 'slug' });
if (error) { console.error(error); process.exit(1); }
console.log('seeded sample idea at rank=1');
```

- [ ] **Step 2: Run seed**

```bash
cd /root/command-center
npx tsx scripts/hisoka-seed-sample.ts
```
Expected: `seeded sample idea at rank=1`

- [ ] **Step 3: Verify UI renders the seed**

Visit `/admin/hisoka` in a browser. Expect 1 row ("PPP Pricing API"), deep drawer shows autonomy bars all green/orange and MRR curve.

- [ ] **Step 4: Write `scripts/hisoka-smoke-pipeline.ts`**

```ts
// Full pipeline smoke: calls the live LLM. Costs ~€0.20-0.40. Run manually, not in CI.
import { createSupabaseAdmin } from '../lib/supabase-server';
import { runDiscovery } from '../lib/hisoka/pipeline';

const admin = createSupabaseAdmin();
const t0 = Date.now();
const r = await runDiscovery(admin, { trigger: 'manual', countTarget: 10 });
const dt = ((Date.now() - t0) / 1000).toFixed(1);
console.log(`run_id=${r.run_id} discovered=${r.ideas_discovered} upserted=${r.ideas_upserted} cost=€${r.cost_eur.toFixed(2)} dt=${dt}s`);
if (r.ideas_upserted < 3) { console.error('FAIL: too few ideas upserted'); process.exit(1); }
console.log('top:', r.top20_slugs.slice(0, 5));
console.log('OK');
```

- [ ] **Step 5: Run the smoke (manual, costs ~€0.30)**

```bash
cd /root/command-center
npx tsx scripts/hisoka-smoke-pipeline.ts
```
Expected: `ideas_upserted >= 3`, cost printed, exit 0.

If the LLM returns malformed JSON, iterate on the prompt in `lib/hisoka/prompts.ts` (add "You MUST return strict JSON starting with `{`" etc.). Do NOT add a YAML/JSON5 parser.

- [ ] **Step 6: Commit**

```bash
git add scripts/hisoka-seed-sample.ts scripts/hisoka-smoke-pipeline.ts
git commit -m "chore(hisoka): 🃏 seed sample idea + end-to-end pipeline smoke

Seed inserts 1 canned idea (PPP Pricing API, rank=1) so the UI has data before
the first LLM run. Pipeline smoke calls runDiscovery() with countTarget=10,
asserts ≥3 ideas upserted, prints cost + duration."
```

---

## Task 9 — Memory update + PR handoff

**Files:**
- Create: `/root/.claude/projects/-root/memory/project_hisoka_phase1.md`
- Modify: `/root/.claude/projects/-root/memory/MEMORY.md` (add index line)

**Scope:** Record that Hisoka Phase 1 is live, what's deferred to Phase 2/3/4, where files live. Future sessions recall context without re-reading the whole spec.

- [ ] **Step 1: Write the memory**

```markdown
---
name: Hisoka Phase 1 MVP live
description: 🃏 Hisoka Business Hunter Phase 1 MVP — manual run only, Sonnet pipeline, top 20 table + basic deep dive, cost ≤€40/mo. Phase 2-4 deferred.
type: project
---

# Hisoka Phase 1 MVP (2026-04-22)

Shipped in `command-center/` per spec `docs/superpowers/specs/2026-04-22-business-hunter-design.md`:
- 4 tables: business_ideas, business_idea_deep, business_idea_benchmarks, business_hunter_runs
- lib/hisoka: types, scoring (hard gates + baseScore), registries, prompts, pipeline
- infra/brick-registry.json (11 bricks) + infra/minato-roster.json (13 agents)
- API: /api/business-hunter/{run,ideas,ideas/[id],benchmark}
- UI: /admin/hisoka (top 20 table + run button + deep drawer + benchmark stub)
- Nav entry under Agents group with 🃏 icon

**Phase 2 deferred:** signal harvester (HN/PH/Reddit), cron runner, real benchmark scoring.
**Phase 3 deferred:** fleet + budget sliders, leverage configs UI, elasticity filter, portfolio mode.
**Phase 4 deferred:** dashboard tile, cross-links, Monte Carlo, push-to-Minato action.

**Cost:** manual trigger only, ~€0.20-0.40 per run, projected ≤€40/mo per spec §8.

**Why:** Spec said "Ready for implementation plan" after 852-line design. Phase 1 delivers the
smallest useful unit — empty catalog → user clicks → 20 ranked ideas visible.
**How to apply:** Before adding features from the design, re-read spec §10 phasing and
confirm Phase 2 gates (Phase 3 only after ≥€500 MRR from a Hisoka-sourced idea).
```

- [ ] **Step 2: Add to MEMORY.md index**

```bash
# Append one line to /root/.claude/projects/-root/memory/MEMORY.md under the existing list
```

Line to add:
```
- [project_hisoka_phase1.md](project_hisoka_phase1.md) — 🃏 Hisoka Phase 1 MVP live (4 tables, manual run, Sonnet pipeline, top 20 + deep drawer, Phase 2-4 deferred)
```

- [ ] **Step 3: Open a PR (optional, if branch protection requires it)**

If the worker is running on a branch (see `project_cc_dual_account_architecture`):
```bash
gh pr create --title "feat(hisoka): 🃏 Phase 1 MVP — Business Hunter top 20" --body "$(cat <<'EOF'
## Summary
- Phase 1 MVP per spec §10 — manual trigger, single Sonnet call, 4 Supabase tables
- /admin/hisoka page with ▶ Run button, 8-col top 20 table, deep dive drawer
- lib/hisoka/ modules (types, scoring, registries, prompts, pipeline) + infra/*.json registries
- Cost ≤€40/mo, manual trigger only, no cron yet

## Test plan
- [x] Migration applies cleanly
- [x] Scoring smoke: good idea passes, bad-autonomy + bad-llc fail
- [x] Seed script inserts 1 sample idea; UI renders it
- [x] Pipeline smoke: runDiscovery() returns ≥3 upserts with a real LLM call
- [x] Page loads, ▶ runs, drawer opens on row click
- [ ] Phase 2 gate: re-run pipeline smoke 3 days later to confirm no regression

## Deferred (by design)
- Phase 2: signal harvester + cron + real benchmark scoring
- Phase 3: fleet/budget sliders + leverage configs UI + portfolio mode
- Phase 4: Monte Carlo, dashboard tile, cross-links, push-to-Minato

Refs: docs/superpowers/specs/2026-04-22-business-hunter-design.md
EOF
)"
```

Otherwise, push to main directly is OK since this is the user's own account and `main` branch protection is not yet enabled on the cc repo (confirm with `gh api repos/<owner>/command-center/branches/main/protection` if unsure).

- [ ] **Step 4: Final commit (memory)**

```bash
# Memory files live OUTSIDE the repo — no git add for them.
# But the memory addition itself is a "task done" marker.
echo "Phase 1 complete. Memory updated at /root/.claude/projects/-root/memory/project_hisoka_phase1.md"
```

---

## Self-review (after writing all 9 tasks)

**Spec coverage check (against design doc §1-12):**
- §1 goal & context — ✅ Phase 1 scope captured in task 1-8
- §2 architecture & flow — ✅ pipeline.ts matches Step 1-6 of Discovery, stubs scorer-per-candidate (deferred to Phase 2)
- §3 data model — ✅ migration in Task 1 includes all 4 tables + all columns in spec
- §3.5 brick/agent registries — ✅ Task 2 (shipped as JSON not YAML — documented decision)
- §4 scoring formula — ✅ Task 3 (hardGates + baseScore)
- §5 UI wireframe — ✅ Task 7 (minimum Phase 1 slice; sliders/portfolio deferred per §10 phase plan)
- §6 multi-agent architecture — ⚠️ Phase 1 uses ONE Sonnet call (ideator only), no parallel scorer. Explicitly spec'd as Phase 1 in §8.
- §7 API routes — ✅ run + ideas + ideas/[id] + benchmark (deep route deferred to Phase 2)
- §8 budget — ✅ Phase 1 manual-only is within ~€40/mo ceiling
- §9 LLC gate — ✅ hardGates rejects `llc_gate=blocked`; scoring applies 0.7 penalty for non-'none'
- §10 phases — ✅ this plan is Phase 1 only, Phase 2-4 deferred explicitly
- §11 open decisions — ✅ ideation prompt style example ≠ addressed (low-risk, iterate in Task 8 step 5 if output bad)
- §12 risk register — ✅ malformed JSON mitigation in Task 8 step 5

**Placeholder scan:** no "TBD", "implement later", or "add appropriate X" patterns. The only TODO comment is the admin role check in Task 6.3 — resolved in Step 2 of the same task (copy existing isAdmin pattern).

**Type consistency:**
- `ScoredIdea` defined in Task 3, used in Task 5 (pipeline.ts), Task 7 (IdeaRow is a subset used for DB reads — correctly named differently).
- `IdeaRow` (UI type, Task 7) vs `ScoredIdea` (pipeline type, Task 3) are intentionally distinct (DB read shape ≠ LLM output shape). Both import from Supabase consistently.
- `createSupabaseAdmin` used in Task 5+6+7+8 — defined in Task 6.1 if absent.

**Known gap accepted by scope:** Phase 1 uses a single LLM call for ideation + scoring combined — the Scorer-per-candidate parallelism from §6 is deferred. This costs ~€0.30/run vs €2.30/run but produces fewer ideas (~10-15 vs 60-80). Acceptable per §8 Phase 1 rollout.

---

**End of plan. 9 tasks, ~3-4 hours of focused execution.**
