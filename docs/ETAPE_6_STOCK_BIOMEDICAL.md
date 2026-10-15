# Étape 6 — Pièces détachées et stock biomédical

## Objectif
Centraliser les références de pièces et consommables utiles à la maintenance biomédicale, connaître les quantités disponibles et conserver un journal des mouvements.

## Fonctions livrées
- Référentiel des pièces : code unique, désignation, catégorie, unité, seuil minimum, coût unitaire, fournisseur, emplacement et description.
- Journal des mouvements : entrées, consommations, ajustements positifs et négatifs, quantité, coût, référence documentaire et commentaire.
- Alerte visuelle quand le stock est inférieur ou égal au seuil minimum.
- Association obligatoire d'une consommation à un ordre de travail, pour préserver la traçabilité opérationnelle.
- Historique des 300 mouvements les plus récents.
- Désactivation/réactivation d'une référence sans effacer son historique.
- Contrôle atomique côté PostgreSQL : les sorties qui feraient passer le stock sous zéro sont refusées.
- Accès en lecture pour les comptes actifs ; écriture réservée aux administrateurs et responsables biomédicaux.

## Installation
Appliquer `supabase/migrations/202610150007_spare_parts_stock.sql` dans l'environnement Supabase de développement, après les migrations précédentes. La migration crée `spare_parts` et `stock_movements`, les politiques RLS, les index et le déclencheur qui ajuste le stock à chaque insertion de mouvement.

## Mode opératoire conseillé
1. Créer une référence d'article avec un code unique.
2. Enregistrer une entrée de stock initiale, avec la quantité réellement comptée et une référence documentaire si disponible.
3. Définir un seuil minimum réaliste pour chaque référence.
4. Lors d'une intervention, enregistrer une consommation et la rattacher à son ordre de travail.
5. Pour corriger une erreur, saisir un mouvement inverse documenté. Le journal est volontairement non modifiable/supprimable après enregistrement.
6. Vérifier périodiquement le stock physique et utiliser les ajustements pour tracer les écarts constatés.

## Limites à connaître
- Les entrées/sorties ne créent pas automatiquement de commandes fournisseur ni de bons de réception.
- Le stock est suivi par référence globale, sans gestion multi-magasin, numéro de lot, date de péremption ou numéro de série.
- Le rattachement à un OT est proposé dans l'interface ; le champ `intervention_id` existe dans le modèle pour permettre une liaison plus fine dans une prochaine étape.
- Les mouvements sont conservés comme journal : une correction doit être compensée par un mouvement inverse.

## Vérifications avant production
Appliquer la migration sur une base de test, vérifier les droits de chaque rôle, tester une entrée, une consommation, une sortie supérieure au stock disponible, les alertes de seuil et la conservation de l'historique. La compilation et les tests d'intégration doivent être exécutés dans l'environnement qui dispose des dépendances du projet.
