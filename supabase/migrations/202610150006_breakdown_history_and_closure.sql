-- GMP — Étape 4 : journal des pannes et garde-fous du cycle d'intervention.
-- À appliquer sur une base de développement après validation de l'historique des migrations.

begin;

create table if not exists public.breakdown_events (
  id uuid primary key default gen_random_uuid(),
  breakdown_id uuid not null references public.breakdowns(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  event_type text not null check (event_type in (
    'reported', 'status_changed', 'priority_changed', 'assignment_changed',
    'intervention_mode_changed', 'provider_changed', 'diagnosis_updated',
    'resolution_updated', 'return_validated', 'cost_updated', 'details_updated'
  )),
  from_status public.breakdown_status,
  to_status public.breakdown_status,
  summary text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists breakdown_events_breakdown_idx
  on public.breakdown_events(breakdown_id, created_at desc);

alter table public.breakdown_events enable row level security;

drop policy if exists "breakdown_events_select_active" on public.breakdown_events;
create policy "breakdown_events_select_active"
on public.breakdown_events for select to authenticated
using (public.is_active_user());

-- L'application ne peut pas modifier l'historique directement. Seuls les triggers SECURITY DEFINER y écrivent.
drop policy if exists "breakdown_events_no_client_insert" on public.breakdown_events;
drop policy if exists "breakdown_events_no_client_update" on public.breakdown_events;
drop policy if exists "breakdown_events_no_client_delete" on public.breakdown_events;

revoke insert, update, delete on public.breakdown_events from anon, authenticated;
grant select on public.breakdown_events to authenticated;

create or replace function public.record_breakdown_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  kind text;
  summary_text text;
  event_details jsonb := '{}'::jsonb;
begin
  if tg_op = 'INSERT' then
    kind := 'reported';
    summary_text := 'Panne signalée';
    event_details := jsonb_build_object(
      'priority', new.priority,
      'equipment_id', new.equipment_id,
      'symptom_description', new.symptom_description
    );
    insert into public.breakdown_events(
      breakdown_id, actor_id, event_type, from_status, to_status, summary, details
    ) values (
      new.id, coalesce(actor, new.reported_by), kind, null, new.status, summary_text, event_details
    );
    return new;
  end if;

  if old.status is distinct from new.status then
    kind := case
      when new.status in ('resolved','closed') then 'resolution_updated'
      else 'status_changed'
    end;
    summary_text := 'Statut modifié : ' || old.status::text || ' → ' || new.status::text;
    insert into public.breakdown_events(
      breakdown_id, actor_id, event_type, from_status, to_status, summary, details
    ) values (new.id, actor, kind, old.status, new.status,
      summary_text, jsonb_build_object('priority', new.priority));
  end if;

  if old.priority is distinct from new.priority then
    insert into public.breakdown_events(breakdown_id, actor_id, event_type, from_status, to_status, summary, details)
    values (new.id, actor, 'priority_changed', old.status, new.status,
      'Priorité modifiée : ' || old.priority::text || ' → ' || new.priority::text,
      jsonb_build_object('from', old.priority, 'to', new.priority));
  end if;

  if old.intervention_mode is distinct from new.intervention_mode then
    insert into public.breakdown_events(breakdown_id, actor_id, event_type, from_status, to_status, summary, details)
    values (new.id, actor, 'intervention_mode_changed', old.status, new.status,
      'Mode de prise en charge modifié',
      jsonb_build_object('from', old.intervention_mode, 'to', new.intervention_mode));
  end if;

  if old.external_provider_name is distinct from new.external_provider_name
     or old.provider_reference is distinct from new.provider_reference then
    insert into public.breakdown_events(breakdown_id, actor_id, event_type, from_status, to_status, summary, details)
    values (new.id, actor, 'provider_changed', old.status, new.status,
      'Informations du prestataire mises à jour',
      jsonb_build_object('provider', new.external_provider_name, 'reference', new.provider_reference));
  end if;

  if old.root_cause is distinct from new.root_cause
     or old.diagnosis_details is distinct from new.diagnosis_details then
    insert into public.breakdown_events(breakdown_id, actor_id, event_type, from_status, to_status, summary, details)
    values (new.id, actor, 'diagnosis_updated', old.status, new.status,
      'Diagnostic technique mis à jour', jsonb_build_object('root_cause', new.root_cause));
  end if;

  if old.resolution_summary is distinct from new.resolution_summary
     or old.corrective_actions is distinct from new.corrective_actions
     or old.safety_test_notes is distinct from new.safety_test_notes then
    insert into public.breakdown_events(breakdown_id, actor_id, event_type, from_status, to_status, summary, details)
    values (new.id, actor, 'resolution_updated', old.status, new.status,
      'Compte rendu ou contrôles mis à jour',
      jsonb_build_object('has_resolution', new.resolution_summary is not null,
                         'has_corrective_actions', new.corrective_actions is not null,
                         'has_safety_tests', new.safety_test_notes is not null));
  end if;

  if old.return_to_service_validated is distinct from new.return_to_service_validated
     and new.return_to_service_validated then
    insert into public.breakdown_events(breakdown_id, actor_id, event_type, from_status, to_status, summary, details)
    values (new.id, coalesce(new.return_to_service_validated_by, actor), 'return_validated', old.status, new.status,
      'Remise en service validée par le technicien',
      jsonb_build_object('validated_at', new.return_to_service_validated_at,
                         'safety_tests', new.safety_test_notes));
  end if;

  if old.cost_amount is distinct from new.cost_amount then
    insert into public.breakdown_events(breakdown_id, actor_id, event_type, from_status, to_status, summary, details)
    values (new.id, actor, 'cost_updated', old.status, new.status,
      'Coût de l’intervention mis à jour',
      jsonb_build_object('from', old.cost_amount, 'to', new.cost_amount, 'currency', new.currency_code));
  end if;

  return new;
end;
$$;

drop trigger if exists breakdown_event_history on public.breakdowns;
create trigger breakdown_event_history
after insert or update on public.breakdowns
for each row execute function public.record_breakdown_event();

-- Contrôles côté base : pas de clôture sans validation nominative et essais documentés.
create or replace function public.enforce_breakdown_closure()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status = 'closed' then
    if not new.return_to_service_validated then
      raise exception 'Clôture refusée : la remise en service doit être explicitement validée.';
    end if;
    if new.return_to_service_validated_by is null or new.return_to_service_validated_at is null then
      raise exception 'Clôture refusée : le validateur et la date de validation sont obligatoires.';
    end if;
    if nullif(btrim(new.safety_test_notes), '') is null then
      raise exception 'Clôture refusée : documente les essais et contrôles avant la remise en service.';
    end if;
    if nullif(btrim(new.resolution_summary), '') is null then
      raise exception 'Clôture refusée : le compte rendu de résolution est obligatoire.';
    end if;
    if new.resolved_at is null then
      new.resolved_at := now();
    end if;
    if new.closed_at is null then
      new.closed_at := now();
    end if;
  end if;

  if new.status = 'not_repairable' then
    new.return_to_service_validated := false;
    new.return_to_service_validated_by := null;
    new.return_to_service_validated_at := null;
    new.equipment_restored_at := null;
    new.equipment_restored_by := null;
  end if;

  if new.cost_amount is not null and new.cost_amount < 0 then
    raise exception 'Le coût de l’intervention ne peut pas être négatif.';
  end if;

  return new;
end;
$$;

drop trigger if exists breakdown_closure_guard on public.breakdowns;
create trigger breakdown_closure_guard
before insert or update on public.breakdowns
for each row execute function public.enforce_breakdown_closure();

comment on table public.breakdown_events is
  'Historique chronologique des signalements, changements de statut, diagnostic, coûts et validation de remise en service. Les clients authentifiés ne peuvent pas écrire dans cette table.';

commit;
