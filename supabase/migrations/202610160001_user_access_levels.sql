-- GMP — Niveaux d’accès utilisateurs : administrateur, modification et lecture seule.
-- À appliquer dans Supabase après les migrations précédentes.

begin;

create or replace function public.can_manage_biomedical()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.is_active = true
      and p.role in ('admin', 'biomedical_manager')
  );
$$;

create or replace function public.is_active_gmp_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_active = true and p.role = 'admin'
  );
$$;

-- Le niveau Modification peut gérer le parc, mais seul un administrateur gère les profils.
drop policy if exists "profiles_update_admin_only" on public.profiles;
create policy "profiles_update_admin_only" on public.profiles
for update to authenticated
using (public.is_active_gmp_admin())
with check (public.is_active_gmp_admin());

revoke all on function public.is_active_gmp_admin() from public;
grant execute on function public.is_active_gmp_admin() to authenticated;

commit;
