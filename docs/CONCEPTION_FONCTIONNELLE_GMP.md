# GMP — Cahier de conception fonctionnelle

**Établissement :** Polyclinique Groupe Médical du Plateau (GMP)  
**Application :** Gestion du parc biomédical  
**Socle technique :** Next.js / TypeScript, GitHub, Vercel, Supabase (PostgreSQL, Auth et Storage)

## 1. Finalité

Centraliser l'inventaire et le suivi technique du parc biomédical, documenter les pannes et interventions, planifier la maintenance et fournir à la direction une vue fiable sur l'état du parc. Le technicien-administrateur est le principal contributeur de l'application ; les autres comptes consultent les informations en lecture seule.

## 2. Profils et permissions

### Administrateur-technicien
- Créer et modifier les fiches équipements et les référentiels autorisés.
- Enregistrer les pannes, diagnostics, interventions internes et interventions de prestataires.
- Enregistrer les opérations de maintenance, pièces, coûts et rapports.
- Vérifier le fonctionnement et valider la remise en service.
- Consulter les indicateurs, gérer les comptes observateurs et les paramètres.

### Observateur
- Consulter les équipements, statuts, pannes, maintenances, mouvements, rapports et statistiques.
- Ne peut ni créer, ni modifier, ni supprimer les données métier.
- Les restrictions doivent être appliquées dans l'interface et par les politiques de sécurité de la base de données (RLS), pas seulement par masquage des boutons.

## 3. Modules fonctionnels

1. **Tableau de bord :** total des équipements, fonctionnels, indisponibles, pannes ouvertes, dossiers prioritaires, maintenances actives/échues, prochaines échéances, disponibilité et coûts saisis.
2. **Parc biomédical :** code d'inventaire unique, désignation, catégorie, marque, modèle, numéro de série, photo, service, emplacement, dates d'acquisition/mise en service, garantie, fournisseur, criticité, complexité technique, état opérationnel et historique.
3. **Pannes :** équipement concerné, date, déclarant/source, symptômes, priorité, diagnostic, actions, technicien ou prestataire, pièces, coûts, vérification et rapport final.
4. **Maintenance :** préventive et corrective, fréquence, échéances, ordre de travail, intervenant, tâches, pièces, coûts, résultat et prochaine date prévue.
5. **Mouvements :** origine, destination, date, motif et historique des transferts d'équipements.
6. **Rapports et statistiques :** fiches et comptes rendus consultables, exports, coûts et indicateurs par période/service.
7. **Paramètres :** identité GMP, services, emplacements, catégories, types de maintenance, prestataires et comptes utilisateurs.

## 4. Règles métier

- Un équipement associé à une panne confirmée est automatiquement placé hors service, selon la règle de transition retenue dans la base de données.
- Le statut du dossier de panne est distinct du statut opérationnel de l'équipement.
- Une panne ne peut être déclarée résolue et l'équipement remis en service qu'après vérification et validation par l'administrateur-technicien.
- Les équipements simples peuvent être dépannés en interne lorsque cela relève des compétences du technicien. Pour un équipement complexe ou hors de son périmètre, le dossier trace le recours à un prestataire et le suivi de son intervention.
- Une réparation ou une clôture ne doit pas effacer l'historique. La réforme d'un équipement doit privilégier l'archivage.
- La complexité (simple/complexe), l'état opérationnel et l'état de maintenance sont des dimensions distinctes.
- Les données financières affichées sont des montants saisis dans les dossiers ; elles ne doivent pas être présentées comme une comptabilité exhaustive sans rapprochement.

## 5. Cycle de traitement d'une panne

1. Enregistrement du signalement et sélection de l'équipement.
2. Passage de l'équipement en statut hors service si la panne est confirmée.
3. Qualification et diagnostic.
4. Intervention interne ou sollicitation/suivi d'un prestataire externe.
5. Documentation des actions, pièces, temps et coûts.
6. Vérification fonctionnelle et de sécurité adaptée à l'équipement.
7. Rapport de fin d'intervention, validation de remise en service et clôture.

Statuts de dossier proposés : nouvelle, à qualifier, en cours, en attente de pièces, en attente de prestataire, en intervention, en attente de vérification, résolue/clôturée. Les statuts définitifs doivent correspondre aux valeurs réellement utilisées dans les migrations et l'application.

## 6. Principes de sécurité

- Authentification individuelle ; aucun compte partagé pour la direction.
- Rôle et état actif du compte vérifiés côté serveur.
- RLS activée sur les tables sensibles et politique d'écriture réservée à l'administrateur.
- Clé Supabase `service_role` exclusivement côté serveur et jamais dans une variable `NEXT_PUBLIC_*`.
- Fichiers techniques et photos stockés dans un bucket privé avec URL signée lorsque nécessaire.
- Traçabilité des opérations critiques et archivage des dossiers terminés.
- Pas de données nominatives de patients dans les rapports biomédicaux, sauf besoin formel et dispositif de protection validé.

## 7. Interface

Navigation principale : Vue d'ensemble, Parc biomédical, Pannes & interventions, Maintenance, Mouvements, Rapports & statistiques, Paramètres et Utilisateurs (administrateur seulement). Interface prioritairement optimisée pour ordinateur, avec adaptation aux écrans mobiles, recherche et filtres cohérents, statuts lisibles et formulaires structurés.

## 8. Ordre d'implémentation

1. Refonte de la navigation et du tableau de bord (en cours).
2. Audit et stabilisation du schéma Supabase et des règles RLS.
3. Fiches et inventaire des équipements.
4. Cycle complet des pannes et remise en service.
5. Maintenance préventive/corrective.
6. Rapports, exports et statistiques.
7. Paramètres et gestion des observateurs.
8. Tests d'intégration, contrôle des permissions et préparation du déploiement.

## 9. Critères de validation

- Un utilisateur non connecté est envoyé vers la connexion.
- Un observateur ne peut pas écrire dans les tables métier même en appelant directement l'API Supabase.
- Une panne et son historique restent associés à l'équipement concerné.
- Le retour en service nécessite une validation explicite du technicien-administrateur.
- Les indicateurs sont calculés depuis les données de la base et affichent clairement l'absence de données.
- Les migrations sont rejouables sur une base de test propre et les commandes de typecheck, lint et build réussissent.
- Les secrets ne sont pas versionnés dans GitHub.
