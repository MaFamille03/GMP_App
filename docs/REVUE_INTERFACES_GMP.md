# Revue transversale des interfaces GMP

## Objectif
Cette passe privilégie la lisibilité, la cohérence visuelle et le confort d'utilisation des écrans existants. Elle ne vise pas à ajouter de nouveaux modules métier.

## Interfaces couvertes par la revue
- Accueil, connexion et création de compte
- Tableau de bord et navigation principale
- Inventaire, création/modification et fiche détaillée d'équipement
- Déclaration, liste, détail et suivi des pannes
- Ordres de travail et suivi des maintenances
- Stock, mouvements et consommations
- Rapports, exports et journal d'audit
- Référentiels et paramètres
- Gestion des utilisateurs et des droits

## Harmonisations appliquées
- Palette commune bleu biomédical, fonds clairs et bordures sobres
- Largeurs et espacements plus cohérents sur les pages à contenu
- Hiérarchie des titres et lisibilité des tableaux renforcées
- Contrôles de formulaire plus homogènes et plus faciles à utiliser
- Indicateurs de focus clavier visibles
- Ajustements responsive pour les petits écrans et réduction des animations si l'utilisateur le demande
- États vides, panneaux et cartes harmonisés

## Limites de validation
Cette revue est principalement visuelle et CSS. Elle ne garantit pas à elle seule que chaque action métier fonctionne. La compilation Next.js, les parcours de bout en bout, les politiques RLS Supabase et le rendu sur appareils réels doivent être vérifiés dans l'environnement équipé des dépendances et variables de configuration.

## Recette visuelle recommandée
1. Ouvrir chaque route avec un compte administrateur puis un compte observateur.
2. Contrôler les formulaires avec erreurs, succès et champs obligatoires.
3. Vérifier les tableaux avec beaucoup de lignes et les filtres sans résultat.
4. Tester les largeurs 1440 px, 1024 px, 768 px, 390 px et 320 px.
5. Vérifier l'impression des rapports et dossiers de panne.
6. Vérifier l'accessibilité clavier des liens, boutons, filtres et fenêtres de formulaire.
