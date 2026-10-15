# GMP — Étape 9 : utilisateurs, rôles et sécurité

## Changements

- Un seul rôle autorise les écritures métier : `profiles.role = 'admin'` et le compte doit être actif.
- L'interface du stock ne traite plus `biomedical_manager` comme un rôle d'écriture. Les politiques RLS restent l'autorité finale.
- Les modifications sensibles du profil (rôle, activation, nom et fonction) génèrent une entrée dans `audit_logs`.
- Le journal d'audit est consultable uniquement par un administrateur actif. Les clients ne disposent pas de politiques d'écriture directe sur ce journal.
- L'API d'invitation vérifie déjà l'authentification, le statut actif, le rôle administrateur, les champs et la clé serveur.

## Migration

Appliquer `supabase/migrations/202610150008_security_hardening.sql` après les migrations précédentes, d'abord sur une base de développement. Vérifier les politiques RLS existantes et tester les écritures en tant qu'administrateur, observateur et compte désactivé.

## Tests de sécurité à effectuer avant mise en production

1. Un observateur ne peut ni insérer ni modifier un équipement, une panne, un ordre de travail ou un mouvement de stock, même en appelant directement l'API Supabase.
2. Un utilisateur non administrateur ne peut pas consulter `audit_logs` ni modifier `profiles.role` ou `profiles.is_active`.
3. La désactivation d'un compte bloque les accès aux pages privées et les écritures côté base.
4. Une modification de rôle ou d'état de compte apparaît dans le journal d'audit avec l'ancien et le nouvel état.
5. La clé `SUPABASE_SERVICE_ROLE_KEY` n'est jamais exposée au navigateur et reste absente de l'archive.

La migration renforce les contrôles existants, mais ne remplace pas ces tests d'intégration. Ne pas considérer la sécurité validée tant que les scénarios ci-dessus n'ont pas été exécutés sur le projet Supabase ciblé.
