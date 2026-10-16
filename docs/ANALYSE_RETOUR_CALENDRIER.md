# Audit des parcours ouverts depuis le calendrier GMP

## Parcours d'événements recensés
- Échéance de maintenance préventive d'un équipement : `/equipment/[id]`.
- Signalement ou résolution d'une panne : `/breakdowns/[id]`.
- Ordre de travail planifié, terminé ou arrivé à échéance : `/maintenance`.

## Retours et conservation de la date
- Les pages de détail d'équipement, de panne et de maintenance proposent un retour au calendrier lorsque `from=calendar` est présent.
- Le retour conserve `date=YYYY-MM-DD`, afin de rouvrir le calendrier sur la date de l'événement.
- Depuis une fiche équipement ouverte par le calendrier, le lien « Modifier la fiche » transmet maintenant l'origine et la date. La page de modification affiche le retour au calendrier et conserve le contexte lors du retour à la fiche.
- Depuis une panne ouverte par le calendrier, le lien vers la fiche équipement conserve aussi l'origine et la date.

## Vérification
Le code a été examiné statiquement et les liens de navigation ont été ajustés. La compilation Next.js n'a pas été exécutée : ce projet ne contient pas de `package-lock.json`, donc `npm ci` n'est pas applicable. Faire `npm install` dans l'environnement de développement puis `npm run build` avant le déploiement.
