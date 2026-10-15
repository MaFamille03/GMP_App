# GMP — Validation finale et mise en service

## Statut honnête de cette livraison

La validation structurelle automatisée est disponible via `npm run validate:release`. Elle vérifie la présence des principaux écrans et documents, ainsi que des migrations SQL attendues. Ce contrôle ne prouve pas que l’application compile ni que les politiques de sécurité sont correctes.

Dans l’environnement de préparation de cette archive, `node_modules` et `package-lock.json` ne sont pas présents. Par conséquent, la compilation Next.js, le lint et les tests de bout en bout ne sont pas déclarés réussis. Ils doivent être exécutés dans l’environnement de développement avec les dépendances installées et les variables Supabase configurées.

## A. Contrôles automatiques

À la racine du projet :

```bash
npm install
npm run validate:release
npm run typecheck
npm run lint
npm run build
```

Conserver le `package-lock.json` généré par l’installation et le versionner avec le projet pour stabiliser les versions résolues. Corriger toute erreur avant de poursuivre.

## B. Base de données

1. Créer une base Supabase de développement distincte de la production.
2. Sauvegarder toute base existante avant modification.
3. Vérifier les migrations `supabase/migrations/` dans l’ordre chronologique, puis les appliquer une par une.
4. Vérifier le résultat de chaque migration dans les journaux PostgreSQL et confirmer les contraintes, fonctions, déclencheurs et politiques RLS.
5. Charger les données de référence si nécessaire et créer le premier administrateur selon la procédure d’authentification.
6. Ne pas réappliquer une migration non idempotente sur une base déjà migrée sans procédure explicite.

## C. Scénarios de recette fonctionnelle

- **Authentification :** connexion, déconnexion, session expirée, compte désactivé et accès à une URL protégée.
- **Autorisations :** administrateur actif, observateur actif, utilisateur désactivé ; vérifier l’interface ET les requêtes directes à l’API/base.
- **Équipements :** créer et modifier une fiche, rechercher/filtrer, vérifier les relations service/emplacement/catégorie, tester photos et documents.
- **Pannes :** créer une panne, faire évoluer son statut, enregistrer le diagnostic et l’intervention, contrôler l’historique et les coûts, puis vérifier les conditions de remise en service.
- **Maintenance :** créer un ordre, renseigner l’échéance et le statut, vérifier les filtres et le calcul des retards.
- **Stock :** enregistrer une entrée et une sortie, vérifier le rattachement à l’ordre de travail, le seuil d’alerte et le refus d’un stock négatif.
- **Référentiels :** modifier et désactiver une référence, puis vérifier que les anciennes fiches conservent leurs liens historiques.
- **Rapports :** comparer les indicateurs aux enregistrements sources et vérifier les exports CSV.
- **Audit :** confirmer que les actions sensibles sont consignées et que seuls les rôles autorisés consultent le journal.

## D. Contrôles de sécurité

- Vérifier que `.env.local` n’est pas versionné et qu’aucune clé `service_role` n’est envoyée au navigateur.
- Examiner chaque politique RLS, fonction SQL `SECURITY DEFINER`, trigger et action serveur sensible.
- Tester les permissions avec des requêtes directes, pas uniquement à travers l’interface.
- Vérifier l’accès aux fichiers privés et les règles de stockage Supabase.
- Vérifier les journaux d’erreurs et éviter d’y écrire des secrets ou des données personnelles inutiles.

## E. Mise en production

1. Obtenir l’approbation du responsable biomédical et du responsable informatique.
2. Valider la recette sur une copie représentative, sans perturber les opérations cliniques.
3. Planifier une fenêtre de déploiement, une sauvegarde vérifiée et une procédure de retour arrière.
4. Configurer les variables d’environnement dans le gestionnaire de secrets de l’hébergeur.
5. Déployer puis vérifier immédiatement connexion, droits, pages principales, écritures, stockage de fichiers et journaux.
6. Former les utilisateurs et définir un responsable des comptes, des sauvegardes et des incidents.

## Décision de mise en service

**Ne pas considérer l’application comme prête pour la production tant que les commandes de contrôle, la recette fonctionnelle, les tests RLS, la stratégie de sauvegarde/restauration et la validation métier n’ont pas été effectués et consignés.**
