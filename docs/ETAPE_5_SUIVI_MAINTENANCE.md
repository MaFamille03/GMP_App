# Étape 5 — Suivi opérationnel de la maintenance

## Objectif
Rendre le suivi des plans d’entretien et des ordres de travail plus exploitable au quotidien par l’équipe biomédicale.

## Améliorations incluses
- Indicateur des ordres en retard basé sur la date planifiée **ou** la prochaine échéance, en excluant les ordres terminés et annulés.
- Indicateur des échéances ouvertes arrivant dans les 30 prochains jours.
- Recherche des ordres par numéro OT, titre, description, code interne ou désignation de l’équipement.
- Filtres combinables par statut et type d’ordre, avec remise à zéro.
- Compteur des résultats affichés pour rendre les filtres explicites.
- Mise en page des indicateurs adaptée aux écrans étroits.

## Utilisation
1. Ouvrir **Maintenance** depuis le tableau de bord.
2. Dans l’onglet **Ordres**, rechercher un OT ou un équipement.
3. Combiner les filtres de statut et de type selon le besoin.
4. Utiliser les indicateurs pour repérer les retards et les échéances à venir, puis ouvrir l’ordre concerné pour suivre son exécution.

## Données et migration
Cette étape réutilise les tables `maintenance_plans`, `work_orders` et `interventions`. Elle ne nécessite pas de nouvelle migration par rapport aux migrations déjà fournies, notamment `202610150003_maintenance_management.sql` et les migrations antérieures.

## Contrôles à effectuer avant déploiement
- Vérifier que les migrations précédentes sont appliquées sur l’environnement de test.
- Tester les filtres avec un jeu de données comportant plusieurs statuts et types.
- Vérifier les dates d’échéance en retard, à venir, terminées et annulées.
- Vérifier les autorisations RLS avec un compte administrateur-technicien et un compte en lecture seule.
- Effectuer le build et les tests d’intégration dans l’environnement du projet avec ses dépendances installées.

> Cette livraison n’a pas été exécutée contre une instance Supabase réelle ; les contrôles ci-dessus restent nécessaires.
