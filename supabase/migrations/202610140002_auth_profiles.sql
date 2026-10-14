-- GMP — Étape 2 : profil automatique à l'inscription et séparation fonction / privilèges.
-- À exécuter après 202610140001_initial_schema.sql.
-- Cette migration ne promeut aucun utilisateur au rôle administrateur.

begin;

alter table public.profiles
  add column if not exists job_title text;

-- Seul le rôle admin dispose des permissions de gestion du parc dans cette version.
-- La fonction déclarée par l'utilisateur (job_title) n'accorde aucun privilège.
create or replace function public.can_manage_biomedical()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_app_role() = 'admin', false);
$$;

-- Crée le profil à partir des métadonnées d'inscription Supabase Auth.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, job_title, role, is_active)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Utilisateur'
    ),
    nullif(trim(new.raw_user_meta_data ->> 'job_title'), ''),
    'service_manager',
    true
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_gmp_profile on auth.users;
create trigger on_auth_user_created_gmp_profile
after insert on auth.users
for each row execute function public.handle_new_auth_user();

-- Backfill des comptes existants qui n'auraient pas encore de profil.
insert into public.profiles (id, display_name, job_title, role, is_active)
select
  u.id,
  coalesce(
    nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''),
    nullif(split_part(coalesce(u.email, ''), '@', 1), ''),
    'Utilisateur'
  ),
  nullif(trim(u.raw_user_meta_data ->> 'job_title'), ''),
  'service_manager',
  true
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;

-- Évite qu'un utilisateur ordinaire modifie son profil de permissions.
-- Les changements de rôle restent réservés à une procédure administrative contrôlée.
drop policy if exists "profiles_update_self_or_admin" on public.profiles;
drop policy if exists "profiles_update_admin_only" on public.profiles;
create policy "profiles_update_admin_only" on public.profiles
for update to authenticated
using (public.current_app_role() = 'admin')
with check (public.current_app_role() = 'admin');

commit;
