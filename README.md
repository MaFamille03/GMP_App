# GMP — Gestion du parc biomédical

Projet Next.js + TypeScript connecté à Supabase. Ce ZIP est cumulatif et inclut le code des étapes précédentes ainsi que l'étape 8.

## Étape 8 — Photos et documents des équipements

La fiche détaillée d'un équipement (`/equipment/[id]`) comprend désormais un dossier documentaire :
- ajout de photos de l'appareil, de la plaque signalétique et de son état ;
- ajout de manuels, certificats, factures, garanties et rapports de maintenance ;
- métadonnées enregistrées dans `public.equipment_files` ;
- fichiers stockés dans le bucket privé `gmp-equipment-files` ;
- aperçus d'images par URL signée temporaire et action pour ouvrir/télécharger un document ;
- suppression d'un fichier, avec contrôle des droits par les politiques Supabase ;
- formats autorisés : JPEG, PNG, WEBP et PDF ; taille maximale : 15 Mo.

## Configuration Supabase

La migration initiale `supabase/migrations/202610140001_initial_schema.sql` crée déjà `equipment_files`, le bucket privé `gmp-equipment-files` et les politiques de stockage. Si la base distante n'a pas encore reçu cette migration, exécute-la dans un environnement de test puis vérifie les politiques RLS avant la production. Le profil doit être habilité à gérer le parc biomédical pour envoyer ou supprimer des fichiers.

Variables attendues dans `.env.local` (voir `.env.example`) :
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Installation et contrôles

```bash
npm install
npm run typecheck
npm run lint
npm run build
```

Les contrôles ci-dessus doivent être exécutés dans l'environnement de déploiement. Le code source fourni n'est pas une preuve que la configuration de votre instance Supabase ou les rôles utilisateurs sont déjà validés.


## Étape 9 — Traçabilité des mouvements

- Nouvelle page `/movements` : historique des transferts entre services et emplacements.
- Formulaire réservé aux administrateurs : équipement, destination, motif et observations.
- Fonction SQL `record_equipment_movement` : met à jour la fiche équipement et écrit le mouvement dans une même transaction PostgreSQL.
- Migration à exécuter dans Supabase : `supabase/migrations/202610140009_equipment_movements_rpc.sql`.
- Les comptes non administrateurs peuvent consulter l'historique, selon les politiques RLS existantes.

Avant déploiement : exécuter la migration dans le bon projet Supabase, puis vérifier `npm run typecheck`, `npm run lint` et `npm run build`. L'interface ne remplace pas les essais sur l'instance réelle.
