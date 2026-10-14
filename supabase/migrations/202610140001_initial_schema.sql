-- GMP POLYCLINIQUE — Initialisation du schéma biomédical
-- À exécuter uniquement sur le projet Supabase GMP après vérification de l'environnement.
-- Les états d'équipements observés lors d'une visite doivent être confirmés physiquement.

begin;

create extension if not exists pgcrypto;

do $$ begin
  create type public.app_role as enum (
    'admin',
    'biomedical_manager',
    'biomedical_technician',
    'service_manager',
    'management',
    'external_provider'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.equipment_status as enum (
    'functional',
    'functional_restricted',
    'broken',
    'under_maintenance',
    'out_of_service',
    'retired'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.criticality_level as enum ('critical', 'high', 'normal', 'low');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.breakdown_status as enum (
    'new',
    'to_qualify',
    'assigned',
    'in_progress',
    'waiting_parts',
    'waiting_provider',
    'resolved',
    'closed',
    'not_repairable'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.breakdown_priority as enum ('critical', 'high', 'normal', 'low');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.work_order_type as enum ('preventive', 'corrective', 'inspection', 'installation', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.work_order_status as enum (
    'planned',
    'assigned',
    'in_progress',
    'waiting_parts',
    'waiting_provider',
    'awaiting_validation',
    'completed',
    'cancelled'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.data_verification_status as enum ('confirmed', 'to_verify', 'not_provided');
exception when duplicate_object then null; end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Profil applicatif. Les utilisateurs doivent d'abord exister dans auth.users.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role public.app_role not null default 'service_manager',
  service_id uuid,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  code text unique,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  drop constraint if exists profiles_service_id_fkey;
alter table public.profiles
  add constraint profiles_service_id_fkey
  foreign key (service_id) references public.services(id) on delete set null;

create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location_type text not null default 'room'
    check (location_type in ('building','floor','service','room','specific_location','storage','workshop')),
  parent_id uuid references public.locations(id) on delete set null,
  service_id uuid references public.services(id) on delete set null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (parent_id, name)
);

create table if not exists public.equipment_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  technical_fields jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vendors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  vendor_type text not null default 'supplier'
    check (vendor_type in ('supplier','maintenance_provider','manufacturer','other')),
  contact_name text,
  email text,
  phone text,
  address text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.equipment (
  id uuid primary key default gen_random_uuid(),
  internal_code text not null unique,
  designation text not null,
  category_id uuid references public.equipment_categories(id) on delete set null,
  brand text,
  model text,
  manufacturer text,
  serial_number text,
  technical_specs jsonb not null default '{}'::jsonb,
  service_id uuid references public.services(id) on delete set null,
  location_id uuid references public.locations(id) on delete set null,
  responsible_profile_id uuid references public.profiles(id) on delete set null,
  operational_status public.equipment_status not null default 'out_of_service',
  criticality public.criticality_level not null default 'normal',
  data_verification public.data_verification_status not null default 'to_verify',
  verification_notes text,
  acquisition_date date,
  reception_date date,
  commissioning_date date,
  acquisition_cost numeric(14,2) check (acquisition_cost is null or acquisition_cost >= 0),
  currency_code char(3) not null default 'XOF',
  supplier_id uuid references public.vendors(id) on delete set null,
  purchase_document_reference text,
  warranty_start date,
  warranty_end date,
  theoretical_lifetime_years numeric(5,2) check (theoretical_lifetime_years is null or theoretical_lifetime_years > 0),
  estimated_end_of_life date,
  last_maintenance_at date,
  next_maintenance_at date,
  retired_at timestamptz,
  retirement_reason text,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (warranty_end is null or warranty_start is null or warranty_end >= warranty_start)
);

create index if not exists equipment_service_idx on public.equipment(service_id);
create index if not exists equipment_location_idx on public.equipment(location_id);
create index if not exists equipment_status_idx on public.equipment(operational_status);
create index if not exists equipment_category_idx on public.equipment(category_id);
create index if not exists equipment_serial_idx on public.equipment(serial_number);
create index if not exists equipment_next_maintenance_idx on public.equipment(next_maintenance_at);

create table if not exists public.equipment_files (
  id uuid primary key default gen_random_uuid(),
  equipment_id uuid not null references public.equipment(id) on delete cascade,
  file_kind text not null default 'document'
    check (file_kind in ('main_photo','nameplate_photo','condition_photo','manual','certificate','invoice','warranty','maintenance_report','other')),
  storage_path text not null,
  original_filename text,
  content_type text,
  file_size_bytes bigint check (file_size_bytes is null or file_size_bytes >= 0),
  caption text,
  is_primary boolean not null default false,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists equipment_files_equipment_idx on public.equipment_files(equipment_id);

create table if not exists public.equipment_movements (
  id uuid primary key default gen_random_uuid(),
  equipment_id uuid not null references public.equipment(id) on delete cascade,
  from_service_id uuid references public.services(id) on delete set null,
  to_service_id uuid references public.services(id) on delete set null,
  from_location_id uuid references public.locations(id) on delete set null,
  to_location_id uuid references public.locations(id) on delete set null,
  moved_at timestamptz not null default now(),
  reason text not null,
  notes text,
  recorded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists equipment_movements_equipment_idx on public.equipment_movements(equipment_id, moved_at desc);

create table if not exists public.breakdowns (
  id uuid primary key default gen_random_uuid(),
  breakdown_number bigint generated always as identity unique,
  equipment_id uuid not null references public.equipment(id) on delete restrict,
  reported_by uuid references public.profiles(id) on delete set null,
  reporting_service_id uuid references public.services(id) on delete set null,
  reported_at timestamptz not null default now(),
  symptom_description text not null,
  circumstances text,
  priority public.breakdown_priority not null default 'normal',
  status public.breakdown_status not null default 'new',
  initial_risk text,
  equipment_taken_out_of_service boolean not null default false,
  assigned_to uuid references public.profiles(id) on delete set null,
  external_provider_id uuid references public.vendors(id) on delete set null,
  diagnosed_at timestamptz,
  resolved_at timestamptz,
  closed_at timestamptz,
  root_cause text,
  resolution_summary text,
  return_to_service_recommended boolean,
  return_to_service_validated boolean not null default false,
  return_to_service_validated_by uuid references public.profiles(id) on delete set null,
  return_to_service_validated_at timestamptz,
  cost_amount numeric(14,2) check (cost_amount is null or cost_amount >= 0),
  currency_code char(3) not null default 'XOF',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (closed_at is null or resolved_at is not null or status in ('closed','not_repairable'))
);

create index if not exists breakdowns_equipment_idx on public.breakdowns(equipment_id, reported_at desc);
create index if not exists breakdowns_status_priority_idx on public.breakdowns(status, priority);
create index if not exists breakdowns_reported_at_idx on public.breakdowns(reported_at desc);

create table if not exists public.maintenance_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  equipment_id uuid references public.equipment(id) on delete cascade,
  category_id uuid references public.equipment_categories(id) on delete cascade,
  description text,
  interval_months integer check (interval_months is null or interval_months > 0),
  interval_days integer check (interval_days is null or interval_days > 0),
  checklist jsonb not null default '[]'::jsonb,
  estimated_duration_minutes integer check (estimated_duration_minutes is null or estimated_duration_minutes >= 0),
  provider_id uuid references public.vendors(id) on delete set null,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (equipment_id is not null or category_id is not null)
);

create index if not exists maintenance_plans_equipment_idx on public.maintenance_plans(equipment_id);
create index if not exists maintenance_plans_category_idx on public.maintenance_plans(category_id);

create table if not exists public.work_orders (
  id uuid primary key default gen_random_uuid(),
  work_order_number bigint generated always as identity unique,
  equipment_id uuid not null references public.equipment(id) on delete restrict,
  breakdown_id uuid references public.breakdowns(id) on delete set null,
  maintenance_plan_id uuid references public.maintenance_plans(id) on delete set null,
  order_type public.work_order_type not null,
  status public.work_order_status not null default 'planned',
  title text not null,
  description text,
  assigned_to uuid references public.profiles(id) on delete set null,
  provider_id uuid references public.vendors(id) on delete set null,
  planned_start_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  validated_at timestamptz,
  validated_by uuid references public.profiles(id) on delete set null,
  validation_notes text,
  estimated_cost numeric(14,2) check (estimated_cost is null or estimated_cost >= 0),
  actual_cost numeric(14,2) check (actual_cost is null or actual_cost >= 0),
  currency_code char(3) not null default 'XOF',
  next_due_date date,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists work_orders_equipment_idx on public.work_orders(equipment_id, created_at desc);
create index if not exists work_orders_status_idx on public.work_orders(status, planned_start_at);
create index if not exists work_orders_breakdown_idx on public.work_orders(breakdown_id);

create table if not exists public.interventions (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references public.work_orders(id) on delete cascade,
  performed_at timestamptz not null default now(),
  performed_by uuid references public.profiles(id) on delete set null,
  intervention_kind text not null default 'internal'
    check (intervention_kind in ('internal','external')),
  diagnosis text,
  actions_taken text,
  parts_replaced jsonb not null default '[]'::jsonb,
  tests_and_results text,
  safety_checks text,
  time_spent_minutes integer check (time_spent_minutes is null or time_spent_minutes >= 0),
  labor_cost numeric(14,2) check (labor_cost is null or labor_cost >= 0),
  external_cost numeric(14,2) check (external_cost is null or external_cost >= 0),
  outcome text,
  report_storage_path text,
  requires_return_to_service_validation boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists interventions_work_order_idx on public.interventions(work_order_id, performed_at desc);

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_table text not null,
  entity_id text,
  old_values jsonb,
  new_values jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_entity_idx on public.audit_logs(entity_table, entity_id, created_at desc);
create index if not exists audit_logs_actor_idx on public.audit_logs(actor_id, created_at desc);

-- Updated-at triggers.
do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles','services','locations','equipment_categories','vendors','equipment',
    'breakdowns','maintenance_plans','work_orders'
  ]
  loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- Helper functions use SECURITY DEFINER to avoid RLS recursion on profiles.
create or replace function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select p.role from public.profiles p
  where p.id = (select auth.uid()) and p.is_active = true
  limit 1;
$$;

create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.is_active = true
  );
$$;

create or replace function public.can_manage_biomedical()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_app_role() in ('admin','biomedical_manager'), false);
$$;

revoke all on function public.current_app_role() from public;
revoke all on function public.is_active_user() from public;
revoke all on function public.can_manage_biomedical() from public;
grant execute on function public.current_app_role() to authenticated;
grant execute on function public.is_active_user() to authenticated;
grant execute on function public.can_manage_biomedical() to authenticated;

-- Enable RLS for all application tables.
alter table public.profiles enable row level security;
alter table public.services enable row level security;
alter table public.locations enable row level security;
alter table public.equipment_categories enable row level security;
alter table public.vendors enable row level security;
alter table public.equipment enable row level security;
alter table public.equipment_files enable row level security;
alter table public.equipment_movements enable row level security;
alter table public.breakdowns enable row level security;
alter table public.maintenance_plans enable row level security;
alter table public.work_orders enable row level security;
alter table public.interventions enable row level security;
alter table public.audit_logs enable row level security;

-- Profiles: users see their own profile; admins manage all profiles.
drop policy if exists "profiles_select_self_or_admin" on public.profiles;
create policy "profiles_select_self_or_admin" on public.profiles
for select to authenticated
using (id = (select auth.uid()) or public.current_app_role() = 'admin');

drop policy if exists "profiles_update_self_or_admin" on public.profiles;
drop policy if exists "profiles_update_admin_only" on public.profiles;
-- Un utilisateur ne peut pas modifier lui-même son rôle ni son statut actif.
create policy "profiles_update_admin_only" on public.profiles
for update to authenticated
using (public.current_app_role() = 'admin')
with check (public.current_app_role() = 'admin');

-- Reference tables: active users can read; only admin/biomedical manager can write.
do $$
declare t text;
begin
  foreach t in array array['services','locations','equipment_categories','vendors']
  loop
    execute format('drop policy if exists %I on public.%I', t || '_read_active_users', t);
    execute format('create policy %I on public.%I for select to authenticated using (public.is_active_user())', t || '_read_active_users', t);
    execute format('drop policy if exists %I on public.%I', t || '_manage_biomedical', t);
    execute format('create policy %I on public.%I for all to authenticated using (public.can_manage_biomedical()) with check (public.can_manage_biomedical())', t || '_manage_biomedical', t);
  end loop;
end $$;

-- Equipment: active users may read. Only biomedical managers/admins may modify in this first foundation.
drop policy if exists "equipment_read_active_users" on public.equipment;
create policy "equipment_read_active_users" on public.equipment
for select to authenticated using (public.is_active_user());

drop policy if exists "equipment_manage_biomedical" on public.equipment;
create policy "equipment_manage_biomedical" on public.equipment
for all to authenticated
using (public.can_manage_biomedical())
with check (public.can_manage_biomedical());

-- Attachments: only active users can read; biomedical managers/admins upload/manage in initial policy.
drop policy if exists "equipment_files_read_active_users" on public.equipment_files;
create policy "equipment_files_read_active_users" on public.equipment_files
for select to authenticated using (public.is_active_user());

drop policy if exists "equipment_files_manage_biomedical" on public.equipment_files;
create policy "equipment_files_manage_biomedical" on public.equipment_files
for all to authenticated
using (public.can_manage_biomedical())
with check (public.can_manage_biomedical());

-- Movements: active users read, biomedical managers/admins write.
drop policy if exists "equipment_movements_read_active_users" on public.equipment_movements;
create policy "equipment_movements_read_active_users" on public.equipment_movements
for select to authenticated using (public.is_active_user());

drop policy if exists "equipment_movements_manage_biomedical" on public.equipment_movements;
create policy "equipment_movements_manage_biomedical" on public.equipment_movements
for all to authenticated
using (public.can_manage_biomedical())
with check (public.can_manage_biomedical());

-- Breakdowns: all active users can read; active users may report a breakdown for themselves;
-- only biomedical managers/admins can manage workflow at this initial stage.
drop policy if exists "breakdowns_read_active_users" on public.breakdowns;
create policy "breakdowns_read_active_users" on public.breakdowns
for select to authenticated using (public.is_active_user());

drop policy if exists "breakdowns_insert_reporter" on public.breakdowns;
create policy "breakdowns_insert_reporter" on public.breakdowns
for insert to authenticated
with check (
  public.is_active_user()
  and (reported_by is null or reported_by = (select auth.uid()))
);

drop policy if exists "breakdowns_manage_biomedical" on public.breakdowns;
create policy "breakdowns_manage_biomedical" on public.breakdowns
for update to authenticated
using (public.can_manage_biomedical())
with check (public.can_manage_biomedical());

-- Maintenance plans, work orders and interventions: active users read, biomedical managers/admins write.
do $$
declare t text;
begin
  foreach t in array array['maintenance_plans','work_orders','interventions']
  loop
    execute format('drop policy if exists %I on public.%I', t || '_read_active_users', t);
    execute format('create policy %I on public.%I for select to authenticated using (public.is_active_user())', t || '_read_active_users', t);
    execute format('drop policy if exists %I on public.%I', t || '_manage_biomedical', t);
    execute format('create policy %I on public.%I for all to authenticated using (public.can_manage_biomedical()) with check (public.can_manage_biomedical())', t || '_manage_biomedical', t);
  end loop;
end $$;

-- Audit: read only for admin/biomedical manager; no direct client insert/update/delete.
drop policy if exists "audit_logs_read_managers" on public.audit_logs;
create policy "audit_logs_read_managers" on public.audit_logs
for select to authenticated using (public.can_manage_biomedical());

-- Private storage bucket for photos, manuals, certificates and reports.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'gmp-equipment-files',
  'gmp-equipment-files',
  false,
  15728640,
  array['image/jpeg','image/png','image/webp','application/pdf']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "gmp_files_read_authenticated" on storage.objects;
create policy "gmp_files_read_authenticated" on storage.objects
for select to authenticated
using (bucket_id = 'gmp-equipment-files' and public.is_active_user());

drop policy if exists "gmp_files_insert_biomedical" on storage.objects;
create policy "gmp_files_insert_biomedical" on storage.objects
for insert to authenticated
with check (bucket_id = 'gmp-equipment-files' and public.can_manage_biomedical());

drop policy if exists "gmp_files_update_biomedical" on storage.objects;
create policy "gmp_files_update_biomedical" on storage.objects
for update to authenticated
using (bucket_id = 'gmp-equipment-files' and public.can_manage_biomedical())
with check (bucket_id = 'gmp-equipment-files' and public.can_manage_biomedical());

drop policy if exists "gmp_files_delete_biomedical" on storage.objects;
create policy "gmp_files_delete_biomedical" on storage.objects
for delete to authenticated
using (bucket_id = 'gmp-equipment-files' and public.can_manage_biomedical());

commit;
