-- Multi-pages par défaut pour OFA — extrait vidéos YouTube (Jack Roberts)
-- "single-page = amateur" : tout archétype pro doit rendre en multi-page.

alter table generated_sites
  add column if not exists layout_mode text not null default 'multi';

-- Backfill: tous les sites existants passent en 'multi' sauf si explicitement marqués sinon
-- (aucune marque 'single' aujourd'hui → 100% multi)
update generated_sites set layout_mode = 'multi' where layout_mode is null;

-- Constraint lisible
alter table generated_sites
  drop constraint if exists generated_sites_layout_mode_check;
alter table generated_sites
  add constraint generated_sites_layout_mode_check check (layout_mode in ('multi', 'single'));
