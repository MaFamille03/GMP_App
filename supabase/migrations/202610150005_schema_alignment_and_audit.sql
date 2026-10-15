-- GMP — Étape 2 : alignement du schéma métier et sécurisation de la traçabilité.
-- À appliquer après les migrations existantes, sur une base de test en premier.
-- Cette migration n'insère aucun équipement fictif et ne remplace pas les données existantes.

begin;

-- La complexité est indépendante de l'état opérationnel et de l'état de maintenance.
do $$ begin
  create type public.equipment_complexity as enum ('simple', 'complex');
exception when duplicate_object then null; end $$;

alter table public.equipment
  add column if not exists complexity public.equipment_complexity,
  add column if not exists photo_caption text,
  add column if not exists inventory_verified_at timestamptz,
  add column if not exists inventory_verified_by uuid references public.profiles(id) on delete set null;

comment on column public.equipment.complexity is
  'Classement technique individuel : simple ou complexe. NULL signifie que le technicien doit encore le qualifier.';
comment on column public.equipment.operational_status is
  'État opérationnel courant. Il est distinct de la complexité et du statut de maintenance.';
comment on column public.equipment.data_verification is
  'Indique si les informations de la fiche ont été physiquement confirmées.';

create index if not exists equipment_complexity_idx
  on public.equipment(complexity);

create index if not exists breakdowns_open_equipment_idx
  on public.breakdowns(equipment_id, reported_at desc)
  where status not in ('closed', 'not_repairable');

-- Un dossier de panne actif place l'équipement hors service.
-- La remise en service ne peut être enregistrée que si le technicien l'a explicitement validée.
create or replace function public.sync_equipment_status_from_breakdown()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_equipment_id uuid;
  has_other_active_breakdown boolean;
begin
  target_equipment_id := coalesce(new.equipment_id, old.equipment_id);

  if tg_op = 'UPDATE' and old.equipment_id is distinct from new.equipment_id then
    -- L'équipement précédemment associé reste hors service tant qu'une autre panne active existe.
    if exists (
      select 1 from public.breakdowns b
      where b.equipment_id = old.equipment_id
        and b.id <> new.id
        and b.status not in ('closed', 'not_repairable')
    ) then
      update public.equipment
      set operational_status = 'out_of_service'
      where id = old.equipment_id;
    end if;
  end if;

  if tg_op = 'DELETE' then
    if exists (
      select 1 from public.breakdowns b
      where b.equipment_id = old.equipment_id
        and b.id <> old.id
        and b.status not in ('closed', 'not_repairable')
    ) then
      update public.equipment
      set operational_status = 'out_of_service'
      where id = old.equipment_id;
    end if;
    return old;
  end if;

  -- Tout dossier non clôturé/non classé irréparable maintient l'appareil hors service,
  -- y compris un dossier « résolu » dont la remise en service n'a pas été validée.
  if new.status not in ('closed', 'not_repairable')
     and not (new.status = 'resolved' and new.return_to_service_validated) then
    update public.equipment
    set operational_status = 'out_of_service'
    where id = new.equipment_id;

    update public.breakdowns
    set equipment_taken_out_of_service = true
    where id = new.id and equipment_taken_out_of_service = false;

    return new;
  end if;

  -- Un dossier clôturé n'autorise le retour en service que si la validation explicite existe.
  if new.return_to_service_validated
     and new.status in ('resolved', 'closed') then
    select exists (
      select 1
      from public.breakdowns b
      where b.equipment_id = new.equipment_id
        and b.id <> new.id
        and (
          b.status not in ('closed', 'not_repairable')
          or (b.status = 'resolved' and not b.return_to_service_validated)
        )
    ) into has_other_active_breakdown;

    if not has_other_active_breakdown then
      update public.equipment
      set operational_status = 'functional'
      where id = new.equipment_id
        and operational_status <> 'retired';

      update public.breakdowns
      set equipment_restored_at = coalesce(equipment_restored_at, now()),
          equipment_restored_by = coalesce(equipment_restored_by, new.return_to_service_validated_by)
      where id = new.id
        and equipment_restored_at is null;
    else
      update public.equipment
      set operational_status = 'out_of_service'
      where id = new.equipment_id;
    end if;
  else
    update public.equipment
    set operational_status = 'out_of_service'
    where id = new.equipment_id;
  end if;

  return new;
end;
$$;

drop trigger if exists breakdown_sync_equipment_status on public.breakdowns;
create trigger breakdown_sync_equipment_status
after insert or update or delete on public.breakdowns
for each row execute function public.sync_equipment_status_from_breakdown();

-- Une validation de remise en service doit identifier le validateur et la date.
create or replace function public.enforce_return_to_service_validation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.return_to_service_validated and (
    new.return_to_service_validated_by is null
    or new.return_to_service_validated_at is null
  ) then
    raise exception 'La validation de remise en service doit enregistrer le validateur et la date.';
  end if;

  if new.status = 'closed' and new.return_to_service_validated = false
     and new.status is distinct from old.status then
    raise exception 'Une panne ne peut être clôturée sans validation explicite de remise en service. Pour un équipement irréparable, utiliser le statut not_repairable.';
  end if;

  return new;
