-- Funnel Registry v1 (Shaka session 2026-04-21)
-- Source canonique DB pour les taux de conversion funnel par produit.
-- Remplace les hardcodes dans lib/simulator-funnels.ts et app/admin/simulator/page.tsx.
--
-- Deux tables :
--   funnel_definitions : config statique (default rates, labels, ordre)
--   funnel_calibrations : mesures réelles depuis events, écrasent les defaults
--
-- Usage côté lib/simulator-funnels.ts :
--   1. SELECT stage_id, default_rate FROM funnel_definitions WHERE product = $1 ORDER BY stage_order
--   2. LEFT JOIN latest funnel_calibrations sur (product, stage_id) si calibrated_rate existe
--   3. Fallback sur hardcode lib si DB vide

-- ── Tables ──────────────────────────────────────────────────
create table if not exists funnel_definitions (
  product text not null,
  stage_id text not null,
  stage_label text not null,
  stage_order int not null,
  default_rate numeric(6,5) not null check (default_rate >= 0 and default_rate <= 1),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  primary key (product, stage_id)
);

create index if not exists idx_funnel_definitions_product_order
  on funnel_definitions(product, stage_order);

create table if not exists funnel_calibrations (
  id uuid default gen_random_uuid() primary key,
  product text not null,
  stage_id text not null,
  measured_rate numeric(6,5) not null check (measured_rate >= 0 and measured_rate <= 1),
  sample_size int not null check (sample_size >= 0),
  period_start timestamptz not null,
  period_end timestamptz not null check (period_end > period_start),
  source text default 'auto',
  created_at timestamptz default now()
);

create index if not exists idx_funnel_calibrations_product_stage
  on funnel_calibrations(product, stage_id, period_end desc);

-- ── RLS : admin-only ────────────────────────────────────────
alter table funnel_definitions enable row level security;
alter table funnel_calibrations enable row level security;

drop policy if exists admin_read_funnel_defs on funnel_definitions;
create policy admin_read_funnel_defs on funnel_definitions
  for select using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and (p.is_admin or p.is_delegate_admin)
    )
  );

drop policy if exists admin_write_funnel_defs on funnel_definitions;
create policy admin_write_funnel_defs on funnel_definitions
  for all using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.is_admin
    )
  );

drop policy if exists admin_read_funnel_calibs on funnel_calibrations;
create policy admin_read_funnel_calibs on funnel_calibrations
  for select using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and (p.is_admin or p.is_delegate_admin)
    )
  );

drop policy if exists admin_write_funnel_calibs on funnel_calibrations;
create policy admin_write_funnel_calibs on funnel_calibrations
  for all using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.is_admin
    )
  );

-- ── Seed from lib/simulator-funnels.ts (2026-04-21 Shaka baseline) ──
insert into funnel_definitions (product, stage_id, stage_label, stage_order, default_rate, notes) values
  -- OFA (modernization pivot)
  ('ofa', 'siteAnalyzed',     'Lead → site analysé',                  1, 0.95, null),
  ('ofa', 'uglyQualified',    'Analysé → ugly ≥ 50 (pitch-worthy)',   2, 0.55, null),
  ('ofa', 'contactExtracted', 'Ugly → email/phone extrait',           3, 0.70, null),
  ('ofa', 'pitched',          'Contact → pitch before/after',         4, 0.95, null),
  ('ofa', 'opened',           'Pitché → ouvert (personnalisé)',       5, 0.55, null),
  ('ofa', 'responded',        'Ouvert → réponse (ROI chiffré)',       6, 0.12, null),
  ('ofa', 'demo',             'Réponse → preview 3 designs vue',      7, 0.55, null),
  ('ofa', 'paid',             'Preview → achat 149€',                 8, 0.35, null),

  -- FTG
  ('ftg', 'sourced',      'Prospect sourcé',                             1, 1.00, null),
  ('ftg', 'enriched',     'Sourcé → contact trouvé (max canaux)',        2, 0.60, null),
  ('ftg', 'outreached',   'Contact → outreach envoyé',                   3, 0.92, null),
  ('ftg', 'responded',    'Outreach → réponse (perso + ROI)',            4, 0.07, null),
  ('ftg', 'demo',         'Réponse → parcours démo guidé',               5, 0.50, null),
  ('ftg', 'contentReady', 'Démo → parcours rempli (Eishi layer 1)',      6, 0.85, null),
  ('ftg', 'paid',         'Contenu rempli → abonné (×2 vs vide)',        7, 0.28, null),

  -- Estate
  ('estate', 'enriched',  'Hôtel identifié → contact trouvé',   1, 0.40, null),
  ('estate', 'pitched',   'Contact → pitch envoyé',             2, 0.95, null),
  ('estate', 'responded', 'Pitch → réponse',                    3, 0.10, null),
  ('estate', 'demo',      'Réponse → demo produit',             4, 0.50, null),
  ('estate', 'paid',      'Demo → licence signée',              5, 0.25, null),

  -- Shift Dynamics
  ('shiftdynamics', 'enriched',  'Entreprise cible → décideur trouvé', 1, 0.30, null),
  ('shiftdynamics', 'pitched',   'Décideur → LinkedIn/email envoyé',   2, 0.90, null),
  ('shiftdynamics', 'responded', 'Envoi → réponse',                    3, 0.05, null),
  ('shiftdynamics', 'demo',      'Réponse → call découverte',          4, 0.60, null),
  ('shiftdynamics', 'paid',      'Call → contrat signé',               5, 0.15, null),

  -- Command Center (internal usage)
  ('cc', 'usage',     'Action déclenchée → succès',          1, 0.85, null),
  ('cc', 'recurrent', 'Succès → réutilisation /sem',         2, 0.50, null)
on conflict (product, stage_id) do update set
  stage_label  = excluded.stage_label,
  stage_order  = excluded.stage_order,
  default_rate = excluded.default_rate,
  updated_at   = now();

-- ── View : latest calibration par (product, stage) ──
create or replace view v_funnel_effective_rates as
select
  d.product,
  d.stage_id,
  d.stage_label,
  d.stage_order,
  d.default_rate,
  lc.measured_rate as calibrated_rate,
  lc.sample_size    as calibration_sample,
  lc.period_end     as calibrated_at,
  coalesce(lc.measured_rate, d.default_rate) as effective_rate
from funnel_definitions d
left join lateral (
  select measured_rate, sample_size, period_end
  from funnel_calibrations c
  where c.product = d.product and c.stage_id = d.stage_id
  order by period_end desc
  limit 1
) lc on true;
