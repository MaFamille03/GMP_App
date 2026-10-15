-- GMP — Étape 9 : durcissement des accès et audit des changements de profils.
-- À appliquer après les migrations 001 à 007 sur une base de développement d'abord.

begin;

-- Le rôle professionnel ne confère aucun privilège : seul admin peut gérer les données.
create or replace function public.can_manage_biomedical()
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

-- Les comptes inactifs, même historiquement administrateurs, ne peuvent plus modifier les profils.
drop policy if exists "profiles_update_admin_only" on public.profiles;
create policy "profiles_update_admin_only" on public.profiles
for update to authenticated
using (public.can_manage_biomedical())
with check (public.can_manage_biomedical());

-- Remplace la politique de consultation des journaux par un accès administrateur actif.
drop policy if exists "audit_logs_read_managers" on public.audit_logs;
drop policy if exists "audit_logs_read_admin_only" on public.audit_logs;
create policy "audit_logs_read_admin_only" on public.audit_logs
for select to authenticated using (public.can_manage_biomedical());

-- Les clients authentifiés ne peuvent pas écrire directement dans le journal d'audit.
drop policy if exists "audit_logs_insert_admin_only" on public.audit_logs;
drop policy if exists "audit_logs_update_admin_only" on public.audit_logs;
drop policy if exists "audit_logs_delete_admin_only" on public.audit_logs;

create or replace function public.audit_profile_security_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (old.role is distinct from new.role)
     or (old.is_active is distinct from new.is_active)
     or (old.display_name is distinct from new.display_name)
     or (old.job_title is distinct from new.job_title) then
    insert into public.audit_logs(actor_id, action, entity_table, entity_id, old_values, new_values)
    values (
      auth.uid(),
      case
        when old.role is distinct from new.role then 'profile_role_changed'
        when old.is_active is distinct from new.is_active and new.is_active = false then 'profile_deactivated'
        when old.is_active is distinct from new.is_active and new.is_active = true then 'profile_reactivated'
        else 'profile_details_changed'
      end,
      'profiles',
      new.id::text,
      jsonb_build_object('role', old.role, 'is_active', old.is_active, 'display_name', old.display_name, 'job_title', old.job_title),
      jsonb_build_object('role', new.role, 'is_active', new.is_active, 'display_name', new.display_name, 'job_title', new.job_title)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists audit_profile_security_changes_trigger on public.profiles;
create trigger audit_profile_security_changes_trigger
after update on public.profiles
for each row execute function public.audit_profile_security_changes();

commit;
