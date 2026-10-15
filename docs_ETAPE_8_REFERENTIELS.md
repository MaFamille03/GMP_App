# GMP — Étape 8 : paramétrage et référentiels

## Portée
Cette étape renforce la page `/settings` déjà présente : les administrateurs peuvent modifier les services, emplacements, catégories d'équipements et fournisseurs/prestataires existants sans les supprimer. Les champs modifiables sont propres à chaque type de référentiel. Les actions continuent à passer par des Server Actions protégées par `requireAdmin`.

## Pourquoi désactiver plutôt que supprimer ?
Les référentiels peuvent être reliés à des équipements, profils, pannes, ordres de travail ou mouvements. La désactivation conserve l'historique et évite de casser ces relations. La réactivation reste disponible.

## Installation
Aucune migration supplémentaire n'est requise pour l'édition ajoutée : elle utilise les tables et colonnes existantes. Appliquer d'abord les migrations déjà présentes dans `supabase/migrations`, notamment `202610150004_application_settings.sql` et les migrations antérieures.

## Vérifications recommandées en base de test
1. Se connecter avec un compte administrateur et modifier un élément de chaque référentiel.
2. Vérifier qu'un compte non administrateur ne voit pas les formulaires de mutation et que les Server Actions restent protégées.
3. Tester les noms/codes déjà utilisés : les contraintes uniques de la base doivent refuser les doublons, sans suppression des données liées.
4. Désactiver puis réactiver une référence liée à un équipement ou à une intervention et vérifier que l'historique reste intact.
5. Vérifier les champs facultatifs et la cohérence des coordonnées des fournisseurs.

## Limites
La compilation Next.js et les tests d'intégration Supabase ne sont pas déclarés réussis dans cette archive. Les tests ci-dessus restent à exécuter dans l'environnement de développement.
