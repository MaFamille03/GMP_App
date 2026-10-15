## Consolidation complète — étapes 1 à 9

Consulter `CONSOLIDATION_ETAPES_1_A_9.md` pour la méthode de consolidation, le contenu retenu et la procédure de test. Cette archive conserve les versions les plus récentes des fichiers communs et les corrections de l’étape 9. La compilation et les tests Supabase/Vercel restent à effectuer dans ton environnement.

# GMP — Gestion du parc biomédical

Application web de suivi du parc biomédical de la **Polyclinique Groupe Médical du Plateau (GMP)**.

## Architecture

- **Next.js + TypeScript** : application web.
- **Supabase** : PostgreSQL, authentification et stockage privé des photos/documents.
- **GitHub** : gestion du code source.
- **Vercel** : déploiement.

## Profils applicatifs

- **Administrateur-technicien biomédical** : gère les fiches et documente les opérations.
- **Observateur** : consulte les informations autorisées en lecture seule.

Les permissions doivent être imposées par les politiques RLS de Supabase, pas uniquement par l'interface.

## Fonctionnalités présentes

- Authentification et contrôle des accès.
- Tableau de bord et inventaire des équipements.
- Fiches techniques, état opérationnel, service, emplacement et cycle de vie.
- Recherche, filtres et export CSV de l'inventaire.
- Photos et documents privés rattachés aux équipements.
- Gestion des pannes, maintenance, mouvements et rapports.
- Administration des comptes et invitations (configuration Supabase requise).

Consulter les fichiers `AUDIT_ETAPE_1.md` à `AUDIT_ETAPE_5.md` pour les constats et les vérifications à effectuer.

## Installation locale

1. Installer une version LTS récente de Node.js et npm.
2. Créer un projet Supabase de développement/test.
3. Copier `.env.example` vers `.env.local` et renseigner `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Appliquer les migrations SQL dans l'ordre, après vérification de leur cible.
5. Installer les dépendances et lancer les contrôles :

```bash
npm install
npm run typecheck
npm run lint
npm run build
npm run dev
```

## Sécurité

- Ne jamais exposer `SUPABASE_SERVICE_ROLE_KEY` ou une clé `sb_secret_...` dans le navigateur, une variable `NEXT_PUBLIC_*` ou le dépôt Git.
- Ne pas utiliser de données de patients dans les fiches équipement ou les pièces jointes.
- Tester les règles RLS avec un compte administrateur, un observateur actif et un compte désactivé.
- Vérifier les invitations et désactiver les inscriptions publiques avant mise en production.
- Les photos sont stockées dans le bucket privé `gmp-equipment-files` ; les URL signées sont temporaires.

## Livraison cumulative

Chaque ZIP d'étape contient l'application complète et conserve les fonctionnalités des étapes précédentes. Les étapes ne sont considérées validées qu'après les tests de compilation, de sécurité et de fonctionnement sur une instance Supabase de test.

## Étape 4 — Gestion des pannes

La version actuelle enrichit les dossiers de panne : mode d'intervention interne/externe, prestataire, diagnostic détaillé, actions correctives, pièces utilisées, essais de sécurité, validation de remise en service et journalisation des changements. Appliquer la migration `supabase/migrations/202610150002_breakdown_workflow.sql` après les migrations précédentes dans un environnement de test.

Voir `AUDIT_ETAPE_4.md` pour les changements et les contrôles qui restent à effectuer. La compilation et les tests réels sur Supabase doivent être validés avant la production.


## Étape 5 — Gestion des maintenances

Les ordres de travail peuvent être associés à un plan d’entretien et à un prestataire, inclure une description des travaux, un budget estimatif et un coût réel, puis enregistrer les notes de validation technique. Appliquer `supabase/migrations/202610150003_maintenance_management.sql` après les migrations précédentes. Voir `AUDIT_ETAPE_5.md` pour les limites et tests nécessaires.


## Étape 7 — Paramètres du site

La page `/settings` permet à l'administrateur de gérer l'identité de la polyclinique, les services, les emplacements, les catégories d'équipements et les prestataires/fournisseurs. Les observateurs disposent d'un accès en lecture seule. Appliquer `supabase/migrations/202610150004_application_settings.sql` après les migrations précédentes, d'abord sur une base de test. Voir `AUDIT_ETAPE_7.md` pour le périmètre et les vérifications restantes.


## Étape 8 — Validation finale et déploiement

Le guide `FINAL_VALIDATION_ET_DEPLOIEMENT.md` contient la checklist finale de compilation, de sécurité, de migrations Supabase, de tests des deux rôles et de déploiement GitHub/Vercel. Le contrôle structurel sans dépendances se lance avec `node scripts/validate-release.mjs`. Ce contrôle ne remplace pas la compilation ni les tests RLS. La validation complète de production reste à effectuer.


## Étape 9 — audit technique et préparation de la mise en service

Consulter `AUDIT_ETAPE_9_VALIDATION.md` pour les corrections effectuées, les contrôles disponibles et les validations qui restent à exécuter. L’audit a corrigé une référence TypeScript indéfinie dans les actions des paramètres. La compilation et les tests Supabase ne sont pas encore certifiés, car l’installation npm n’a pas pu aboutir dans l’environnement de préparation.
