-- GMP — Promotion contrôlée du compte administrateur principal.
-- À exécuter manuellement dans Supabase > SQL Editor du projet GMP de production.
-- Ne jamais exécuter ce script dans un projet Supabase différent.
-- Cette opération n'expose aucune clé service_role au navigateur.

begin;

do $$
declare
  target_user_id uuid;
begin
  select u.id
    into target_user_id
  from auth.users u
  where lower(u.email) = lower('minnhindje@gmail.com')
  limit 1;

  if target_user_id is null then
    raise exception 'Aucun compte Supabase Auth trouvé pour minnhindje@gmail.com. Crée/active d’abord ce compte puis relance le script.';
  end if;

  insert into public.profiles (id, display_name, role, is_active, updated_at)
  select
    u.id,
    coalesce(nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''), 'Administrateur GMP'),
    'admin'::public.app_role,
    true,
    now()
  from auth.users u
  where u.id = target_user_id
  on conflict (id) do update
    set role = 'admin'::public.app_role,
        is_active = true,
        updated_at = now();
end $$;

select u.email, p.display_name, p.role, p.is_active
from auth.users u
join public.profiles p on p.id = u.id
where lower(u.email) = lower('minnhindje@gmail.com');

commit;
