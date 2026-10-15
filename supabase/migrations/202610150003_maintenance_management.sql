-- GMP — Étape 5 : suivi opérationnel des maintenances.
-- Les colonnes de prestataire, coûts et validation existent dans le schéma initial;
-- cette migration ajoute les index utiles au suivi des échéances et des prestataires.
begin;

create index if not exists maintenance_plans_provider_active_idx
  on public.maintenance_plans(provider_id, is_active);

create index if not exists work_orders_provider_status_idx
  on public.work_orders(provider_id, status);

create index if not exists work_orders_next_due_idx
  on public.work_orders(next_due_date)
  where next_due_date is not null and status not in ('completed', 'cancelled');

create index if not exists work_orders_validation_idx
  on public.work_orders(validated_at)
  where status = 'awaiting_validation';

commit;
