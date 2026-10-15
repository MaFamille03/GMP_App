# GMP — Étape 4 : gestion des pannes

## Fonctionnalités livrées dans le code
- Registre des pannes avec filtres par état, priorité et recherche.
- Indicateurs : dossiers ouverts, urgences, dossiers chez prestataire, dossiers résolus en attente de vérification.
- Détail d'un dossier : symptômes, contexte, risque, équipement, dates de diagnostic/résolution/clôture, statut opérationnel, coût, prestataire, diagnostic, actions, pièces, essais et validation.
- Formulaire de suivi : statut, priorité, mode interne/externe, prestataire et référence, coût en FCFA, cause, diagnostic, actions, pièces, compte rendu et essais.
- Historique chronologique `breakdown_events`, écrit par un trigger PostgreSQL et lisible par les comptes actifs.
- Garde-fou de base : la clôture exige la validation de remise en service, le validateur, la date, les essais documentés et le compte rendu de résolution.
- Le formulaire n'effectue plus lui-même de mise à jour directe de l'état de l'équipement après clôture : les règles de la base sont la source de vérité.

## Statuts
- Nouvelle
- À qualifier
- Affectée
- En cours
- En attente de pièces
- En attente du prestataire
- Résolue — vérification requise
- Clôturée — remise en service validée
- Non réparable

`resolved` signifie que l'intervention est terminée mais que la vérification/validation de remise en service reste à faire. `closed` est réservé au dossier contrôlé et validé. `not_repairable` ne signifie jamais que l'appareil est fonctionnel.

## Application
1. Vérifier l'historique des migrations.
2. Appliquer `supabase/migrations/202610150006_breakdown_history_and_closure.sql` sur un environnement de développement.
3. Confirmer les politiques RLS de `breakdowns`, `breakdown_events`, `equipment` et `audit_logs`.
4. Tester en tant qu'administrateur-technicien puis observateur.
5. Vérifier qu'une panne active met l'équipement hors service et qu'une clôture ne peut pas être faite sans les champs requis.
6. Tester les scénarios prestataire externe, pièces en attente, non réparable, et plusieurs pannes ouvertes sur un même équipement.

## Précautions
- Ne pas tester les transitions sur des équipements en service réel.
- Les coûts affichés sont les coûts saisis dans le dossier, pas un état comptable.
- L'archive a été produite au niveau du code source ; une compilation Next.js complète et un test sur une base Supabase réelle restent à effectuer.
