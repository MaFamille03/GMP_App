-- GMP — Étape 4 : enrichissement du cycle de vie des pannes.
-- À appliquer après les migrations 202610140001, 202610140002,
-- 202610140009 et 202610150001.

begin;

alter table public.breakdowns
  add column if not exists intervention_mode text not null default 'internal'
    check (intervention_mode in ('internal','external','undetermined')),
  add column if not exists external_provider_name text,
  add column if not exists provider_reference text,
  add column if not exists diagnosis_details text,
  add column if not exists corrective_actions text,
  add column if not exists parts_used text,
  add column if not exists safety_test_notes text,
  add column if not exists return_to_service_checklist jsonb not null default '[]'::jsonb,
  add column if not exists equipment_restored_at timestamptz,
  add column if not exists equipment_restored_by uuid references public.profiles(id) on delete set null;

comment on column public.breakdowns.intervention_mode is 'Mode de prise en charge : interne, externe ou encore indéterminé.';
comment on column public.breakdowns.safety_test_notes is 'Résultats des contrôles et essais effectués avant la remise en service.';

-- Historique des changements de statut pour assurer la traçabilité du dossier.
create or replace function public.log_breakdown_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'INSERT' then
    insert into public.audit_logs(actor_id, action, entity_table, entity_id, old_values, new_values)
    values (auth.uid(), 'breakdown_created', 'breakdowns', new.id::text, null,
      jsonb_build_object('status', new.status, 'priority', new.priority, 'equipment_id', new.equipment_id));
  elsif old.status is distinct from new.status
     or old.priority is distinct from new.priority
     or old.intervention_mode is distinct from new.intervention_mode
     or old.return_to_service_validated is distinct from new.return_to_service_validated then
    insert into public.audit_logs(actor_id, action, entity_table, entity_id, old_values, new_values)
    values (auth.uid(), 'breakdown_updated', 'breakdowns', new.id::text,
      jsonb_build_object('status', old.status, 'priority', old.priority,
        'intervention_mode', old.intervention_mode,
        'return_to_service_validated', old.return_to_service_validated),
      jsonb_build_object('status', new.status, 'priority', new.priority,
        'intervention_mode', new.intervention_mode,
        'return_to_service_validated', new.return_to_service_validated));
  end if;
  return new;
end;
$$;

drop trigger if exists breakdown_status_audit on public.breakdowns;
create trigger breakdown_status_audit
after insert or update on public.breakdowns
for each row execute function public.log_breakdown_status_change();

commit;
