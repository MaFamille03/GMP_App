-- GMP — Attribution contrôlée du premier administrateur.
-- 1. Inscrire d'abord le compte via /register.
-- 2. Confirmer l'adresse e-mail si la confirmation est activée.
-- 3. Remplacer l'adresse ci-dessous par l'adresse exacte du compte à promouvoir.
-- 4. Exécuter ce script uniquement dans le projet Supabase GMP voulu.
-- Ne jamais exposer la clé service_role au navigateur.

update public.profiles p
set role = 'admin',
    updated_at = now()
from auth.users u
where p.id = u.id
  and lower(u.email) = lower('REMPLACER_PAR_EMAIL_ADMIN')
returning p.id, p.display_name, p.job_title, p.role, p.is_active;
