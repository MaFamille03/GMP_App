# GMP — Étape 2 : configuration Auth

## Migration

Dans Supabase > SQL Editor, exécuter `migrations/202610140002_auth_profiles.sql` après la migration initiale de l'étape 1.

Cette migration :
- ajoute `job_title` au profil ;
- crée automatiquement une fiche profil à l'inscription ;
- préserve la fonction déclarée séparément du rôle système ;
- réserve les permissions de gestion à `role = admin` ;
- ne crée et ne promeut aucun administrateur automatiquement.

## Authentification Supabase

Dans Supabase > Authentication > URL Configuration :
- Site URL en local : `http://localhost:3000`
- Redirect URL en local : `http://localhost:3000/auth/callback`
- Ajouter aussi l'URL de production Vercel et son callback `/auth/callback`.

Dans Authentication > Sign In / Providers, activer Email si c'est le fournisseur retenu par le GMP. Choisir explicitement si la confirmation d'adresse e-mail est obligatoire.

## Variables locales

Créer `.env.local` à partir de `.env.example` et remplir :
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (ou la clé publishable du projet)

Ne jamais mettre une clé `service_role` dans une variable `NEXT_PUBLIC_*`, dans GitHub ou dans le navigateur.

## Premier administrateur

1. Inscrire la personne qui doit administrer l'application via `/register`.
2. Confirmer son e-mail si nécessaire.
3. Ouvrir `first_admin_setup.sql`, remplacer `REMPLACER_PAR_EMAIL_ADMIN` par l'adresse exacte, puis exécuter le script dans le SQL Editor du bon projet.
4. Vérifier la ligne retournée : `role` doit être `admin`.
5. Garder cette procédure sous le contrôle d'une personne autorisée à administrer Supabase.

Le formulaire d'inscription ne propose jamais le rôle administrateur. Les autres personnes choisissent librement leur fonction déclarative, mais restent des utilisateurs standards du point de vue des permissions.

## Routes

- `/login` : connexion
- `/register` : inscription
- `/dashboard` : espace protégé par middleware

## Limites de cette étape

Le dashboard est un écran d'accueil d'authentification, pas encore le tableau de bord biomédical réel. Les formulaires de gestion des utilisateurs et la matrice de permissions détaillée par service seront renforcés dans les étapes suivantes.
