# GMP — Compte administrateur, menu de compte et vue des services

## 1. Logo de la vue d'ensemble
Le logo de `public/images/gmp-polyclinique-logo.jpg` est affiché dans la zone de marque de la barre latérale du tableau de bord. Pour utiliser un autre logo, remplacer ce fichier en conservant son nom ou modifier la source de l'image dans `src/app/dashboard/page.tsx`.

## 2. Compte administrateur principal
Le compte `minnhindje@gmail.com` doit avoir `profiles.role = 'admin'` et `profiles.is_active = true`. Le projet ne s'auto-attribue jamais le rôle administrateur depuis l'interface, pour éviter toute élévation de privilèges.

Dans le projet Supabase GMP concerné :
1. Ouvrir **SQL Editor**.
2. Ouvrir/coller le contenu de `supabase/promote_admin_minnhindje.sql`.
3. Exécuter le script et vérifier le résultat final : `role = admin`, `is_active = true`.
4. Se déconnecter puis se reconnecter à GMP afin de rafraîchir la session et le profil.

Le script échoue explicitement si l'adresse e-mail n'existe pas dans `auth.users`. Il faut alors créer/valider ce compte dans Supabase Auth avant de le relancer.

## 3. Menu de compte en haut à droite
Le menu affiche le nom, l'adresse e-mail et le rôle du compte connecté. Il donne accès à **Mon compte**, aux paramètres du site, à la gestion des utilisateurs pour un administrateur et à la déconnexion. La page `/account` présente les informations du compte connecté sans permettre à un observateur de modifier ses privilèges.

## 4. Équipements par service
La vue d'ensemble affiche les services actifs, le nombre d'appareils associés, la liste des équipements et les compteurs par état : fonctionnel, en panne, hors service et en maintenance. Les états supplémentaires (fonctionnement restreint et retrait du parc) restent visibles dans la liste. Un groupe « Service non renseigné » identifie les appareils qui n'ont pas encore de service associé.

Les services doivent être renseignés dans **Paramètres > Services**, puis affectés à chaque équipement dans sa fiche. Le tableau de bord ne crée pas automatiquement des services et ne modifie pas les affectations existantes.

## 5. Validation
Après déploiement, appliquer le script SQL administrateur dans le bon projet Supabase, puis vérifier avec le compte concerné : menu administrateur visible, page `/users` accessible, menu de compte opérationnel et listes d'appareils par service correctes. Tester aussi une session observateur pour confirmer que les actions d'administration restent cachées/protégées.
