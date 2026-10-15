-- GMP — Étape 7 : paramètres généraux et données de référence.
-- À appliquer après les migrations des étapes précédentes, d'abord sur une base de test.

begin;

create table if not exists public.site_settings (
  id integer primary key default 1 check (id = 1),
  clinic_name text not null default 'Polyclinique Groupe Médical du Plateau',
  short_name text not null default 'GMP',
  address text,
  phone text,
  email text,
  website text,
  report_footer text,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.site_settings (id, clinic_name, short_name)
values (1, 'Polyclinique Groupe Médical du Plateau', 'GMP')
on conflict (id) do nothing;

alter table public.site_settings enable row level security;
drop policy if exists site_settings_read_active_users on public.site_settings;
create policy site_settings_read_active_users on public.site_settings
for select to authenticated using (public.is_active_user());
drop policy if exists site_settings_manage_admin on public.site_settings;
create policy site_settings_manage_admin on public.site_settings
for all to authenticated using (public.can_manage_biomedical()) with check (public.can_manage_biomedical());

drop trigger if exists set_updated_at on public.site_settings;
create trigger set_updated_at before update on public.site_settings
for each row execute function public.set_updated_at();

commit;
