# GMP — Étape 7 : rapports et traçabilité

## Objectif
Renforcer le pilotage du parc biomédical par des indicateurs opérationnels, des exports et une consultation contrôlée du journal des actions.

## Éléments livrés
- Histogramme des six derniers mois : signalements de panne et ordres de travail, mois par mois.
- Conservation du filtre de période et des indicateurs déjà présents : parc, pannes, échéances, coûts et durée des interventions.
- Exports CSV du parc, des pannes et des ordres de travail.
- Pour le compte administrateur uniquement : tableau des 250 actions auditées les plus récentes et export CSV du journal.
- Impression du rapport à partir de la fonction d’impression du navigateur.

## Données et sécurité
Le journal s'appuie sur `public.audit_logs`, alimenté par les triggers de la migration `202610150005_schema_alignment_and_audit.sql`. La politique RLS de cette table réserve la lecture aux administrateurs. L'écran ne tente donc pas de charger le journal pour les comptes observateurs.

Les exports sont générés dans le navigateur à partir des données chargées par la page. La page charge jusqu'à 5 000 lignes par source et le journal présente au plus 250 événements : ces plafonds doivent être pris en compte pour les parcs plus importants. Les coûts reflètent uniquement les montants renseignés et ne constituent pas une comptabilité exhaustive.

## Vérifications à effectuer avant déploiement
1. Appliquer les migrations déjà présentes dans l'ordre prévu par le projet, notamment `202610150005_schema_alignment_and_audit.sql` si ce n'est pas déjà fait.
2. Vérifier avec un compte administrateur que le journal se charge et s'exporte.
3. Vérifier avec un compte observateur que le journal d'audit n'est pas exposé.
4. Comparer les indicateurs et exports avec les données de la base de test.
5. Exécuter `npm install`, `npm run typecheck`, `npm run lint` et `npm run build` dans l'environnement de développement.

Aucune validation de compilation ou d'intégration contre un projet Supabase réel n'est déclarée dans cette livraison.
