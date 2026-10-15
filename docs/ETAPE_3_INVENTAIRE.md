# GMP — Étape 3 : inventaire biomédical

## Inclus dans cette livraison
- Liste d'inventaire connectée à Supabase, recherche et filtres par état, service et complexité.
- Indicateur de fiches dont l'inventaire physique reste à confirmer.
- Formulaire de création avec code unique, identité de l'appareil, affectation, complexité, vérification, état, criticité et cycle de vie.
- Formulaire de modification avec les mêmes champs de classification.
- Fiche détaillée enrichie avec photo principale signée depuis le bucket privé, informations techniques, pannes, ordres de maintenance et documents.
- Statut distinct de la complexité et de l'état de vérification.

## Prérequis
1. Appliquer les migrations existantes, notamment `202610150005_schema_alignment_and_audit.sql`, sur la base de développement.
2. Créer/configurer le bucket privé `gmp-equipment-files` et appliquer les politiques Storage fournies par le projet.
3. Les rôles non administrateurs restent en lecture seule via les politiques RLS ; la présence/absence de boutons n'est pas une mesure de sécurité suffisante.
4. Les photos ne sont pas rendues publiques : l'application crée des liens signés à durée limitée.

## Vérifications manuelles
- Créer un équipement sans complexité : la fiche doit indiquer « à déterminer ».
- Affecter un service et un emplacement, modifier la fiche et vérifier la persistance.
- Confirmer une fiche physiquement vérifiée : le badge « fiche à vérifier » doit disparaître.
- Ajouter une photo principale et vérifier qu'elle s'affiche dans l'inventaire et dans la fiche.
- Tester la consultation avec un compte observateur ; vérifier que création, modification et suppression sont refusées côté base.
- Tester les filtres par état, service et complexité ainsi que l'export CSV.
- Vérifier les historiques de pannes et d'ordres de maintenance pour un équipement qui possède déjà ces dossiers.

## Limite de validation
Le code est livré dans une archive source. Une compilation Next.js complète et un test d'intégration Supabase nécessitent l'installation des dépendances et des variables d'environnement du projet.
