# GMP — Étape 2 : authentification et contrôle des accès

## 1. Appliquer les migrations

Dans Supabase > SQL Editor, appliquer dans l'ordre :
1. `migrations/202610140001_initial_schema.sql`
2. `migrations/202610140002_auth_profiles.sql`
3. `migrations/202610140009_equipment_movements_rpc.sql`
4. `migrations/202610150001_two_level_access.sql`

Ne pas relancer une migration de création initiale sans vérifier son impact sur une base déjà utilisée.

## 2. Deux niveaux d'accès

- **Administrateur-technicien (`role = admin`)** : seul rôle pouvant modifier les données biomédicales et gérer les accès.
- **Observateur** : tout compte actif dont le rôle n'est pas `admin`, quelle que soit sa fonction déclarée. Il peut consulter les données et les documents autorisés, mais ne peut pas créer, modifier ou supprimer les données métier.

Les anciens rôles enum (`service_manager`, `management`, etc.) sont conservés pour compatibilité du schéma, mais ils sont tous traités comme observateurs. La fonction professionnelle (`job_title`) ne confère aucun droit.

## 3. Configurer Supabase Auth

Dans Supabase > Authentication > URL Configuration :
- Site URL : URL de production de l'application.
- Redirect URL : ajouter `http://localhost:3000/auth/callback` en développement et `https://VOTRE-DOMAINE/auth/callback` en production.
- Vérifier le fournisseur e-mail et la configuration d'envoi d'invitations.

L’inscription publique est désactivée dans l’interface. Désactiver également « Allow new users to sign up » dans Supabase Authentication > Settings, sinon un utilisateur pourrait tenter de s’inscrire directement via l’API Supabase. Les nouveaux comptes sont invités depuis `/users` par l’administrateur.

## 4. Variables d'environnement

Dans `.env.local` et dans Vercel > Settings > Environment Variables :
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (ou clé publishable)
- `SUPABASE_SERVICE_ROLE_KEY` — **serveur uniquement**, nécessaire à l'envoi d'invitations depuis `/users`.

La clé service role ne doit jamais être utilisée dans un composant client, une variable `NEXT_PUBLIC_*`, un dépôt Git ou un document partagé. Si elle a déjà été exposée, la révoquer et en générer une nouvelle.

## 5. Premier administrateur

1. Créer le compte de l'administrateur depuis Supabase Authentication (ou via une procédure d'invitation approuvée).
2. Confirmer le compte si la confirmation est activée.
3. Dans `first_admin_setup.sql`, remplacer `REMPLACER_PAR_EMAIL_ADMIN` par l'adresse exacte puis exécuter le script dans le projet GMP.
4. Vérifier que `profiles.role = 'admin'` pour ce compte.

Ne jamais donner le rôle admin en se basant uniquement sur la fonction professionnelle saisie dans un formulaire.

## 6. Vérifications obligatoires

Tester avec deux comptes distincts :
- Administrateur : peut inviter un utilisateur, activer/désactiver un compte et modifier les données métier.
- Observateur : peut consulter les données mais les écritures directes doivent être rejetées par RLS ; `/equipment/new`, `/breakdowns/new` et `/users` ne doivent pas être accessibles comme pages de modification.
- Compte désactivé : doit être redirigé vers `/access-disabled`.

La sécurité ne doit pas reposer uniquement sur le masquage des boutons : les politiques RLS et le contrôle serveur doivent rester actifs.
