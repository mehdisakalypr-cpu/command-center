-- Infrastructure capacity management — provider tiers + usage samples + alerts + auto-scale audit.
-- Purpose: know at any moment % of tier consumed per provider, trigger WARN/CRITICAL/LOCKOUT alerts,
-- and log every auto-scale action for cost propagation into potential_raises.

create table if not exists infrastructure_providers (
  id              bigserial primary key,
  provider        text not null,               -- vercel, supabase, cloudflare, resend, sentry, stripe, mercury, uptime, logs, registrar
  -- which of our projects consumes this provider
  scope           text not null check (scope in ('ofa','ftg','cc','shared')),
  unique (provider, scope)
);

create table if not exists infrastructure_tiers (
  id              bigserial primary key,
  provider        text not null,               -- vercel, supabase, cloudflare, ...
  tier_name       text not null,               -- "Hobby", "Pro", "Team", "Enterprise"
  rank            integer not null,            -- 0 = free, 1 = entry-paid, 2 = mid, 3 = enterprise
  monthly_cost_eur numeric not null default 0,
  -- limits dimensions — null means unlimited or not applicable
  limits          jsonb not null default '{}', -- e.g. {"bandwidth_gb":100,"fn_invocations":1000000,"db_gb":8,"mau":50000,"emails_mo":50000}
  lockout_behavior text,                       -- "429 rate limit" / "overage billed" / "service suspended"
  pricing_url     text,
  active          boolean not null default true,
  unique (provider, tier_name)
);

