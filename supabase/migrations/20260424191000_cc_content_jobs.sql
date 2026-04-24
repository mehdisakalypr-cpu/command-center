-- Content-filling jobs — progression + ETA + daily rhythm per project/platform.
-- Surfaced at /admin/content-jobs. Computed fields (pct_done, items_per_day,
-- eta_days) are refreshed nightly by /api/cron/refresh-dashboards, and can be
-- triggered manually from /admin/overview "Actualiser" button.

create table if not exists cc_content_jobs (
  id                 uuid primary key default gen_random_uuid(),
  project            text not null check (project in ('ftg','ofa','cc','estate','shift','optimus','hisoka','aam','general')),
  platform           text not null default 'n/a',  -- desktop/mobile/api/queue-name
  job_key            text not null,                 -- stable slug, e.g. 'ftg_product_country_content_fr'
  label              text not null,
  description        text,
  total_target       int  not null default 0,       -- how many items must be filled
  completed          int  not null default 0,       -- how many are done
  pct_done           numeric generated always as (
                       case when total_target > 0 then round((completed::numeric / total_target) * 100, 2) else 0 end
                     ) stored,
  avg_seconds_per_item int,                         -- moving avg of task duration
  items_per_day      numeric,                       -- rolling 7d throughput
  eta_days           numeric generated always as (
                       case when items_per_day > 0 and total_target > completed
                            then ceil((total_target - completed)::numeric / items_per_day)
                            else null end
                     ) stored,
  source_query       text,                          -- SQL to refresh completed/total
  last_refreshed_at  timestamptz,
  last_delta_today   int default 0,                 -- completed increase in last 24h
  notes              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create unique index if not exists uq_cc_content_jobs_project_key
  on cc_content_jobs (project, job_key);
create index if not exists idx_cc_content_jobs_project on cc_content_jobs (project);

comment on table cc_content_jobs is
  'Content-filling progression dashboard. total_target/completed refreshed nightly from source_query, or via /api/admin/refresh-dashboards.';

-- Seed known FTG content queues (safe repeat — ON CONFLICT DO NOTHING)
insert into cc_content_jobs (project, platform, job_key, label, description, total_target, completed, source_query)
values
 ('ftg','api','ftg_product_country_content_fr','Content FR par (product × country)','Pair content ftg_product_country_content langue=fr, status=ready',
   (select count(*) from ftg_product_country_pair_agg),
   coalesce((select count(*) from ftg_product_country_content where lang='fr' and status='ready'),0),
   $s$select count(*) from ftg_product_country_pair_agg$s$),
 ('ftg','api','ftg_product_country_content_en','Content EN par (product × country)','Pair content langue=en, status=ready',
   (select count(*) from ftg_product_country_pair_agg),
   coalesce((select count(*) from ftg_product_country_content where lang='en' and status='ready'),0),
   $s$select count(*) from ftg_product_country_pair_agg$s$),
 ('ftg','api','ftg_product_country_videos','Vidéos par (product × country)','Vidéos ready ftg_product_country_videos',
   (select count(*) from ftg_product_country_pair_agg),
   coalesce((select count(*) from ftg_product_country_videos where status='ready'),0),
   $s$select count(*) from ftg_product_country_pair_agg$s$),
 ('ftg','api','entrepreneur_demos_enriched','Demos avec email (déblocage outreach)','entrepreneur_demos avec email IS NOT NULL',
   coalesce((select count(*) from entrepreneur_demos),0),
   coalesce((select count(*) from entrepreneur_demos where email is not null),0),
   $s$select count(*) from entrepreneur_demos$s$),
 ('ftg','api','entrepreneur_demos_outreach_sent','Outreach envoyés','entrepreneur_demos avec outreach_sent_at IS NOT NULL',
   coalesce((select count(*) from entrepreneur_demos),0),
   coalesce((select count(*) from entrepreneur_demos where outreach_sent_at is not null),0),
   $s$select count(*) from entrepreneur_demos$s$),
 ('ftg','api','entrepreneurs_directory_email','Directory emails enrichis','entrepreneurs_directory avec email IS NOT NULL',
   coalesce((select count(*) from entrepreneurs_directory),0),
   coalesce((select count(*) from entrepreneurs_directory where email is not null),0),
   $s$select count(*) from entrepreneurs_directory$s$),
 ('ftg','api','ftg_business_plans','Business plans générés','business_plans livrés',
   0,
   coalesce((select count(*) from business_plans),0),
   $s$select 0$s$),
 ('ofa','api','ofa_sites_published','Sites OFA publiés','generated_sites status=claimed',
   coalesce((select count(*) from generated_sites),0),
   coalesce((select count(*) from generated_sites where status='claimed'),0),
   $s$select count(*) from generated_sites$s$)
on conflict (project, job_key) do update set
  total_target = excluded.total_target,
  completed = excluded.completed,
  last_refreshed_at = now();
