# GMP — Gestion du parc biomédical

Application web Next.js 15 / React 19 avec Supabase pour le suivi du parc biomédical : équipements, pannes, maintenances, pièces détachées, mouvements, rapports, référentiels et gestion des accès.

## Démarrage en environnement de développement

1. Utiliser une version de Node.js compatible avec Next.js 15.
2. Copier `.env.example` vers `.env.local` et renseigner l’URL et la clé publique Supabase du projet de développement.
3. Installer les dépendances avec `npm install`.
4. Examiner puis appliquer **dans l’ordre chronologique** les fichiers `supabase/migrations/*.sql` sur une base de développement neuve ou sauvegardée. Ne pas exécuter une migration à l’aveugle sur une base qui contient déjà des données.
5. Créer le premier compte administrateur selon `supabase/first_admin_setup.sql` et `supabase/ETAPE_2_AUTH_SETUP.md`.
6. Démarrer avec `npm run dev`.

## Contrôles avant livraison

```bash
npm run validate:release
npm run typecheck
npm run lint
npm run build
```

`validate:release` contrôle la présence des fichiers critiques, des migrations attendues et l’absence de secrets évidents dans `.env.example`. Ce n’est pas un test de compilation, de sécurité ni d’intégration. Les contrôles TypeScript, ESLint, Next.js et les tests manuels doivent être exécutés séparément avec les dépendances installées.

## Sécurité et données

- Ne jamais committer `.env.local`, une clé `service_role` ou une clé secrète.
- Les clés publiques Supabase ne sont pas un substitut aux politiques RLS : celles-ci doivent être vérifiées sur la base cible.
- Tester avec un administrateur actif, un observateur actif et un compte désactivé.
- Vérifier les sauvegardes et la procédure de restauration avant toute mise en production.
- Ne pas utiliser des données biomédicales réelles pour les tests initiaux.

## Documentation

- `docs/CONCEPTION_FONCTIONNELLE_GMP.md` : principes fonctionnels.
- `docs/ETAPE_3_INVENTAIRE.md` : inventaire et fiche équipement.
- `docs/ETAPE_4_GESTION_PANNES.md` : workflow des pannes.
- `docs/ETAPE_5_SUIVI_MAINTENANCE.md` : suivi de maintenance.
- `docs/ETAPE_6_STOCK_BIOMEDICAL.md` : pièces et stock.
- `docs/ETAPE_7_RAPPORTS_ET_TRACABILITE.md` : rapports et audit.
- `docs/ETAPE_9_SECURITE_ET_ACCES.md` : accès et sécurité.
- `FINAL_VALIDATION_ET_DEPLOIEMENT.md` : liste de contrôle de mise en service.

Cette archive est une version de travail consolidée. Elle n’est pas certifiée ni déclarée prête pour la production avant les contrôles décrits ci-dessus.
