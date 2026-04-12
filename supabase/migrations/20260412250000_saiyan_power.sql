alter table if exists saiyan_tiers
  add column if not exists power_level bigint,
  add column if not exists power_unit text default 'unités',
  add column if not exists transformation_note text;