-- Current active tier per provider (what we're paying for right now)
create table if not exists infrastructure_subscriptions (
  id              bigserial primary key,
  provider        text not null,
  scope           text not null check (scope in ('ofa','ftg','cc','shared')),
  current_tier_id bigint references infrastructure_tiers(id),
  started_at      timestamptz not null default now(),
  ended_at        timestamptz,
  cost_eur_month  numeric not null default 0,
  notes           text,
  unique (provider, scope) deferrable initially deferred
);

-- Usage samples ingested from provider APIs (or manual)
create table if not exists infrastructure_usage_samples (
  id              bigserial primary key,
  provider        text not null,
  scope           text not null,
  sampled_at      timestamptz not null default now(),
  metric          text not null,               -- "bandwidth_gb", "fn_invocations", "db_gb", "mau", "emails_sent", "requests_edge"
  value           numeric not null,
  period          text not null default 'mtd', -- "mtd" (month-to-date), "last_24h", "live"
  raw             jsonb
);
create index if not exists idx_infra_usage_at on infrastructure_usage_samples(provider, sampled_at desc);
create index if not exists idx_infra_usage_metric on infrastructure_usage_samples(provider, metric, sampled_at desc);

-- Alerts triggered — one row per threshold crossing
create table if not exists infrastructure_alerts (
  id              bigserial primary key,
  triggered_at    timestamptz not null default now(),
  provider        text not null,
  scope           text not null,
  metric          text not null,
  value           numeric not null,
  limit_value     numeric not null,
  pct_used        numeric not null,            -- 0..100+
  severity        text not null check (severity in ('warn','critical','lockout')),
  action_taken    text,                        -- "notified", "auto_scaled", "awaiting_human"
  tier_before_id  bigint references infrastructure_tiers(id),
  tier_after_id   bigint references infrastructure_tiers(id),
  resolved_at     timestamptz,
  resolved_by     text,
  potential_raise_id bigint references potential_raises(id) -- auto-logged cost delta
);
create index if not exists idx_infra_alerts_triggered on infrastructure_alerts(triggered_at desc);

-- Thresholds configuration per metric
create table if not exists infrastructure_thresholds (
  id              bigserial primary key,
  provider        text not null,
  metric          text not null,
  warn_pct        numeric not null default 70,    -- 70% → warn
  critical_pct    numeric not null default 90,    -- 90% → critical + auto-scale if allowed
  lockout_pct     numeric not null default 100,   -- 100% → lockout
  auto_scale      boolean not null default false, -- if true at critical, bump to next tier without human
  max_auto_cost_delta_eur numeric not null default 50, -- do NOT auto-scale if monthly delta > this
  unique (provider, metric)
);

-- Seed providers + tiers (prix 2026, ordres de grandeur — source bench agent OFA 2026-04-14)
insert into infrastructure_tiers (provider, tier_name, rank, monthly_cost_eur, limits, lockout_behavior, pricing_url) values
  -- Vercel
  ('vercel', 'Hobby',      0, 0,   '{"bandwidth_gb":100,"fn_invocations_mo":100000,"fn_duration_mo_gbh":100,"edge_req_mo":1000000,"builds_concurrent":1}'::jsonb, 'projects suspended (personal use only anyway)', 'https://vercel.com/pricing'),
  ('vercel', 'Pro',        1, 20,  '{"bandwidth_gb":1000,"fn_invocations_mo":1000000,"fn_duration_mo_gbh":1000,"edge_req_mo":10000000,"builds_concurrent":6}'::jsonb, 'overage billed (~$0.40/GB bandwidth)', 'https://vercel.com/pricing'),
  ('vercel', 'Team',       2, 50,  '{"bandwidth_gb":2000,"fn_invocations_mo":5000000,"fn_duration_mo_gbh":2000,"edge_req_mo":25000000,"builds_concurrent":12}'::jsonb, 'overage billed', 'https://vercel.com/pricing'),
  -- Supabase
  ('supabase', 'Free',     0, 0,   '{"db_gb":0.5,"mau":50000,"storage_gb":1,"egress_gb":5,"realtime_concurrent":200}'::jsonb, 'project paused after 7d inactivity + hard read-only at 500MB', 'https://supabase.com/pricing'),
  ('supabase', 'Pro',      1, 23,  '{"db_gb":8,"mau":100000,"storage_gb":100,"egress_gb":250,"realtime_concurrent":500}'::jsonb, 'overage billed (~$0.125/GB egress)', 'https://supabase.com/pricing'),
  ('supabase', 'Team',     2, 555, '{"db_gb":50,"mau":500000,"storage_gb":500,"egress_gb":1000,"realtime_concurrent":2000}'::jsonb, 'overage billed', 'https://supabase.com/pricing'),
  -- Cloudflare
  ('cloudflare', 'Free',   0, 0,   '{"requests_mo_workers":100000,"r2_storage_gb":10,"r2_egress_gb":"free","dns_queries":"unlimited"}'::jsonb, 'Workers stop at quota', 'https://www.cloudflare.com/plans/'),
  ('cloudflare', 'Workers Paid', 1, 5, '{"requests_mo_workers":10000000,"kv_reads_mo":10000000}'::jsonb, 'overage billed', 'https://developers.cloudflare.com/workers/platform/pricing/'),
  ('cloudflare', 'Pro',    2, 23,  '{"requests_mo":"unlimited","image_optimizations_mo":100000}'::jsonb, 'overage billed', 'https://www.cloudflare.com/plans/'),
  -- Resend
  ('resend', 'Free',       0, 0,   '{"emails_mo":3000,"emails_day":100,"domains":1}'::jsonb, 'emails rejected', 'https://resend.com/pricing'),
  ('resend', 'Pro',        1, 18,  '{"emails_mo":50000,"emails_day":"unlimited","domains":10}'::jsonb, 'overage $0.40 per 1k', 'https://resend.com/pricing'),
  ('resend', 'Business',   2, 85,  '{"emails_mo":500000,"domains":50}'::jsonb, 'overage billed', 'https://resend.com/pricing'),
  -- Sentry
  ('sentry', 'Developer',  0, 0,   '{"errors_mo":5000,"transactions_mo":10000,"replays_mo":50}'::jsonb, 'over-quota errors dropped', 'https://sentry.io/pricing/'),
  ('sentry', 'Team',       1, 27,  '{"errors_mo":50000,"transactions_mo":100000,"replays_mo":500}'::jsonb, 'overage billed', 'https://sentry.io/pricing/'),
  ('sentry', 'Business',   2, 85,  '{"errors_mo":200000,"transactions_mo":500000,"replays_mo":5000}'::jsonb, 'overage billed', 'https://sentry.io/pricing/'),
  -- Better Stack (Uptime + Logs)
  ('betterstack', 'Free',  0, 0,   '{"monitors":10,"log_gb":1}'::jsonb, 'monitors paused', 'https://betterstack.com/pricing'),
  ('betterstack', 'Team',  1, 18,  '{"monitors":50,"log_gb":30,"status_page":1}'::jsonb, 'overage billed', 'https://betterstack.com/pricing')
on conflict (provider, tier_name) do update set
  monthly_cost_eur = excluded.monthly_cost_eur,
  limits = excluded.limits,
  lockout_behavior = excluded.lockout_behavior,
  pricing_url = excluded.pricing_url;

-- Seed default thresholds (warn 70%, critical 90%, lockout 100%)
insert into infrastructure_thresholds (provider, metric, warn_pct, critical_pct, lockout_pct, auto_scale, max_auto_cost_delta_eur) values
  ('vercel',      'bandwidth_gb',         70, 90, 100, true,  30),
  ('vercel',      'fn_invocations_mo',    70, 90, 100, true,  30),
  ('vercel',      'fn_duration_mo_gbh',   70, 90, 100, true,  30),
  ('supabase',    'db_gb',                70, 85,  95, false, 0),   -- requires manual (data migration)
  ('supabase',    'mau',                  70, 90, 100, true,  25),
  ('supabase',    'egress_gb',            70, 90, 100, true,  25),
  ('supabase',    'storage_gb',           70, 90, 100, true,  25),
  ('cloudflare',  'requests_mo_workers',  70, 90, 100, true,   5),
  ('resend',      'emails_mo',            70, 90, 100, true,  20),
  ('sentry',      'errors_mo',            80, 95, 100, false, 30),
  ('betterstack', 'monitors',             70, 90, 100, true,  20)
on conflict (provider, metric) do update set
  warn_pct = excluded.warn_pct,
  critical_pct = excluded.critical_pct,
  lockout_pct = excluded.lockout_pct,
  auto_scale = excluded.auto_scale,
  max_auto_cost_delta_eur = excluded.max_auto_cost_delta_eur;

-- Seed initial subscriptions (what we're on NOW — baseline)
insert into infrastructure_subscriptions (provider, scope, current_tier_id, cost_eur_month, notes)
select 'vercel', s, (select id from infrastructure_tiers where provider='vercel' and tier_name='Hobby'), 0, 'pre-launch baseline'
from unnest(array['ofa','ftg','cc']) s
on conflict (provider, scope) do nothing;

insert into infrastructure_subscriptions (provider, scope, current_tier_id, cost_eur_month, notes)
values
  ('supabase',    'ofa',    (select id from infrastructure_tiers where provider='supabase'    and tier_name='Free'),         0, 'pre-launch'),
  ('supabase',    'ftg',    (select id from infrastructure_tiers where provider='supabase'    and tier_name='Free'),         0, 'pre-launch'),
  ('supabase',    'cc',     (select id from infrastructure_tiers where provider='supabase'    and tier_name='Free'),         0, 'pre-launch'),
  ('cloudflare',  'shared', (select id from infrastructure_tiers where provider='cloudflare'  and tier_name='Free'),         0, 'pre-launch'),
  ('resend',      'ofa',    (select id from infrastructure_tiers where provider='resend'      and tier_name='Free'),         0, 'pre-launch'),
  ('resend',      'ftg',    (select id from infrastructure_tiers where provider='resend'      and tier_name='Free'),         0, 'pre-launch'),
  ('sentry',      'shared', (select id from infrastructure_tiers where provider='sentry'      and tier_name='Developer'),    0, 'pre-launch'),
  ('betterstack', 'shared', (select id from infrastructure_tiers where provider='betterstack' and tier_name='Free'),         0, 'pre-launch')
on conflict (provider, scope) do nothing;

-- View of current capacity utilization across providers
create or replace view v_infrastructure_utilization as
with latest as (
  select distinct on (provider, scope, metric)
    provider, scope, metric, value, sampled_at
  from infrastructure_usage_samples
  where period = 'mtd'
  order by provider, scope, metric, sampled_at desc
)
select
  l.provider,
  l.scope,
  l.metric,
  l.value,
  (t.limits->>l.metric)::numeric as limit_value,
  case when (t.limits->>l.metric)::numeric > 0
    then round((l.value / (t.limits->>l.metric)::numeric) * 100, 1)
    else null
  end as pct_used,
  t.tier_name as current_tier,
  t.monthly_cost_eur as current_cost_eur,
  l.sampled_at
from latest l
join infrastructure_subscriptions s on s.provider = l.provider and s.scope = l.scope and s.ended_at is null
join infrastructure_tiers t on t.id = s.current_tier_id;
