-- Hisoka Phase 3B — Portfolio Mode table.
-- Spec: docs/superpowers/specs/2026-04-22-business-hunter-design.md §Portfolio
-- RLS: admin-only via service role (no policies => only service_role can read/write).

begin;

create extension if not exists pgcrypto;

create table if not exists public.business_portfolios (
  id                    uuid primary key default gen_random_uuid(),
  available_capital_eur numeric(10,2) not null,
  max_workers_to_add    int not null default 0,
  risk_appetite         text not null check (risk_appetite in ('conservative','balanced','aggressive')),

  -- jsonb array of Allocation objects
  allocation            jsonb not null default '[]'::jsonb,

  -- aggregate metrics
  expected_arr_y3_eur   numeric(12,2),
  irr_y3_pct            numeric(8,2),
  sp500_delta_pct       numeric(8,2),
  max_drawdown_pct      numeric(6,2),
  diversification_score numeric(4,3),

  -- benchmark comparison table
  comparison_table      jsonb,

  rationale             text,
  created_at            timestamptz not null default now()
);

create index if not exists idx_biz_portfolios_created on public.business_portfolios(created_at desc);

alter table public.business_portfolios enable row level security;
-- No policies => only service_role can read/write.

commit;
