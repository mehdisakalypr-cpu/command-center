# Hisoka 🃏 — Business Hunter Agent — Design

**Date:** 2026-04-22
**Status:** Design approved, ready for implementation plan
**Owner:** Command Center
**Related:** `project_business_simulator`, `feedback_infinite_overshoot`, `feedback_cost_tiers`, `project_llc_wyoming_strategy`, `project_cc_dual_account_architecture`

---

## 1. Goal & context

Build **Hisoka 🃏**, Minato's apex Business Hunter agent — the predator who spots potential others miss and pursues it ruthlessly. Hisoka orchestrates a team of 15 specialized sub-agents to continuously discover, score, and rank business ideas that can be operated **24/7 by AI with near-zero ongoing human involvement**, that **self-fund their own infrastructure at every scale**, and that function as a **capital allocation tool competing with financial markets**.

The agent surfaces a live **Top 20** with triple-scenario revenue projections across 6 horizons (M1 / M3 / M6 / M12 / M24 / M36). Each idea exposes a **leverage surface** (configurations combining launch budget × fleet size) so the user can decide whether to invest capital or add Claude-Code workers to unlock a step-change in revenue. A **Portfolio Mode** takes the user's available capital and proposes an **optimal diversified allocation** across multiple ideas, benchmarked against S&P 500 / bonds / savings.

The agent is **deeply aware of existing architecture bricks** (auth, marketplace matching, scraping, data pipelines, subscriptions, LLM cascade, image generation, i18n, geo-pricing, lead gen, email sequences, video gen, fleet, etc.) — every idea is evaluated on how many bricks it reuses, because brick reuse is the single biggest lever to compress time-to-market and cost.

### North stars
> **Autonomy**: generate revenue while the user sleeps, travels, or focuses on other ventures.
>
> **Capital-allocation superiority**: for any available capital amount, produce an expected risk-adjusted return that beats financial markets (S&P 500 baseline ~10%/yr, bonds ~4%/yr, HYSA ~2%/yr) with equal or lower operational risk.

### Success criteria
- [ ] Top 20 refreshed every 6h by cron + on-demand button + user idea benchmark input
- [ ] Every idea passes hard gates: autonomy ≥ 0.9, setup ≤ 40h, ongoing ≤ 1h/mo, self-funding GM+ at every volume breakpoint, valid distribution channel
- [ ] Each idea exposes ≥ 3 leverage configurations (bootstrap / accelerated / turbo) with explicit sweet-spot
- [ ] Each idea exposes **IRR_y3** and **delta vs S&P 500** per leverage config
- [ ] Fleet slider + budget slider re-rank the top 20 client-side without LLM re-call
- [ ] **Portfolio Mode**: given available capital (e.g., €10k), agent proposes optimal diversified allocation across 3-5 ideas, outputs expected ARR Y3, risk distribution, and explicit comparison to financial markets
- [ ] Deep analysis on click produces Monte Carlo projections (P10/P50/P90), autonomy proof, unit economics curve, cumulative P&L, go/no-go verdict in under 60 seconds
- [ ] Cross-linked from `/admin/simulator`, `/admin/cc-fleet`, `/admin/mrr-max-scenarios`, dashboard home
- [ ] Memory rules respected: T0 free-tier preference, LLC gate awareness, Infinite Overshoot budget ceiling

