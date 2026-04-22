# 💪 Armored All Might (AAM) — Phase 5 Design

**Date:** 2026-04-22
**Status:** Design draft v1 (Minato rapid mode — 6 defaults baked from brainstorm turn 1)
**Owner:** Command Center — extends Hisoka (phases 1-4 already live)
**Related:** `project_hisoka_phase1.md`, `feedback_aam_strategy` (autofinancement croisé), `feedback_shaka_autonomous`, `feedback_infinite_overshoot` (cap €150/mo)

---

## 1. Goal & context

Hisoka 🃏 discovers business ideas and filters to ≥0.9 autonomy. Ideas scoring 0.75–0.89 are currently archived. **We lose signal on ideas that are one automation away from being eligible.**

**Armored All Might (AAM)** is the squad that progressively **forges** those archived ideas into elected ones. It picks an idea's **weakest autonomy dimension**, scouts GitHub/YouTube/HN for tools that could automate the gap, integrates a top candidate into a **Vercel Sandbox** (ephemeral microVM), runs a synthetic benchmark test, measures autonomy uplift, and if the idea now clears ≥0.92 it's re-elected into Hisoka's top 20 — eligible for push-to-Minato.

### North stars

> **Lift the floor.** Every week, some fraction of 75-89% ideas graduate to ≥0.92 thanks to AAM. The automation capability of the overall portfolio monotonically increases.
>
> **No automation theatre.** Every promotion requires a passing synthetic benchmark run in an isolated sandbox. The LLM never self-grades.
>
> **Self-funding.** Per `feedback_aam_strategy`: AAM runs on Groq free tier + Vercel Sandbox ≤€15/mo. It earns its keep by graduating ideas that go on to generate MRR.

### Success criteria
- [ ] Hisoka archives now include `automation_gaps` (per-dim breakdown) — no signal loss
- [ ] AAM squad forges 5-10 ideas per week (cron nightly + manual button)
- [ ] ≥1 forged idea per week passes benchmark and is promoted to top 20
- [ ] Monthly cost ≤ €15 (Vercel Sandbox time + LLM tokens)
- [ ] Zero promoted idea that later regresses (anti-regression test in benchmark suite)

### Non-goals (Phase 5)
- Forging `compliance` or `billing` gaps (human oversight required per `feedback_llc_gate_expat`)
- Continuous improvement of already-elected ideas (out of scope — Minato handles post-push)
- Building custom automation tools from scratch (AAM only **integrates**, never writes new logic)

---

## 2. Team composition (MHA theme)

Leader: **All Might (Armored) 💪** — overseer, budget enforcer, killswitch.

| # | Role | Hero | Quirk | Function |
|---|---|---|---|---|
| 1 | Scout | **Mei Hatsume** 🔧 | Zoom | Query GitHub (stars+recency+topic+language) / YouTube (views+engagement) / HN / npm·pypi → top 5 candidats per gap |
| 2 | Alchemist | **Power Loader** ⚒ | Iron Claws | Synthesize integration attempt (code + config + install script) for sandbox |
| 3 | Tester | **Endeavor** 🔥 | Hellflame | Runs attempt in Vercel Sandbox, feeds synthetic workload, captures output + metrics |
| 4 | Evaluator | **Melissa Shield** 🛡 | Support items | Compare autonomy_X before/after on the targeted dim, honest metric (not self-graded) |
| 5 | Promoter | **Nighteye** 👁 | Foresight | Final gate — re-score Hisoka + mark eligible iff passes threshold |

Prompt cache tier: IDEATOR_SYSTEM reused where possible. Most sub-agents use Sonnet via OpenRouter or Groq (free tier).

---

## 3. Test validity (the pierre angulaire)

**User choice: A — Synthetic canonical tests per dim.**

One hand-authored test suite per forgeable autonomy dim, shipped in `lib/hisoka/aam-benchmarks/<dim>/`. Each forge attempt runs the relevant suite against the integrated automation candidate inside the sandbox. No LLM self-grading — scoring is deterministic where possible, with a locked rubric prompt (stable module constant, prompt-cached) only for the content-quality dimensions.

