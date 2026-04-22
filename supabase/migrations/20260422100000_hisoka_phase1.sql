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