### Non-goals
- Auto-launching businesses (the Hunter only proposes; execution goes through `minato_tickets` queue after user push)
- Detailed financial modeling beyond Monte Carlo (no DCF, no cap-table planning)
- Multi-user scoring (this is user's personal decision tool, not a marketplace)

---

## 2. Architecture & flow

```
┌─ TRIGGERS ──────────────────────────────────────────────────────┐
│  • Cron every 6h (4 runs/day)                                    │
│  • Button « Run Now » in /admin/business-hunt                    │
│  • Button « Benchmark My Idea » → text input → scored vs top 20 │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─ DISCOVERY PIPELINE (~3-5 min per run, ~€3-10 cost) ────────────┐
│                                                                   │
│  Step 1 — Context Loader                                          │
│    Loads from memory: existing assets (FTG data, OFA builder,    │
│    image-cascade, stack free-tier, domains), budget rules        │
│    (T0/T1), LLC state, fleet_state, previous top 20.             │
│                                                                   │
│  Step 2 — Signal Harvester (parallélisé)                          │
│    Scrapes: HN top 100, PH launches 7d, YC RFS, Reddit            │
│    (r/startups, r/SaaS, r/Entrepreneur), Exploding Topics,       │
│    Google Trends. Extracts emerging themes as JSON signals.      │
│                                                                   │
│  Step 3 — Ideation Cascade                                        │
│    LLM (Opus → Sonnet fallback) generates 60-80 candidate        │
│    ideas from context + signals. HARD FILTERS applied in prompt: │
│      • full-AI operable (all 6 autonomy dims ≥ 0.85 plausible)  │
│      • valid distribution (≥ 1 validated channel in user reach) │
│      • self-fundable at 10K users                                │
│      • ≤ 40h user setup, ~0 ongoing                              │
│                                                                   │
│  Step 4 — Asset Leverage Boost                                    │
│    For each candidate, detect reuse opportunities (ftg_data,     │
│    ofa_builder, image-cascade, llm-pipeline). Bonus to score.    │
│                                                                   │
│  Step 5 — Scoring + Triple Scenario + Leverage Configs            │
│    Per idea:                                                      │
│      • Triple scenario MRR × 6 horizons (conservative/median/    │
│        optimistic) — LLM reasoning, anchored in comparables      │
│      • 4 leverage configs: bootstrap (€0,1w), accelerated        │
│        (€1k,2w), turbo (€3k,5w), overkill (€5k,7w)               │
│      • Sweet spot identified (highest leverage before            │
│        diminishing returns)                                       │
│      • Elasticity tag (high / medium / flat)                     │
│                                                                   │
│  Step 6 — Dedup + Persist                                         │
│    Cross-check against existing rows (cosine sim on name+        │
│    tagline). Upsert if exists (preserve deep_analysis if         │
│    cached). Rank top 20. Archive non-top-20 with rank=null.      │
└───────────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┴──────────────────┐
          ▼                                      ▼
  UI /admin/business-hunt               Ticket queue (optional)
  — Top 20 table                        — Push to Minato when user
  — Fleet + Budget sliders                decides to execute
  — Click → Deep Analysis panel
```

### Deep Analysis (triggered on row click, ~30-60s, ~€0.50/call)
- Proves **each of 6 autonomy dimensions** with concrete automation stack
- **Distribution audit**: ≥ 1 realistic channel fully validated (CAC estimate, volume estimate)
- **Monetization audit**: price anchor vs 3 comparables, tier design
- **Stack feasibility**: which of our assets reused, what to build, dev-weeks
- **Monte Carlo** 500 runs → P10/P50/P90 per horizon
- **Unit economics curve** at 5 volume breakpoints
- **Cumulative P&L chart** per leverage config
- **Go/No-Go** verdict + blockers list
- Cached 30 days unless idea is re-scored (force-refresh button)

---

## 3. Data model

```sql
-- Main catalog, upserted by discovery pipeline
create table business_ideas (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  tagline text not null,
  category text not null check (category in (
    'middleware_api', 'data_platform', 'productized_service',
    'marketplace', 'content_platform', 'tool_utility', 'b2b_integration'
  )),

  -- Autonomy (weakest-link principle)
  autonomy_acquisition numeric(3,2),
  autonomy_content_ops numeric(3,2),
  autonomy_fulfillment numeric(3,2),
  autonomy_support numeric(3,2),
  autonomy_billing numeric(3,2),
  autonomy_compliance numeric(3,2),
  autonomy_score numeric(3,2) generated always as (
    least(autonomy_acquisition, autonomy_content_ops, autonomy_fulfillment,
          autonomy_support, autonomy_billing, autonomy_compliance)
  ) stored,

  -- User-time budget (hard caps)
  setup_hours_user numeric(5,1) not null,           -- hard cap 40
  ongoing_user_hours_per_month numeric(4,1) not null, -- hard cap 1

  -- Distribution & monetization
  distribution_channels jsonb not null,  -- ["seo","email_outbound","ph_launch"]
  monetization_model text not null,      -- "subscription" | "usage" | "hybrid" | "commission"
  pricing_tiers jsonb,                    -- [{name, price_eur, limits, gm_pct}]

  -- Asset leverage
  assets_leveraged jsonb,                 -- ["ftg_data","ofa_builder","image_cascade"]
  asset_leverage_bonus numeric(3,2),      -- 1.0 - 1.5

  -- Self-funding unit economics
  unit_economics jsonb,                   -- {v10:{rev,cost,gm}, v100:..., v10k:...}
  self_funding_score numeric(3,2),        -- 1.0 if GM+ at every tested tier
  infra_scaling_curve text,               -- "logarithmic"|"linear"|"breaks_at_Xk"

  -- LLC & regulatory
  llc_gate text not null check (llc_gate in ('none','needs_llc','post_expat','blocked')),
  compliance_notes text,

  -- Effort & budget
  effort_weeks numeric(4,1) not null,     -- at 1 worker baseline
  monthly_ops_cost_eur numeric(8,2),      -- at 10k users
  scalability_per_worker text check (scalability_per_worker in ('linear','step','capped')),

  -- Triple scenario MRR (list level)
  mrr_conservative jsonb,                 -- {m1,m3,m6,m12,m24,m36}
  mrr_median jsonb,
  mrr_optimistic jsonb,

  -- Fleet scaling (multipliers per worker count)
  fleet_multipliers jsonb,                -- {1:1.0, 2:1.8, 3:2.5, 5:3.6, 7:4.2}

  -- Leverage surface (primary innovation)
  leverage_configs jsonb not null,        -- array of {launch_eur, workers, leverage,
                                          --   mrr_curve, label, notes, irr_y3,
                                          --   sp500_delta_pct, risk_score}
  optimal_config jsonb,                   -- sweet-spot config
  leverage_elasticity text check (leverage_elasticity in ('high','medium','flat')),

  -- Financial-market comparison (per idea, using optimal config)
  irr_y3_pct numeric(6,2),                -- internal rate of return Y3 (annualized)
  sp500_delta_pct numeric(6,2),           -- (irr - sp500_baseline) in pp
  risk_score numeric(3,2),                -- 0 = as safe as HYSA, 1 = highly speculative
                                          -- = f(autonomy_inverse, elasticity_variance,
                                          --     moat_strength, regulatory_exposure)
  sharpe_proxy numeric(4,2),              -- (irr - risk_free_rate) / risk_score

  -- Sources & metadata
  sources jsonb,                          -- [{url, type: "hn"|"ph"|"yc"|...}, ...]
  rationale text,                         -- LLM's short pitch (why this idea now)

  -- Ranking
  rank int,                               -- 1-20 if in top, null if archived
  score numeric(8,2),                     -- base score at 1-worker, €0 envelope

  -- Timestamps
  discovered_at timestamptz default now(),
  updated_at timestamptz default now(),
  archived_at timestamptz
);

create index idx_business_ideas_rank on business_ideas(rank) where rank is not null;
create index idx_business_ideas_category on business_ideas(category);
create index idx_business_ideas_updated on business_ideas(updated_at desc);

-- Deep analysis (on click, cached 30d)
create table business_idea_deep (
  id uuid primary key default gen_random_uuid(),
  idea_id uuid references business_ideas(id) on delete cascade,
  version int not null,

  autonomy_proof jsonb,                   -- per-dimension: stack, cost, confidence
  distribution_audit jsonb,               -- per-channel: CAC, volume, evidence
  monetization_audit jsonb,               -- pricing justification, comparables
  stack_feasibility jsonb,                -- reuse list + to-build list + dev-weeks
  monte_carlo jsonb,                      -- {p10:{m1..m36}, p50:..., p90:...}
  cumulative_pnl jsonb,                   -- {bootstrap:[...], turbo:[...]}
  go_no_go text check (go_no_go in ('go','conditional','no_go')),
  blockers jsonb,                         -- [{issue, severity, remediation}]
  assumptions jsonb,                      -- explicit hypotheses used

  analyzed_at timestamptz default now(),
  cost_eur numeric(6,2),
  unique(idea_id, version)
);

-- Portfolio proposals (capital allocation runs)
create table business_portfolios (
  id uuid primary key default gen_random_uuid(),
  available_capital_eur numeric(10,2) not null,
  max_workers_to_add int,                 -- optional extra fleet cap
  risk_appetite text check (risk_appetite in ('conservative','balanced','aggressive')),
  allocation jsonb not null,              -- [{idea_id, launch_eur, workers, expected_mrr_y3}]
  expected_arr_y3_eur numeric(12,2),
  irr_y3_pct numeric(6,2),
  sp500_delta_pct numeric(6,2),
  max_drawdown_pct numeric(5,2),          -- worst-case loss per Monte Carlo P10
  diversification_score numeric(3,2),     -- 0-1: category + channel + revenue-model spread
  comparison_table jsonb,                 -- {sp500:{arr,return}, bonds:{...}, hysa:{...}, this:{...}}
  rationale text,
  created_at timestamptz default now()
);

-- Benchmark user's own idea
create table business_idea_benchmarks (
  id uuid primary key default gen_random_uuid(),
  user_input text not null,
  scored_fields jsonb,                    -- same shape as business_ideas minus rank
  rank_if_added int,                      -- where it'd land in current top 20
  verdict text,
  analyzed_at timestamptz default now(),
  cost_eur numeric(6,2)
);

-- Run log (cron + manual)
create table business_hunter_runs (
  id uuid primary key default gen_random_uuid(),
  trigger text check (trigger in ('cron','manual','benchmark')),
  started_at timestamptz default now(),
  finished_at timestamptz,
  ideas_discovered int,
  ideas_upserted int,
  cost_eur numeric(6,2),
  status text,                            -- 'running' | 'success' | 'failed'
  error text
);
```

---

## 3.5 Brick Registry / Capability Inventory

The agent's context loader MUST feed it a structured inventory of all existing bricks in our stack, so every idea is evaluated on **which bricks it reuses** — reuse is the single biggest lever for time-to-market and cost.

### Source of truth
Hybrid: `command-center/infra/brick-registry.yaml` (curated, version-controlled) + optional auto-update via commit hook when new `lib/` directories appear.

### Brick shape
```yaml
bricks:
  - id: auth_webauthn
    name: "WebAuthn biometric auth + Supabase + site_access"
    projects_using: [ftg, ofa, cc, estate]
    files_pointer: "feel-the-gap/lib/auth, command-center/lib/auth-v2"
    saves_dev_weeks: 4
    maturity: production           # prototype | beta | production
    enables: ["user auth on any new site", "cross-site sessions", "admin gating"]
    requires: [supabase_shared]

  - id: marketplace_matching
    name: "B2B matching engine with commission"
    projects_using: [ftg]
    saves_dev_weeks: 6
    maturity: production
    enables: ["2-sided marketplaces with escrow", "supply/demand scoring"]
    requires: [auth_webauthn, stripe_subs]

  - id: scraper_oignon
    name: "Multi-source scraper (HN/PH/Reddit/Trends)"
    projects_using: [ofa, cc]
    saves_dev_weeks: 3
    enables: ["signal harvesting", "competitor monitoring", "lead enrichment"]

  - id: image_cascade
    name: "9-source image generation cascade with free-tier failover"
    projects_using: [ofa, ftg]
    saves_dev_weeks: 5
    enables: ["illustrated content at scale", "hero images", "product shots"]

  - id: llm_cascade
    name: "Multi-provider LLM with prompt-cache + locale-aware"
    projects_using: [ftg, cc, ofa]
    saves_dev_weeks: 4
    enables: ["any LLM-powered feature", "multi-lang content"]

  - id: stripe_subs_tier
    name: "Stripe subscriptions with tier-gating matrix"
    projects_using: [ftg, cc]
    saves_dev_weeks: 3
    enables: ["tiered pricing", "usage metering", "dunning"]

  - id: geo_pricing
    name: "Per-country pricing with 195 multipliers (PPP + BigMac + Numbeo)"
    projects_using: [ftg]
    saves_dev_weeks: 2
    enables: ["fair regional pricing", "PPP-adjusted offers"]

  - id: i18n_helpers
    name: "Multi-locale helpers + 12 Supabase lang tables"
    projects_using: [ftg, cc, ofa]
    saves_dev_weeks: 3
    enables: ["any site in 12+ languages"]

  - id: warm_outreach
    name: "Warm-network dispatcher + 3 persona sequences (alex/maria/thomas)"
    projects_using: [ftg]
    saves_dev_weeks: 4
    enables: ["automated cold email at scale", "CRM-free outbound"]

  - id: video_gen
    name: "Seedance + ElevenLabs video pipeline"
    projects_using: [ftg]
    saves_dev_weeks: 3
    enables: ["ad videos", "product demos", "tutorials"]

  - id: cc_fleet
    name: "N-worker CC fleet (tickets + claims + scoring + anti-loop)"
    projects_using: [cc]
    saves_dev_weeks: 8
    enables: ["parallel AI dev execution"]

  # ... add more as inventory grows (scout_queue, deed_ip_chain, gapup_io, security_cockpit, etc.)
```

### Minato Agents Roster (parallel catalog)

Bricks cover **code capabilities**; Minato agents cover **operational capabilities**. A business isn't just launched — it's **operated continuously** by a team of Minato agents. The Hunter must know which agents are available, what autonomy dimensions they cover, and whether a candidate idea is day-1 operable with the current roster.

Source: `command-center/infra/minato-roster.yaml` (curated, aligned with `project_minato_arsenal` + `project_ftg_minato_waves`).

```yaml
minato_agents:
  - id: rock_lee_v2
    icon: "🥋"
    name: "Rock Lee v2 — persistent outreach & content push"
    covers_autonomy_dims: [acquisition, content_ops]
    specialties: ["SEO content generation", "LinkedIn outreach sequences", "social posts"]
    active_projects: [ftg, gapup_io]
    status: production
    ops_cost_eur_mo: 15

  - id: shikamaru
    icon: "🧠"
    name: "Shikamaru — strategic opportunity matrix"
    covers_autonomy_dims: [acquisition]
    specialties: ["opportunity scoring", "campaign prioritization", "A/B strategic picks"]
    active_projects: [ftg]
    status: production

  - id: shisui
    icon: "🧪"
    name: "Shisui — content generation pipeline"
    covers_autonomy_dims: [content_ops]
    specialties: ["LLM-backed content with locale", "pre-compute opp × country", "cache layer"]
    active_projects: [ftg]
    status: production

  - id: itachi
    icon: "👁"
    name: "Itachi — intent reader / classifier"
    covers_autonomy_dims: [acquisition, support]
    specialties: ["user intent detection", "lead classification", "archetypes"]

  - id: hancock
    icon: "💄"
    name: "Hancock — charm / persuasive copy"
    covers_autonomy_dims: [acquisition, content_ops]
    specialties: ["conversion copy", "emotional storytelling"]

  - id: kakashi
    icon: "🔍"
    name: "Kakashi — copy ninja / brick-reuse scanner"
    covers_autonomy_dims: [content_ops]
    specialties: ["scans existing code for reusable patterns", "anti-duplication"]

  - id: kurama
    icon: "🦊"
    name: "Kurama — image cascade (9-source failover)"
    covers_autonomy_dims: [content_ops]
    specialties: ["hero images", "product shots at scale"]
    ops_cost_eur_mo: 0   # free-tier cascade

  - id: dokho
    icon: "⚖️"
    name: "Dokho — guardian (DB/matviews/caches maintenance)"
    covers_autonomy_dims: [fulfillment, compliance]
    specialties: ["silent maintenance crons", "idempotent refreshes"]

  - id: neji
    icon: "🎯"
    name: "Neji — supervisor / infinite overshoot"
    covers_autonomy_dims: [fulfillment]
    specialties: ["budget enforcement", "scaling decisions", "never-idle enforcement"]

  - id: senku
    icon: "🔬"
    name: "Senku — root-cause auditor"
    covers_autonomy_dims: [compliance, support]
    specialties: ["bug replay E2E", "incident root-cause"]

  - id: might_guy
    icon: "🛡"
    name: "Might Guy — security / defense"
    covers_autonomy_dims: [compliance]
    specialties: ["OWASP checks", "rate limiting", "anti-fraud"]

  - id: kushina
    icon: "💫"
    name: "Kushina — kaizen (continuous improvement)"
    covers_autonomy_dims: [content_ops, fulfillment]
    specialties: ["A/B iteration", "autonomous refinement loops"]

  - id: merlin
    icon: "🧙"
    name: "Merlin — scheduled wisdom / cron strategist"
    covers_autonomy_dims: [fulfillment]
    specialties: ["cadence design", "cron orchestration"]

  # Coverage gaps (agents to build when an idea needs them):
  # - Support/chatbot agent: NONE YET. Must be built for ideas with customer-facing support.
  # - Dunning/relance agent: NONE YET.
  # - Moderation agent: NONE YET.
```

### How the Hunter uses this

1. **Operability scoring** — for each idea, map its 6 autonomy dimensions to existing Minato agents:
   ```
   operability_score = count(dimensions_covered_by_existing_agents) / 6
   ```
2. **Identify agent gaps** — if a dimension has no existing agent (e.g., "support" for a B2C idea), compute `new_minato_agents_needed` with estimated dev-weeks and add to `effort_weeks`.
3. **Day-1 operable bonus** — ideas with `operability_score = 1.0` get a 1.3× score multiplier (they can be launched without building a new agent).
4. **Ops cost aggregation** — sum of `ops_cost_eur_mo` for assigned agents = part of `monthly_ops_cost_eur`.

Data model addition:
```sql
alter table business_ideas add column minato_agents_assigned jsonb;
  -- {acquisition: "rock_lee_v2", content_ops: "shisui", ...}
alter table business_ideas add column new_minato_agents_needed jsonb;
  -- [{name, role, covers_dim, dev_weeks}]
alter table business_ideas add column operability_score numeric(3,2);
```

### Deep-dive UI addition

Next to "Stack Feasibility" section, add **"Operations Team"** subsection:
- ✅ Assigned Minato agents (icon + name + dimension covered)
- 🏗 Missing agents to build (per dimension, with dev-weeks)
- `operability_score` bar (0 → 1.0)

### Agent usage

1. **Context loader** injects the brick registry into the ideation prompt.
2. **Ideator** is instructed to **prefer ideas that combine 2-3 bricks we already have but haven't combined yet** (novel combinations = high leverage).
3. **Stack Feasibility Architect** (deep analysis) explicitly lists reused bricks + new bricks needed, with dev-weeks saved.
4. Score gets `asset_leverage_bonus = 1 + 0.1 × bricks_reused_count` (capped at 1.5).

### UI

In the top-20 row, show chips `+auth +marketplace +image-cascade`. In the deep dive, a dedicated **"Stack Feasibility"** section with:
- ✅ Reused bricks (link to each brick's code location)
- 🏗 New bricks to build (with estimated dev-weeks)
- ⏱ Total dev-weeks saved vs greenfield
- Break-down: 60% reused / 40% new (visual bar)

---

## 4. Scoring formula

### Hard gates (cumulative — all must pass)
```
autonomy_score                  ≥ 0.9
setup_hours_user                ≤ 40
ongoing_user_hours_per_month    ≤ 1
has_valid_distribution          = true
self_funding_score              = 1.0 (at v10, v100, v1k, v10k)
llc_gate                        ≠ "blocked"
```

### Score formula (per leverage config, per fleet envelope)
```
leverage = (MRR_y3_cumulative_median × autonomy_score²)
         ÷ (launch_eur
            + workers × worker_cost_over_3_years
            + setup_hours_user × hourly_rate_proxy)

score = leverage
      × asset_leverage_bonus               (1.0 - 1.5)
      × gross_margin_at_10k                (penalize thin-margin ideas)
      × (llc_gate == "none" ? 1.0 : 0.7)   (penalize LLC-dependent pre-LLC)
```

### Ranking logic
- Default view: rank ideas by score at their **optimal_config**, 1-worker envelope
- When user moves fleet slider + budget slider: re-rank by the idea's **best leverage_config within envelope**
- All re-rank happens client-side from `leverage_configs` JSON — no LLM call

### Leverage elasticity classification
Agent computes elasticity once per idea:
- **HIGH**: leverage at turbo > 3× leverage at bootstrap → idea rewards capital
- **MEDIUM**: turbo leverage 1.5-3× bootstrap → modest benefit
- **FLAT**: turbo leverage ≤ 1.5× bootstrap → don't invest, run lean

User can filter: "Show only HIGH elasticity" when deciding where to deploy capital.

---

## 5. UI wireframe

### Page `/admin/hisoka`

**Header**
- Title: **Hisoka 🃏 — Business Hunter** · last-run timestamp · total ideas in catalog
- Tagline: *"The predator who scores what others miss."*
- Primary buttons: `▶ Hisoka, run` / `💼 Portfolio Mode` / `📝 Benchmark My Idea` / `⚙ Settings`
- Run cost tag (live: €2-3 per run with parallel agents, €10-15/mo at 1 cron/day)

**Controls bar (sticky)**
- **Budget envelope slider** `€0 → €5000` (step €500)
- **Fleet envelope slider** `1 → 10 workers` (shows cumulative +€200/mo/worker)
- **Category chips** (multi-select, default all enabled)
- **LLC gate filter**: `All / Doable now only / Post-expat OK`
- **Elasticity filter**: `All / High only / Exclude flat`
- **Sort selector**: `Leverage at envelope / MRR_12m / Effort / Autonomy / Elasticity`

**Top 20 table**
Columns:
- `#` (rank + delta arrow vs last run)
- `Name` + category badge + tagline on hover
- `Autonomy` (0.00-1.00, color-coded; tooltip breakdown of 6 dims)
- `Leverage@envelope` (big number, e.g., `24×` or `100×`)
- `MRR curve` (sparkline 6 horizons; hover shows values)
- `GM@10k` (gross margin at 10k users, color-coded)
- `Assets` (chips: +ftg_data +ofa_builder, tooltip lists)
- `LLC` (✓ now / ⚠ needs / 🔒 blocked)
- `Action`: `👁 Deep Dive`

**Deep Dive panel** (right drawer on row click)
- Autonomy matrix (6 bars + proof text per dim)
- Unit economics table (5 breakpoints, GM per tier)
- Monte Carlo chart (P10/P50/P90 × 6 horizons)
- **Leverage configs table** (4 rows: bootstrap / accelerated / turbo / overkill, sweet spot starred ⭐)
- Cumulative P&L line chart (bootstrap curve vs selected config)
- Distribution channels detail
- Monetization model + tier table
- Stack feasibility (reuse list + to-build list + dev-weeks)
- Verdict + blockers
- Actions: `▶ Push to Minato queue` / `📊 Compare with #N` / `🗑 Dismiss` / `🔄 Re-analyze`

**Portfolio Mode** (new prominent button `💼 Portfolio Mode` in header)
- Input: available capital `€0 → €100k` (slider + manual input)
- Input: max extra workers willing to add `0 → 10`
- Input: risk appetite `Conservative / Balanced / Aggressive` (shifts scoring weight)
- `▶ Propose allocation` button
- **Result view** (~90s agent compute, ~€1.50 cost):
  - Proposed allocation table: 3-5 ideas with per-idea `launch_eur`, `workers_assigned`, `expected_mrr_y3`
  - **Benchmark table** (critical display):
    ```
    Benchmark         | ARR Y3   | Annualized return | Risk rating
    ----------------- | -------- | ----------------- | -----------
    HYSA (2%)         | €X       | 2%                | ●○○○○ (very low)
    Bonds (4%)        | €X       | 4%                | ●●○○○ (low)
    S&P 500 (10%)     | €X       | 10%               | ●●●○○ (medium)
    This portfolio    | €Y       | Z% (Δ vs SP500)   | ●●●○○ (medium)
    ```
  - Diversification chart (categories + channels spread)
  - Max drawdown (P10 Monte Carlo) + worst-case scenario
  - Rationale (1 paragraph explaining the allocation logic)
  - Actions: `💾 Save portfolio` / `▶ Push all to Minato` / `🔄 Re-run`

**Benchmark modal** (triggered from `📝 Benchmark My Idea` button)
- Textarea (500 char cap) for idea description
- `▶ Analyze` button
- Result after ~45s: rank if added, autonomy score, leverage, blockers, MRR M12
- Actions: `💾 Save as idea` / `👁 Deep dive`

### Cross-placements in CC

- `app/admin/layout.tsx` — nav item **🃏 Hisoka** (admin sidebar)
- **Dashboard home** — tile *"Hisoka's top 3 this week + Δ vs last week"*
- `app/admin/simulator/page.tsx` — header button *"Import idea from Hisoka"*
- `app/admin/cc-fleet/page.tsx` — widget *"+1 worker = +€X MRR across Hisoka's top 20"* (uses `fleet_multipliers`)
- `app/admin/mrr-max-scenarios/page.tsx` — *"Hisoka proposes 5 ideas hitting your target"*
- `app/admin/minato/page.tsx` — Hisoka listed in the arsenal grid with live stats

---

## 6. Multi-agent architecture

The Hunter uses **~15 specialized agent roles** orchestrated through two main pipelines (discovery + deep analysis), plus Portfolio + Benchmark modes. Most agents are short-lived, parallelizable, and use structured output schemas to minimize token cost.

### Discovery pipeline agents (per run)

| # | Agent | Role | Model | Parallelism | Typical cost |
|---|---|---|---|---|---|
| D1 | **Signal Harvester** | Scrape HN/PH/Reddit/YC/Trends → summarize into JSON signals | Code + 1 Sonnet call | — | €0.05 |
| D2 | **Context Loader** | Load memory + brick registry + fleet state + prev top 20 | Code only | — | €0 |
| D3 | **Ideator** | Generate 60-80 candidate ideas from context + signals | Opus (prompt-cached system) | 1 call | €0.80 |
| D4 | **Gatekeeper** | Run hard gates (autonomy/setup/self-funding/distrib) → filter to ~30 | Sonnet structured | 1 call | €0.15 |
| D5 | **Scorer** × N | Per-candidate: triple scenario MRR + effort + category + brick reuse | Sonnet structured | **10 parallel** | €0.02 × 30 = €0.60 |
| D6 | **Leverage Computer** × N | Per-idea: 4 configs (bootstrap/accelerated/turbo/overkill) + elasticity | Sonnet structured | **10 parallel** | €0.02 × 30 = €0.60 |
| D7 | **Diversification Curator** | Select final top 20 with category + channel spread | Sonnet | 1 call | €0.10 |
| D8 | **Ranker** | Sort by score at default envelope, persist rank | Code only | — | €0 |

**Total per discovery run: ~€2.30 with prompt caching, ~5 min end-to-end thanks to parallelism.**

### Deep analysis agents (per idea click)

All run in **parallel** (except Verdict Composer which waits on others):

| Agent | Role | Model | Cost |
|---|---|---|---|
| **Autonomy Auditor** | Prove each of 6 dimensions with concrete stack | Opus | €0.10 |
| **Distribution Scout** | Validate channels + CAC + volume estimates | Sonnet | €0.05 |
| **Monetization Analyst** | Pricing tiers + 3 comparables + anchor | Sonnet | €0.05 |
| **Stack Feasibility Architect** | Map to brick registry + dev-weeks + new bricks | Opus | €0.10 |
| **Unit Economics Modeler** | Breakpoints (v10/v100/v1k/v10k/v100k) + GM curve | Sonnet | €0.05 |
| **Monte Carlo Simulator** | 500 runs over triangular distributions | **Code only** (in-process TS) | €0 |
| **Risk Assessor** | Risk score + Sharpe-proxy + moat strength | Sonnet | €0.05 |
| **Verdict Composer** | Synthesize all above → go/no-go + blockers + assumptions | Opus | €0.10 |

**Total per deep analysis: ~€0.50, ~30-45 seconds (parallel fan-out).**

### Portfolio Mode agents (per `▶ Propose allocation`)

| Agent | Role | Model | Cost |
|---|---|---|---|
| **Portfolio Optimizer** | Given capital + risk appetite, pick 3-5 ideas + per-idea launch/worker allocation | Opus | €0.30 |
| **Benchmark Calculator** | Compare portfolio IRR to SP500/bonds/HYSA | Code only | €0 |
| **Risk Aggregator** | Aggregate max drawdown + diversification score (Herfindahl-like) | Code + Sonnet call | €0.05 |
| **Rationale Writer** | 1-paragraph explanation of allocation logic | Sonnet | €0.05 |

**Total per portfolio run: ~€0.40, ~60-90 seconds.**

### Benchmark My Idea (per user submission)

| Agent | Role | Cost |
|---|---|---|
| **Idea Interpreter** | Parse user text → structured idea fields | Sonnet €0.03 |
| Reuses Scorer + Gatekeeper + Leverage Computer + Ranker | — | ~€0.10 |

**Total: ~€0.13, ~30-45 seconds.**

### Why this many agents?

- **Parallelism**: deep analysis 8 sub-tasks in parallel = 30s vs sequential 4min
- **Structured outputs**: each agent has a narrow JSON schema → fewer hallucinations, easier validation
- **Cheaper per run**: Sonnet on narrow tasks (scoring, gatekeeping) + Opus only where reasoning matters (ideation, stack feasibility, verdict) → saves ~60% cost vs single monolithic Opus call
- **Testable**: each agent can be unit-tested with canned inputs
- **Replaceable**: swap Scorer model to Haiku if costs need cutting, without touching Ideator

### Integration with Minato Arsenal

**Hisoka 🃏** is a **first-class Minato technique** — Minato's apex business-hunting persona. He is not a standalone tool; he plugs into the existing Minato orchestrator and commands a 15-agent crew (each mapped to an anime icon per `project_minato_arsenal`):

| Hunter role | Minato icon | Why this mapping |
|---|---|---|
| Ideator | 🦊 **Kurama** (cascade abundance) | Generates abundance via cascade of signals → candidates |
| Gatekeeper | ⚔️ **Zoro** (three-cut filter) | Slices candidates with hard-gate cuts, no mercy |
| Scorer (parallel) | 🧠 **Shikamaru** (strategic calculator) | Rapid strategic scoring per candidate |
| Leverage Computer | 💰 **Nami** (treasure allocator) | Maps capital → return configurations |
| Diversification Curator | ⚖️ **Dokho** (balance keeper) | Ensures category + channel spread |
| Autonomy Auditor | 🔍 **Kakashi** (copy ninja, inspector) | Inspects existing bricks, detects automation paths |
| Distribution Scout | 🎯 **Gojo** (unfiltered precision) | Identifies precise channels + CAC |
| Monetization Analyst | 📈 **Krillin** (small & sharp) | Tight pricing math against comparables |
| Stack Feasibility Architect | 🧪 **Shisui** (illusion → reality) | Turns idea into brick combination |
| Unit Economics Modeler | 🔬 **Senku** (rigorous science) | Breakpoint curve modeling |
| Monte Carlo Simulator | 🏜 **Gaara** (sand = probability) | Code-only probabilistic sim |
| Risk Assessor | 🛡 **Might Guy** (defensive gates) | Hardens against speculation |
| Verdict Composer | 👑 **Lelouch** (strategic synthesis) | Final go/no-go with reasoning |
| Portfolio Optimizer | ⚡ **Minato himself** (orchestrator) | Only he composes full portfolio across ideas |
| Idea Interpreter | 👁 **Itachi** (reads intent) | Parses user's raw idea description |

### Invocation

- **Voice/chat trigger**: *"Minato, lance Hisoka"* or *"Hisoka, chasse"* → Shaka-mode autonomous run of the full discovery pipeline
- **UI trigger**: `▶ Hisoka, run` button in `/admin/hisoka` + technique card in `/admin/minato` arsenal view
- **Cross-link from `/admin/minato`**: Hisoka tile in the arsenal grid with live stats ("Last hunt 2h ago, 3 new preys this week, top leverage: 100×")
- **Push-to-Minato queue**: when user approves a prey (idea), it becomes a Minato mission ticket in `minato_tickets` with Shisui's Stack Feasibility plan pre-loaded

### Shaka-mode behavior

Per `feedback_shaka_autonomous`, when invoked in Shaka mode, Hisoka:
- Runs the full discovery pipeline without asking validation
- Auto-archives obsolete ideas (not in top 20 for 3 consecutive runs)
- Force-refreshes deep analysis for the top 3 ideas on every run (keep them always current)
- Posts to the Aria bridge with a 2-line summary if top-1 idea changed

### LLM routing defaults
- **Opus 4.7**: Ideator, Autonomy Auditor, Stack Feasibility Architect, Verdict Composer, Portfolio Optimizer (≤6 per run)
- **Sonnet 4.6**: everything else (≤40 per run, mostly parallel)
- **No Haiku** yet (structured reasoning required); can downgrade Scorer → Haiku in Phase 2 if budget pressures
- All via AI SDK with prompt caching enabled (system prompt stable → cache hit ratio target ≥ 80%)

### Signal harvesting (step 2)
- HN: via Algolia HN API (free, no auth)
- PH: via GraphQL API (OAuth app)
- YC RFS: static scrape of `ycombinator.com/rfs` (weekly)
- Reddit: via `reddit.com/r/X/top.json` (free)
- Google Trends: via `pytrends` or equivalent Node wrapper
- Exploding Topics: scrape public listings (respect robots.txt)

Parallélisé avec `Promise.all`, 60s timeout par source, dégrade gracieusement si une source tombe.

### Monte Carlo (step deep)
- In-process TypeScript simulation, 500 runs, triangular distributions per assumption
- No external library (keep bundle small), 2-3s execution per idea

### Cron runner
- Add entry to existing VPS crontab: `0 */6 * * * /root/monitor/business-hunter-run.sh`
- Script calls `POST /api/business-hunter/run` with cron token (auth via `CRON_TOKEN` env)
- Logs to `/root/monitor/logs/business-hunter.log`, rotated weekly

---

## 7. API routes

```
POST   /api/business-hunter/run               -- trigger discovery pipeline (cron token or admin)
GET    /api/business-hunter/ideas             -- list top 20 (+ filters via query params)
GET    /api/business-hunter/ideas/[id]        -- full idea + cached deep_analysis
POST   /api/business-hunter/ideas/[id]/deep   -- force re-run deep analysis
POST   /api/business-hunter/benchmark         -- score user's text idea
POST   /api/business-hunter/push-to-minato    -- convert idea → ticket in minato_tickets
GET    /api/business-hunter/runs              -- run history (admin)
```

Auth: admin-only via existing CC session middleware (`isAdmin` check + `site_access` table).

---

## 8. Budget & cost projections

With the multi-agent architecture (Opus only where reasoning-critical, Sonnet parallel for scoring, prompt caching) costs are dramatically lower than a monolithic single-Opus approach:

| Item | Unit cost | Frequency | Monthly |
|---|---|---|---|
| Discovery run (Hisoka + 7 sub-agents) | ~€2.30 | 4×/day (cron) | **€276** |
| Deep analysis (8 parallel sub-agents) | ~€0.50 | ~5/day (user clicks) | **€75** |
| Portfolio Mode | ~€0.40 | ~1/day (avg) | **€12** |
| Benchmark-my-idea | ~€0.13 | ~2/day | **€8** |
| **Total at 4×/day cron** | | | **~€371/mo** |

⚠️ Still above Infinite Overshoot ceiling (€150/mo). **Recommended rollout**:

| Phase | Cron cadence | Discovery model | Monthly | Notes |
|---|---|---|---|---|
| Phase 1 MVP | Manual only (no cron) | Sonnet | **~€20-40/mo** | User-triggered runs only, validate quality |
| Phase 2 | 1×/day | Sonnet ideation + Opus verdict | **~€90-120/mo** | Daily freshness, still within budget |
| Phase 3 | 4×/day | Opus ideation | **~€370/mo** | Only if ROI proven (≥ 1 idea → €500+ MRR) |

**Gate to Phase 3**: Hisoka must have produced at least one executed idea generating ≥ €500 MRR before increasing cadence. Until then, stay on Phase 2.

---

## 9. LLC gate behavior

Per memory `feedback_llc_gate_expat.md`: zero LLC action before effective expatriation (Portugal or Morocco).

Hisoka **hypothesizes LLC live** when user considers it, but each idea is tagged:
- `llc_gate: "none"` — doable from anywhere, any entity (EU-friendly)
- `llc_gate: "needs_llc"` — requires US LLC for Stripe USD / US B2B contracts (penalty ×0.7 in score)
- `llc_gate: "post_expat"` — also needs tax residency shift (informational)
- `llc_gate: "blocked"` — unlaunchable pre-LLC (hard rejected from top 20 until LLC live)

UI filter lets user switch between "show all" vs "doable now only" (EU-friendly only).

---

## 10. Implementation phases (feeds into writing-plans)

### Phase 1 — MVP (button-only, no cron)
- Supabase migration: 4 tables
- API routes: run, ideas, ideas/[id], benchmark
- Page `/admin/business-hunt` with table + controls
- Deep dive panel (basic: autonomy + MRR chart + verdict)
- 1 LLM cascade path (Sonnet only), no signal harvesting yet
- Manual button trigger only

### Phase 2 — Signal harvesting + cron
- Add signal harvester (HN + PH + Reddit)
- Add cron script + systemd or crontab entry
- Add run log table + UI
- Add benchmark-my-idea modal

### Phase 3 — Leverage surface + fleet slider
- Compute `leverage_configs` in scoring step
- Add fleet + budget envelope sliders in UI
- Client-side re-rank on slider change
- Add elasticity filter

### Phase 4 — Cross-integrations + polish
- Nav item + dashboard tile
- Link from simulator, cc-fleet, mrr-max-scenarios
- Push-to-Minato action
- Compare mode (2 ideas side-by-side)
- Settings drawer (cron cadence, source toggles)

---

## 11. Open decisions (for writing-plans to address)

- Exact prompt engineering for ideation step (need examples of good ideation prompts in codebase to match style)
- Cron cadence defaults (user implicitly OK with Phase 1 = manual only; Phase 2 will need default)
- Whether to persist non-top-20 ideas (archive vs hard-delete) — decision deferred, default is archive
- RLS policies: admin-only writes, admin-only reads (no public exposure)

---

## 12. Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| LLM hallucinates unit economics | High | Medium | Force citations to known comparables; manual audit of first 5 ideas before trusting |
| Signal scrapers blocked | Medium | Low | Graceful fallback + cache 24h; prioritize Reddit+HN which are API-stable |
| Cost overrun vs Infinite Overshoot | High | Medium | Start Phase 1 with Sonnet + 1/day cron; upgrade only if ROI proven |
| Top 20 becomes stale (same ideas re-surface) | Medium | Medium | Dedup on name+tagline cosine sim; force-refresh button on row |
| Leverage formula biased toward middleware | Low | Low | Diversification rule in prompt (≥ 3 categories in top 20) |

---

**End of design. Ready for implementation plan (via `writing-plans` skill).**
