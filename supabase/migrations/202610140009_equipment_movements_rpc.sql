-- GMP — Étape 9 : enregistrement sécurisé et cohérent des transferts d'équipements.
-- Exécuter après les migrations précédentes dans le projet Supabase GMP.
begin;

create or replace function public.record_equipment_movement(
  p_equipment_id uuid,
  p_to_service_id uuid,
  p_to_location_id uuid,
  p_reason text,
  p_notes text default null
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_movement_id uuid;
  v_from_service_id uuid;
  v_from_location_id uuid;
begin
  if auth.uid() is null or not public.is_active_user() then
    raise exception 'Accès réservé aux utilisateurs actifs.' using errcode = '42501';
  end if;
  if not public.can_manage_biomedical() then
    raise exception 'Seul un administrateur habilité peut enregistrer un transfert.' using errcode = '42501';
  end if;
  if nullif(trim(p_reason), '') is null then
    raise exception 'Le motif du transfert est obligatoire.' using errcode = '22023';
  end if;

  select service_id, location_id
    into v_from_service_id, v_from_location_id
    from public.equipment
   where id = p_equipment_id
   for update;

  if not found then
    raise exception 'Équipement introuvable.' using errcode = 'P0002';
  end if;

  update public.equipment
     set service_id = p_to_service_id,
         location_id = p_to_location_id,
         updated_by = auth.uid(),
         updated_at = now()
   where id = p_equipment_id;

  insert into public.equipment_movements (
    equipment_id, from_service_id, to_service_id,
    from_location_id, to_location_id, reason, notes, recorded_by
  ) values (
    p_equipment_id, v_from_service_id, p_to_service_id,
    v_from_location_id, p_to_location_id, trim(p_reason), nullif(trim(coalesce(p_notes, '')), ''), auth.uid()
  ) returning id into v_movement_id;

  return v_movement_id;
end;
$$;

revoke all on function public.record_equipment_movement(uuid, uuid, uuid, text, text) from public;
grant execute on function public.record_equipment_movement(uuid, uuid, uuid, text, text) to authenticated;

commit;
