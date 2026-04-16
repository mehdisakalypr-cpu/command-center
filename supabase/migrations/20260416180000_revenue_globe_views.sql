-- /admin/globe data layer
-- Vues agrégées + Realtime publication pour la carte du monde temps réel CA/MRR/Visites.

-- Safety : si les colonnes custom ne sont pas encore là, on les ajoute.
alter table if exists revenue_events add column if not exists site text;
alter table if exists revenue_events add column if not exists country_iso text;
alter table if exists revenue_events add column if not exists funnel_step text;

create index if not exists idx_revenue_events_country on revenue_events (country_iso);
create index if not exists idx_revenue_events_site on revenue_events (site);
create index if not exists idx_revenue_events_created on revenue_events (created_at desc);
create index if not exists idx_revenue_events_product on revenue_events (product);
create index if not exists idx_funnel_events_step on funnel_events (step);
create index if not exists idx_funnel_events_created on funnel_events (created_at desc);

-- ── 1. CA par pays (depuis country_iso colonne OU metadata.country_iso fallback) ──
create or replace view v_revenue_by_country as
select
  coalesce(re.country_iso, re.metadata->>'country_iso') as iso,
  c.name,
  c.lat,
  c.lng,
  c.flag,
  count(*) filter (where re.event_type = 'purchase')           as purchases,
  count(*) filter (where re.event_type = 'subscription_start') as new_subs,
  count(distinct re.customer_id)                               as customers,
  coalesce(sum(re.amount_eur) filter (where re.interval is null), 0) as ca_hors_mrr,
  coalesce(sum(re.amount_eur) filter (where re.interval = 'month'), 0) as mrr,
  coalesce(sum(re.amount_eur), 0)                              as ca_total,
  max(re.created_at)                                           as last_event_at
from revenue_events re
left join countries c
  on c.iso2 = upper(coalesce(re.country_iso, re.metadata->>'country_iso'))
where coalesce(re.country_iso, re.metadata->>'country_iso') is not null
group by 1, c.name, c.lat, c.lng, c.flag;

-- ── 2. CA par produit + nb clients + MRR par produit ──
create or replace view v_revenue_by_product as
select
  re.product,
  coalesce(max(pc.name), re.product)                                as product_name,
  coalesce(max(pc.origin_country), max(re.metadata->>'origin_country')) as origin_country,
  coalesce(max(pc.category), max(re.metadata->>'category'))         as category,
  count(*) filter (where re.event_type = 'purchase')                as purchases,
  count(distinct re.customer_id)                                    as customers,
  coalesce(sum(re.amount_eur) filter (where re.interval is null), 0)    as ca_hors_mrr,
  coalesce(sum(re.amount_eur) filter (where re.interval = 'month'), 0)  as mrr,
  coalesce(sum(re.amount_eur), 0)                                   as ca_total,
  max(re.created_at)                                                as last_event_at
from revenue_events re
left join products_catalog pc on pc.slug = re.product or pc.id::text = re.product
group by re.product;

-- ── 3. Visites par parcours (funnel) ──
create or replace view v_funnel_stages as
select
  fe.step,
  count(*)                                                      as visits,
  count(distinct fe.session_id)                                 as unique_sessions,
  count(distinct fe.user_id)                                    as unique_users,
  max(fe.created_at)                                            as last_at
from funnel_events fe
where fe.created_at > now() - interval '24 hours'
group by fe.step;

-- ── 4. KPIs live (single row) ──
create or replace view v_live_kpis as
select
  coalesce(sum(re.amount_eur) filter (where re.interval = 'month'), 0) as mrr_total,
  coalesce(sum(re.amount_eur) filter (where re.interval is null), 0)   as ca_hors_mrr_total,
  coalesce(sum(re.amount_eur), 0)                                      as ca_total,
  count(distinct re.customer_id)                                       as payeurs_total,
  count(*) filter (where re.event_type = 'subscription_start')         as subs_count,
  count(*) filter (where re.event_type = 'purchase')                   as purchases_count,
  (select count(distinct session_id) from funnel_events
   where created_at > now() - interval '24 hours')                     as visits_24h,
  (select count(distinct session_id) from funnel_events
   where created_at > now() - interval '5 minutes')                    as visits_live
from revenue_events re;

-- ── 5. Realtime publication ──
-- Permet aux clients Realtime de s'abonner aux INSERT sur revenue_events et funnel_events.
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'revenue_events') then
    alter publication supabase_realtime add table revenue_events;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'funnel_events') then
    alter publication supabase_realtime add table funnel_events;
  end if;
exception when others then
  raise notice 'Realtime publication already configured or not available: %', sqlerrm;
end $$;

-- ── 6. RLS : les vues lisent revenue_events/funnel_events qui ont déjà leurs policies.
--     Pour /admin/globe on utilisera la service_role côté serveur → pas d'impact RLS.