Benchmarks do NOT grow automatically from promoted attempts (that's what Kaizen in Phase 5.4 will propose as human-reviewable additions — never auto-appended). The library stays human-curated.

### Benchmark suite per dim (Phase 5.1 draft)

| Dim | Test shape | Pass threshold |
|---|---|---|
| `acquisition` | Given 50 synthetic target leads (JSON profiles), automation must qualify + rank + draft first-touch message. Scored against a canonical rubric (segmentation accuracy, message relevance, CTA presence). | ≥75% of leads scored ≥3/5 |
| `content_ops` | Generate 10 blog posts from 10 niche prompts → rubric scores (originality, factuality, SEO signals, length, CTA). Dedup cross-posts (Jaccard < 0.4). | Avg rubric ≥3.5/5 + dedup pass |
| `fulfillment` | 20 fake customer orders → automation must produce delivery artifact (email, doc, access credential). Timing SLA: ≤30s per order. | 100% delivered within SLA |
| `support` | 20 synthetic tickets (mix of FAQs, bugs, refunds, billing) → automation must resolve, escalate, or route correctly. | ≥80% correct disposition + ≥70% resolved without escalation |

The suite itself is code + fixtures committed in `lib/hisoka/aam-benchmarks/<dim>/`. Ran by Endeavor agent inside the sandbox. Scored by Melissa Shield agent from the output (deterministic where possible; LLM rubric only for content quality, with fixed rubric-prompt cached).

**Anti-theatre rule:** Melissa Shield's rubric prompt is a **stable module constant** (cacheable), never paraphrased between runs. Any drift in rubric = flagged as "benchmark-compromised", attempt voided.

---

## 4. Data model

### Extend `business_ideas` (migration `20260422130000_aam_phase5.sql`)

```sql
alter table public.business_ideas
  add column if not exists automation_gaps jsonb default '[]'::jsonb,
  -- [{ dim: 'support', current_autonomy: 0.7, description: '...', forgeable: true }]
  add column if not exists forge_attempts int default 0,
  add column if not exists last_forge_at timestamptz,
  add column if not exists forge_status text
    check (forge_status in ('idle','queued','forging','promoted','permanent_fail'))
    default 'idle';

create index if not exists idx_biz_ideas_forge_status
  on public.business_ideas(forge_status)
  where forge_status in ('queued','forging');
```

### New table `automation_upgrades`

```sql
create table if not exists public.automation_upgrades (
  id                uuid primary key default gen_random_uuid(),
  idea_id           uuid not null references public.business_ideas(id) on delete cascade,
  attempt_number    int not null,
  dim_targeted      text not null check (dim_targeted in ('acquisition','content_ops','fulfillment','support')),
  autonomy_before   numeric(3,2) not null,

  -- Scout findings
  candidates        jsonb,  -- [{ source: 'github', url, stars, last_commit, reason }]
  chosen_candidate  jsonb,  -- single winner from candidates

  -- Alchemist output
  integration_plan  jsonb,  -- { install_script, entry_point, config_keys_needed }

  -- Tester output
  sandbox_run_id    text,   -- Vercel Sandbox run id
  sandbox_logs_url  text,   -- persisted logs location
  test_output       jsonb,  -- { total, passed, failed, metrics }

  -- Evaluator output
  autonomy_after    numeric(3,2),
  human_params_needed  jsonb,  -- [{ param: 'OPENAI_API_KEY', optional: false }]

  -- Promoter verdict
  verdict           text not null check (verdict in ('promoted','failed','needs_human','out_of_budget')),
  verdict_reason    text,

  -- Costs
  cost_eur          numeric(6,2) default 0,

  -- Timestamps
  started_at        timestamptz not null default now(),
  finished_at       timestamptz,
  unique(idea_id, attempt_number)
);
create index if not exists idx_auto_upgrades_idea on public.automation_upgrades(idea_id);
create index if not exists idx_auto_upgrades_verdict on public.automation_upgrades(verdict, finished_at desc);
```

---

## 5. Flow

```
┌─ Trigger ────────────────────────────────────────────────────┐
│ Cron daily 03h00 France OR manual ▶ AAM, forge button       │
└──────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─ Candidate picker (code only, no LLM) ──────────────────────┐
│ Select up to N ideas from business_ideas WHERE               │
│   forge_status='idle' AND autonomy_score BETWEEN 0.75 AND    │
│   0.89 AND forge_attempts < 3 AND llc_gate != 'blocked'      │
│ Ordered by (0.9 - autonomy_score) DESC (biggest gap first)   │
│ N = 5 at cron, 1 at manual                                   │
└──────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─ Per-idea pipeline (sequential across ideas, budget enforced) ┐
│                                                                │
│  1. Gap Analyzer (LLM Groq, ~€0.001)                           │
│     Input: idea fields (autonomy_*, rationale, …)              │
│     Output: automation_gaps jsonb — which dim, why, forgeable  │
│                                                                │
│  2. Scout 🔧 (LLM Groq + real API calls, ~€0.002)              │
│     Input: dim + description of the gap                        │
│     Queries: GitHub Search API (stars>=500, updated<1y,        │
│              topics matching dim), YouTube Data API            │
│              (views, engagement), HN Algolia (score>50)        │
│     Output: top 5 candidates ranked                            │
│                                                                │
│  3. Alchemist ⚒ (LLM Sonnet, ~€0.005)                          │
│     Input: idea + gap + chosen candidate repo                  │
│     Output: integration_plan = { install.sh, run.ts,           │
│             fixtures_url, required_env_keys }                  │
│                                                                │
│  4. Tester 🔥 (Vercel Sandbox, ~€0.01)                         │
│     Input: integration_plan + benchmark suite for dim          │
│     Actions in sandbox:                                        │
│       - clone candidate repo                                   │
│       - run install.sh                                         │
│       - import fixtures (from our lib/hisoka/aam-benchmarks/)  │
│       - run entry_point against fixtures                       │
│       - capture output + logs                                  │
│     Output: test_output jsonb                                  │
│                                                                │
│  5. Evaluator 🛡 (code deterministic + LLM rubric, ~€0.002)    │
│     Input: test_output + benchmark expected                    │
│     Output: autonomy_after numeric + human_params_needed       │
│                                                                │
│  6. Promoter 👁 (code only)                                     │
│     If autonomy_after >= 0.92 AND human_params_needed.length   │
│        <= 2 AND test_output.passed / total >= dim_threshold:   │
│       → mark idea forge_status='promoted', re-rank Hisoka      │
│       → verdict='promoted'                                     │
│     Else if attempt_number == 3:                               │
│       → forge_status='permanent_fail', verdict='failed'        │
│     Else:                                                      │
│       → forge_status='idle', ready for next attempt            │
│       → verdict='failed'                                       │
│                                                                │
└────────────────────────────────────────────────────────────────┘
                           │
                           ▼
            ┌───────────────────────────────┐
            │ Hisoka top 20 auto-re-ranked  │
            │ Promoted ideas eligible for   │
            │ ▶ Push to Minato (phase 4B)   │
            └───────────────────────────────┘
```

**Per-attempt budget cap: €0.02 (Sonnet) or €0.005 (Groq).** Global cap: **30 attempts/day** (≤€15/mo at Sonnet, <€1/mo at Groq).

---

## 6. Sandbox

**Winner: E2B** (`@e2b/code-interpreter` SDK, Firecracker microVM, managed). Validated by parallel research 2026-04-22:
- Pricing: ~$0.000168/s vCPU → **60s run = $0.01** ≤ our €0.02/attempt cap
- Cold start: **<200ms** (template snapshots) vs Vercel Sandbox ~30s cold
- Network egress: **granular allow/deny per domain** + SNI inspection + `egressTransform` for credential injection
- Max duration: 1h (Hobby), 24h (Pro €150/mo)
- SDK: ~5-8 lines to `Sandbox.create()`, `commands.run()`, read stdout/stderr
- Free tier: $100 one-time credit (covers ~10k runs at 30s each — enough for Phase 5 validation)

**Fallback: Vercel Sandbox** (if E2B has an outage or for browser-automation-specific tests where the `vercel:vercel-sandbox` skill gives us an exact blueprint). Auto-auths via Vercel OIDC, rolls into existing Pro bill.

### Constraints enforced
- Max duration: **5 min** per run (E2B `timeout` param, hard-kill at deadline)
- Max memory: **2 GB** (Firecracker VM limit)
- Max CPU: **1 vCPU**
- Network egress allow-list: `github.com`, `api.github.com`, `raw.githubusercontent.com`, `registry.npmjs.org`, `pypi.org`, `files.pythonhosted.org`, the candidate repo's declared API hosts (parsed from README or config), LLM providers, our Supabase project host
- No persistent state — every run is a fresh Firecracker VM from template
- Logs streamed to Supabase Storage (`aam-sandbox-logs/<run_id>.jsonl`) as they arrive

### What's NOT supported (Phase 5)
- GPU workloads
- Multi-step human-in-the-loop
- Persistent storage across runs (by design — we want freshness)
- Browser-automation tests (defer to `vercel:vercel-sandbox` pattern if a gap requires it — flag as "needs_browser_sandbox" and skip for now)

---

## 7. UI additions

### `/admin/hisoka/forge` (new page)

- **Forge queue** — ideas awaiting AAM forge attempt (autonomy 0.75-0.89, status='idle')
- **Active forge** — ideas currently `forging` with spinner + last-step label
- **Recent attempts log** — last 20 `automation_upgrades` rows: idea name · dim · verdict · autonomy delta · cost
- **Budget gauge** — today's spend / €0.50 daily cap, monthly / €15 cap
- **Button `▶ Forge next`** — manual trigger for 1 attempt (picks head of queue)
- **Button `⏸ Pause cron`** — killswitch, writes `/srv/shared/PAUSE_AAM` (parallel to CC Fleet convention)

### On existing `/admin/hisoka` deep dive

- New section "💪 AAM forge status" after Leverage Configs:
  - If `forge_status='promoted'`: green badge "Forged on <date>, dim=<dim>, autonomy lifted from X.XX to Y.YY"
  - If `forge_status='permanent_fail'`: amber badge "AAM exhausted 3 attempts — manual review"
  - If `forge_status='queued'`: blue badge "In AAM forge queue — expected run <next_cron>"
  - History : collapsible list of past `automation_upgrades` rows for this idea

### On `/admin/overview` tile (from Phase 4)

Extend HisokaTopTile with one-liner: "💪 AAM : 3 promus cette semaine, €2.40 spent, 12 in queue"

---

## 8. API routes

```
POST   /api/business-hunter/aam/forge         — trigger 1 forge attempt (admin, cron token allowed)
POST   /api/business-hunter/aam/cron          — called by cron daily, processes N from queue
GET    /api/business-hunter/aam/queue         — list queued ideas + active + recent
GET    /api/business-hunter/aam/attempts/[id] — single attempt with logs
POST   /api/business-hunter/aam/pause         — writes PAUSE file
POST   /api/business-hunter/aam/resume        — clears PAUSE file
```

Auth: `isAdmin()` for admin routes; `CRON_TOKEN` header-based for `/cron`.

---

## 9. Cost model

| Phase | Item | Unit cost | Frequency | Monthly |
|---|---|---|---|---|
| Gap analyzer | Groq free tier | €0 | 150/mo | €0 |
| Scout (+API calls) | Groq + GitHub API free + YT API free | €0 | 150/mo | €0 |
| Alchemist | Sonnet via OpenRouter | €0.005 | 150/mo | €0.75 |
| Tester | E2B ~60s/run (@$0.000168/s) | €0.01 | 150/mo | €1.50 |
| Evaluator | Groq + deterministic | €0.002 | 150/mo | €0.30 |
| **Total** | | | | **~€2.55/mo at 5 attempts/day** |

Within `feedback_infinite_overshoot` €150/mo cap with room to 60× scale if needed.

---

## 10. Gates & safety

### Automated gates
1. `forge_status='idle'` + `autonomy_score ∈ [0.75, 0.89]` + `forge_attempts < 3` + `llc_gate != 'blocked'` — candidate selection
2. Dim targeted must be in `['acquisition','content_ops','fulfillment','support']` — compliance/billing skipped
3. Sandbox run must complete without timeout/OOM — else verdict='failed', not 'needs_human'
4. Benchmark score ≥ dim threshold — else verdict='failed'
5. `autonomy_after - autonomy_before ≥ 0.1` — anti-marginal improvement (avoid promoting tiny gains)
6. `human_params_needed.length ≤ 2` — keeps "one-click setup" promise

### Manual gates
- Admin can review any `automation_upgrades` row in the forge log and **revert** a promotion (downgrades idea back to archives, marks candidate repo as `blacklisted`)
- Admin can **blacklist** a candidate (e.g., sketchy maintainer) so Scout never picks it again

### Killswitches
- File `/srv/shared/PAUSE_AAM` — cron bails at start, manual button stops accepting new attempts
- Budget cap: if cumulative month >= €15, cron bails + alert in `/admin/overview`
- Error rate: if 5 consecutive attempts fail with same error signature → auto-pause + alert

---

## 11. Phasing

### Phase 5.1 — No sandbox, PR-mode (1-2 days)
- Gap Analyzer + Scout + Alchemist agents implemented
- Alchemist output is a **markdown PR body** (human-reviewable plan), NOT a sandbox run
- Tester and Evaluator stubbed — always return `verdict='needs_human'`
- Proves the scout→synthesis loop works + tunes prompt quality before spending sandbox money

### Phase 5.2 — Vercel Sandbox live (3-5 days)
- Tester agent wired to Vercel Sandbox
- Benchmark suites for `content_ops` + `support` shipped (highest-signal dims)
- Evaluator agent computes autonomy_after
- Still manual-only trigger (no cron yet)

### Phase 5.3 — Cron + auto-promote (1-2 days)
- Cron daily 03h00 France triggers N=5 forge attempts
- Promoter agent auto-promotes when gates pass
- Benchmark suites for `acquisition` + `fulfillment` added
- Re-score Hisoka pipeline after each promotion

### Phase 5.4 — Kaizen loop (bonus, 1 day)
- Weekly Sunday-night cron: review `automation_upgrades` with `verdict='failed'` → feed back into Scout's next-attempt context (anti-drift, learn from failures)

---

## 12. Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Sandbox runaway cost | Medium | High | Per-run 5min kill + daily €0.50 cap + monthly €15 cap + auto-pause on error streak |
| Benchmark suite weakness (false positives) | High | High | Hybrid A+C: we curate benchmarks over time; every promotion also triggers a sampling human review (10% sampling, Phase 5.4) |
| Malicious candidate repo | Low | High | Sandbox network allowlist + no persistent state + blacklist flow + candidate must have ≥500 stars |
| LLM hallucinates integration plan | Medium | Medium | Alchemist output validated: install.sh actually runs + entry_point exits 0 before any benchmark |
| Regression: promoted idea later fails in Minato | Medium | Medium | Phase 5.4 Kaizen reads back Minato failures; Nighteye downgrades |
| E2B outage / credit exhausted | Low | High | Vercel Sandbox fallback (already in stack, OIDC-auto-auth) |

---

## 13. Open decisions (to confirm before coding)

1. **Sandbox choice** — ✅ **E2B confirmed winner** by parallel research (cheaper, faster cold start, granular egress, better SDK). Vercel Sandbox = fallback.
2. **Test validity** — ✅ **Option A (synthetic canonical per dim)** confirmed by user 2026-04-22.
3. **Benchmark authoring path** — hand-written templates shipped with spec (no LLM-generated drafts to avoid self-grading).
4. **Starting dim** — Phase 5.2 ships `content_ops` + `support` benchmarks first (highest signal). `acquisition` + `fulfillment` in Phase 5.3.
5. **Cron cadence** — default 1×/day at 03h France. Escalate after 1 week of stable runs.

---

## 14. How this fits memory rules

- `feedback_aam_strategy` — direct expression of AAM: autofinancement croisé via free-tier LLMs + ROI through promoted ideas.
- `feedback_shaka_autonomous` — AAM runs autonomous by default; admin intervenes only at blacklist / revert.
- `feedback_infinite_overshoot` — AAM scales but capped €15/mo, well within €150 budget.
- `feedback_llc_gate_expat` — AAM refuses compliance/billing gaps pre-LLC.
- `feedback_kakashi_reuse` — Scout leverages existing CC ai-pool cascade, HisokaTopTile pattern, admin layout theme.
- `feedback_commit_continu` — spec explicitly phased (5.1 → 5.2 → 5.3 → 5.4) each phase ≤2 days with commits every 15-20 min.

---

**End of design draft v1. 6 defaults applied (per Minato rapid mode).**

Next step: user review this spec, then `superpowers:writing-plans` to produce the implementation plan for Phase 5.1 (scout+alchemist PR-mode, no sandbox).
