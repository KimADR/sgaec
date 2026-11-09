# Rapport de recette visuelle finale — SGAEC

**Date :** 9 novembre 2026  
**Environnement :** Compose de démonstration isolé, `demo.admin`, Commune fictive A  
**Périmètre :** inspection authentifiée des pages principales, sans modification de données.

## Résultat

Les huit pages principales ont été contrôlées à 1440, 768 et 390 px, soit 24 combinaisons. Aucun débordement horizontal du document ni message d'erreur applicatif visible n'a été constaté. Les tableaux de données conservent leur défilement horizontal interne lorsqu'il est nécessaire.

La navigation conserve son comportement attendu : barre latérale fixe de 282 px sur grand écran, tiroir hors-canevas aux largeurs tablette et mobile, rubriques actives, contrôle par permissions, sélection de commune, défilement interne et fermeture par Échap avec restitution du focus au bouton d'ouverture. Le corps est immobilisé lorsque le menu mobile est ouvert.

Une anomalie d'affichage a été corrigée dans la liste CIN : la référence de dossier utilisait une coupure forcée après chaque caractère (`break-all`). Elle utilise maintenant `break-words`, afin de préserver les coupures normales dans les références étroites. Le service Web a été reconstruit, puis le rendu 390 px a été revérifié. Aucun workflow ni règle métier n'a été modifié.

## Captures

Chaque lien ouvre la capture correspondante. `cin-390.png` est une capture du viewport mobile (le plein écran de la liste complète dépassait la limite de taille de capture du navigateur).

| Page | 1440 px | 768 px | 390 px |
|---|---|---|---|
| Accueil | [PNG](./docs/recette-visuelle/accueil-1440.png) | [PNG](./docs/recette-visuelle/accueil-768.png) | [PNG](./docs/recette-visuelle/accueil-390.png) |
| Citoyens | [PNG](./docs/recette-visuelle/citoyens-1440.png) | [PNG](./docs/recette-visuelle/citoyens-768.png) | [PNG](./docs/recette-visuelle/citoyens-390.png) |
| Naissances | [PNG](./docs/recette-visuelle/naissances-1440.png) | [PNG](./docs/recette-visuelle/naissances-768.png) | [PNG](./docs/recette-visuelle/naissances-390.png) |
| CIN | [PNG](./docs/recette-visuelle/cin-1440.png) | [PNG](./docs/recette-visuelle/cin-768.png) | [PNG](./docs/recette-visuelle/cin-390.png) |
| Demandes | [PNG](./docs/recette-visuelle/demandes-1440.png) | [PNG](./docs/recette-visuelle/demandes-768.png) | [PNG](./docs/recette-visuelle/demandes-390.png) |
| Archives | [PNG](./docs/recette-visuelle/archives-1440.png) | [PNG](./docs/recette-visuelle/archives-768.png) | [PNG](./docs/recette-visuelle/archives-390.png) |
| Rapports | [PNG](./docs/recette-visuelle/rapports-1440.png) | [PNG](./docs/recette-visuelle/rapports-768.png) | [PNG](./docs/recette-visuelle/rapports-390.png) |
| Administration | [PNG](./docs/recette-visuelle/administration-1440.png) | [PNG](./docs/recette-visuelle/administration-768.png) | [PNG](./docs/recette-visuelle/administration-390.png) |

## Répétition du scénario de démonstration

La répétition visuelle a été faite en lecture seule sur les enregistrements fictifs déjà présents dans le volume de recette :

1. Connexion comme `demo.admin`, choix de la Commune fictive A et vérification du tableau de bord.
2. Consultation du citoyen fictif et de l'acte `NAI-DEMO-2026-327FED22`, au statut **Validé**. Le contenu de la fiche de naissance est resté identique après rechargement.
3. Consultation du dossier CIN `CIN-DEMO-2026-14DEE43C`, **Clôturé**, et du dossier `CIN-DEMO-2026-2464DAB3`, **Rejeté**.
4. Vérification des pages Demandes et Archives distinctes, ainsi que des pages Rapports et Administration.

Aucun dossier n'a été créé, édité ou supprimé pendant cette recette visuelle. Les parcours de création, transitions CIN/naissance, permissions, isolation entre communes et PDF spécimens ont été exercés lors de la consolidation antérieure ; les résultats correspondants sont consignés dans [RAPPORT_CONSOLIDATION.md](./RAPPORT_CONSOLIDATION.md). Ils n'ont pas tous été rejoués dans cette inspection visuelle.

## Vérifications techniques

| Contrôle | Résultat |
|---|---|
| Navigation sur les 8 pages × 3 largeurs | 24/24 visitées ; aucun débordement horizontal ni alerte applicative visible |
| Menu mobile | Ouverture, état actif, focus initial, verrouillage du défilement, Échap et retour du focus vérifiés |
| TypeScript (`npm run typecheck`) | Réussi |
| Tests frontend (`npm test`) | 10 réussis, 0 échec |
| Build Next.js (`npm run build`) | Réussi |
| Compose isolé | PostgreSQL, data et API sains ; Web reconstruit et répond HTTP 200 sur `localhost:3000` |

Les annulations de requêtes RSC observées pendant les changements rapides de page (`ERR_ABORTED`) sont des préchargements interrompus par la navigation, et non des erreurs de rendu. Aucun test automatisé Playwright n'est fourni dans les scripts du dépôt ; les contrôles visuels ci-dessus ont été réalisés dans le navigateur.

## Limites restantes

- La clôture CIN est simulée et ne délivre pas de titre officiel.
- La page Archives est une consultation numérique, pas un archivage réglementaire.
- Les pièces sont déclaratives ; les modules Mariages et Décès ne sont pas implémentés.
- Cette passe visuelle a utilisé le rôle Administrateur communal. Les rôles et le cloisonnement multi-communes ont été vérifiés lors de la consolidation antérieure.
- L'export PDF/ZIP n'a pas été relancé pendant cette passe visuelle ; se reporter aux résultats consignés dans le rapport de consolidation.

Le compte `demo.admin` est fictif. Son mot de passe reste défini localement dans `.env.demo` et ne doit pas être inclus dans une archive de livraison.
