-- auth-v2 — DB trigger: invalidate all sessions + refresh tokens when password changes.
-- Applied via Supabase Management API on 2026-04-15 (jebuagyeapkltyjitosm).

create or replace function public.auth_v2_invalidate_on_password_change()
returns trigger as $$
begin
  if old.encrypted_password is distinct from new.encrypted_password then
    delete from auth.sessions where user_id = new.id;
    delete from auth.refresh_tokens where user_id = new.id::text;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists auth_v2_on_password_change on auth.users;
create trigger auth_v2_on_password_change
  after update on auth.users
  for each row execute function public.auth_v2_invalidate_on_password_change();
