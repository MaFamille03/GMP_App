-- GMP — Étape 2 : modèle d'accès effectif à deux niveaux.
-- Les rôles historiques restent dans l'enum pour éviter une migration destructive,
-- mais seul role='admin' accorde des droits d'écriture. Tout autre rôle est observateur.

begin;

create or replace function public.can_manage_biomedical()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_app_role() = 'admin', false);
$$;

-- Les comptes actifs peuvent consulter les profils actifs afin d'identifier les
-- intervenants dans les historiques. Les administrateurs peuvent aussi voir les inactifs.
drop policy if exists "profiles_select_self_or_admin" on public.profiles;
create policy "profiles_select_active_users_or_admin" on public.profiles
for select to authenticated
using (
  id = (select auth.uid())
  or (public.is_active_user() and is_active = true)
  or public.current_app_role() = 'admin'
);

-- Un observateur ne peut pas créer un signalement depuis l'application :
-- le technicien-administrateur documente toutes les opérations.
drop policy if exists "breakdowns_insert_reporter" on public.breakdowns;
drop policy if exists "breakdowns_insert_admin_only" on public.breakdowns;
create policy "breakdowns_insert_admin_only" on public.breakdowns
for insert to authenticated
with check (public.can_manage_biomedical());

-- Protection explicite des modifications de panne : seuls les administrateurs écrivent.
drop policy if exists "breakdowns_manage_biomedical" on public.breakdowns;
create policy "breakdowns_manage_biomedical" on public.breakdowns
for update to authenticated
using (public.can_manage_biomedical())
with check (public.can_manage_biomedical());

commit;
