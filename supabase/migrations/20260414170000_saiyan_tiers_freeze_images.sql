-- Freeze saiyan_tiers.image_url so no agent ever overwrites them.
-- User confirmed 2026-04-14 : images Creator sont parfaites, on les fige.

-- 1. Add a lock column
alter table saiyan_tiers add column if not exists image_locked boolean not null default false;

-- 2. Lock every existing tier EXCEPT 'kid' (Sangoku petit) — user veut regénérer jusqu'à trouver
--    la bonne image (Kid Goku doit tenir son bâton magique Nyoi-Bo / Power Pole).
update saiyan_tiers set image_locked = true  where image_url is not null and code <> 'kid';
update saiyan_tiers set image_locked = false where code = 'kid';

-- 3. Trigger that blocks UPDATE on image_url when locked
create or replace function prevent_locked_image_change()
returns trigger language plpgsql as $$
begin
  if old.image_locked is true and new.image_url is distinct from old.image_url then
    raise exception 'saiyan_tiers.image_url is locked for tier %. Unlock with UPDATE saiyan_tiers SET image_locked = false WHERE code = ''%''.', old.code, old.code;
  end if;
  return new;
end $$;

drop trigger if exists trg_saiyan_image_lock on saiyan_tiers;
create trigger trg_saiyan_image_lock
  before update on saiyan_tiers
  for each row execute function prevent_locked_image_change();
