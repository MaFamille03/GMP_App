# Notes sur le schéma initial

## Décisions prises

- Identifiants UUID pour les objets métier.
- Code interne d’équipement unique.
- Données techniques propres à chaque catégorie stockées dans `technical_specs` (JSONB) en complément des champs communs.
- Statut de vérification séparé du statut opérationnel : une donnée peut être « à vérifier » sans que l’application prétende connaître l’état réel.
- Photos et documents dans un bucket privé, avec métadonnées dans `equipment_files`.
- Historique des mouvements dans `equipment_movements`.
- Pannes distinctes des ordres de travail et des interventions afin de conserver le fil de traitement.
- Validation de remise en service explicite, sans bascule automatique à « fonctionnel » après un compte rendu prestataire.

## À finaliser à l’étape 2

- Flux de création/activation du profil utilisateur.
- Protection des routes et synchronisation des sessions.
- Matrice détaillée de permissions par rôle et service.
- Validation des droits d’écriture par technicien, responsable de service, direction et prestataire.
- Journalisation automatisée des événements sensibles.
- Tests RLS automatisés avec comptes de chaque rôle.

## Important sur la première politique RLS

La migration privilégie un accès en lecture aux utilisateurs actifs et réserve la plupart des modifications aux administrateurs et responsables biomédicaux. Les règles fines par service et par prestataire devront être mises en place et testées avant la production.

- Les utilisateurs ne peuvent pas modifier eux-mêmes leur rôle ni leur statut actif via l'application. La création du premier profil administrateur doit être faite par une procédure contrôlée à l'étape 2.
