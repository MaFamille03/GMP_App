-- GMP — Étape 6 : stock des pièces détachées et traçabilité des mouvements.
begin;

create table if not exists public.spare_parts (
  id uuid primary key default gen_random_uuid(),
  part_code text not null unique,
  name text not null,
  description text,
  category text,
  unit text not null default 'unité',
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  minimum_stock integer not null default 0 check (minimum_stock >= 0),
  unit_cost numeric(14,2) check (unit_cost is null or unit_cost >= 0),
  supplier_id uuid references public.vendors(id) on delete set null,
  storage_location text,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  spare_part_id uuid not null references public.spare_parts(id) on delete restrict,
  movement_type text not null check (movement_type in ('entry','consumption','adjustment_in','adjustment_out')),
  quantity integer not null check (quantity > 0),
  unit_cost numeric(14,2) check (unit_cost is null or unit_cost >= 0),
  supplier_id uuid references public.vendors(id) on delete set null,
  work_order_id uuid references public.work_orders(id) on delete set null,
  intervention_id uuid references public.interventions(id) on delete set null,
  reference_number text,
  notes text,
  performed_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create index if not exists spare_parts_low_stock_idx on public.spare_parts(stock_quantity, minimum_stock) where is_active = true;
create index if not exists spare_parts_supplier_idx on public.spare_parts(supplier_id);
create index if not exists stock_movements_part_date_idx on public.stock_movements(spare_part_id, created_at desc);
create index if not exists stock_movements_work_order_idx on public.stock_movements(work_order_id) where work_order_id is not null;

alter table public.spare_parts enable row level security;
alter table public.stock_movements enable row level security;

drop policy if exists spare_parts_read_active_users on public.spare_parts;
create policy spare_parts_read_active_users on public.spare_parts for select to authenticated using (public.is_active_user());
drop policy if exists spare_parts_manage_biomedical on public.spare_parts;
create policy spare_parts_manage_biomedical on public.spare_parts for all to authenticated using (public.can_manage_biomedical()) with check (public.can_manage_biomedical());
drop policy if exists stock_movements_read_active_users on public.stock_movements;
create policy stock_movements_read_active_users on public.stock_movements for select to authenticated using (public.is_active_user());
drop policy if exists stock_movements_insert_biomedical on public.stock_movements;
create policy stock_movements_insert_biomedical on public.stock_movements for insert to authenticated with check (public.can_manage_biomedical() and (performed_by is null or performed_by = auth.uid()));
drop policy if exists stock_movements_update_biomedical on public.stock_movements;
create policy stock_movements_update_biomedical on public.stock_movements for update to authenticated using (public.can_manage_biomedical()) with check (public.can_manage_biomedical());
drop policy if exists stock_movements_delete_biomedical on public.stock_movements;
create policy stock_movements_delete_biomedical on public.stock_movements for delete to authenticated using (public.can_manage_biomedical());

create or replace function public.apply_stock_movement()
returns trigger language plpgsql security definer set search_path = public as $$
declare delta integer;
begin
  if new.movement_type in ('entry','adjustment_in') then delta := new.quantity;
  else delta := -new.quantity;
  end if;

  update public.spare_parts
    set stock_quantity = stock_quantity + delta,
        updated_at = now()
    where id = new.spare_part_id
      and stock_quantity + delta >= 0;

  if not found then
    if not exists (select 1 from public.spare_parts where id = new.spare_part_id) then
      raise exception 'Pièce détachée introuvable.';
    end if;
    raise exception 'Stock insuffisant : cette sortie dépasserait le stock disponible.';
  end if;

  return new;
end;
$$;

drop trigger if exists stock_movement_apply_quantity on public.stock_movements;
create trigger stock_movement_apply_quantity before insert on public.stock_movements
for each row execute function public.apply_stock_movement();

-- Les mouvements sont un journal : une correction se fait par un mouvement inverse,
-- pas par modification ou suppression d'un mouvement déjà enregistré.
revoke update, delete on public.stock_movements from authenticated;

commit;