end;
$$;

drop trigger if exists breakdown_require_return_validation on public.breakdowns;
create trigger breakdown_require_return_validation
before insert or update on public.breakdowns
for each row execute function public.enforce_return_to_service_validation();

-- Journalisation des changements importants sur les objets métier.
-- Le contenu est limité aux champs de la ligne concernée ; aucune donnée patient n'est prévue dans ce modèle.
create or replace function public.audit_business_row_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  before_row jsonb;
  after_row jsonb;
  row_id text;
  event_name text;
begin
  if tg_op = 'INSERT' then
    before_row := null;
    after_row := to_jsonb(new);
    row_id := coalesce(after_row ->> 'id', after_row ->> 'equipment_id', after_row ->> 'work_order_number');
    event_name := 'created';
  elsif tg_op = 'UPDATE' then
    before_row := to_jsonb(old);
    after_row := to_jsonb(new);
    row_id := coalesce(after_row ->> 'id', after_row ->> 'equipment_id', after_row ->> 'work_order_number');
    event_name := 'updated';
    if before_row = after_row then
      return new;
    end if;
  else
    before_row := to_jsonb(old);
    after_row := null;
    row_id := coalesce(before_row ->> 'id', before_row ->> 'equipment_id', before_row ->> 'work_order_number');
    event_name := 'deleted';
  end if;

  insert into public.audit_logs(actor_id, action, entity_table, entity_id, old_values, new_values)
  values (
    auth.uid(),
    tg_table_name || '_' || event_name,
    tg_table_name,
    row_id,
    before_row,
    after_row
  );

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'equipment', 'equipment_files', 'equipment_movements',
    'maintenance_plans', 'work_orders', 'interventions',
    'services', 'locations', 'equipment_categories', 'vendors'
  ]
  loop
    execute format('drop trigger if exists audit_business_row on public.%I', t);
    execute format(
      'create trigger audit_business_row after insert or update or delete on public.%I for each row execute function public.audit_business_row_change()',
      t
    );
  end loop;
end $$;

-- Vues de synthèse pour les tableaux de bord. SECURITY INVOKER fait respecter les politiques RLS
-- de l'utilisateur connecté ; ces vues ne contournent pas les permissions des tables.
create or replace view public.dashboard_summary
with (security_invoker = true)
as
select
  (select count(*) from public.equipment e where e.operational_status <> 'retired') as equipment_total,
  (select count(*) from public.equipment e where e.operational_status = 'functional') as equipment_functional,
  (select count(*) from public.equipment e where e.operational_status in ('broken', 'under_maintenance', 'out_of_service', 'functional_restricted')) as equipment_unavailable_or_restricted,
  (select count(*) from public.breakdowns b where b.status not in ('closed', 'not_repairable')) as breakdowns_open,
  (select count(*) from public.breakdowns b where b.status not in ('closed', 'not_repairable') and b.priority in ('critical', 'high')) as breakdowns_priority,
  (select count(*) from public.work_orders w where w.status not in ('completed', 'cancelled') and w.next_due_date < current_date) as maintenance_overdue,
  (select count(*) from public.work_orders w where w.status not in ('completed', 'cancelled') and w.next_due_date between current_date and current_date + 30) as maintenance_due_30_days,
  (select coalesce(sum(w.actual_cost), 0) from public.work_orders w where w.status = 'completed') as recorded_completed_work_cost;

comment on view public.dashboard_summary is
  'Indicateurs agrégés du parc GMP. Les montants reflètent uniquement les coûts saisis dans les ordres de travail.';

create or replace view public.equipment_maintenance_overview
with (security_invoker = true)
as
select
  e.id as equipment_id,
  e.internal_code,
  e.designation,
  e.service_id,
  e.operational_status,
  e.complexity,
  e.last_maintenance_at,
  e.next_maintenance_at,
  case
    when e.operational_status = 'retired' then 'retired'
    when e.next_maintenance_at is null then 'not_scheduled'
    when e.next_maintenance_at < current_date then 'overdue'
    when e.next_maintenance_at <= current_date + 30 then 'due_soon'
    else 'up_to_date'
  end as maintenance_attention
from public.equipment e;

comment on view public.equipment_maintenance_overview is
  'Vue de suivi de l’état opérationnel et de l’attention maintenance, calculée à partir des dates enregistrées sur chaque équipement.';

-- Les observateurs restent en lecture seule via les politiques RLS existantes.
-- La fonction de gestion métier doit rester réservée au rôle admin (migration 202610150001).
revoke all on public.dashboard_summary from anon;
revoke all on public.equipment_maintenance_overview from anon;
grant select on public.dashboard_summary to authenticated;
grant select on public.equipment_maintenance_overview to authenticated;

commit;
