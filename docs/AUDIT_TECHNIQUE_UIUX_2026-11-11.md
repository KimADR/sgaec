# Audit de préparation — SGAEC (11 novembre 2026)

## Conclusion opérationnelle

**Verdict : prototype techniquement structuré, démontrable sous réserve d'une recette Docker sur le PC de présentation.** Niveau visuel estimé **7/10 sur la base des captures fournies et du JSX/Tailwind**. Le principal risque identifié pour une base fraîche était l'absence de dossiers CIN préchargés, corrigée dans ce paquet.

### Architecture observée

1. **Next.js 16 / React 19 / Tailwind CSS v4** : interface française, authentification en cookie via reverse-proxy `/backend/`, vues réactives, export CSV et consultation PDF.
2. **FastAPI / PyJWT / httpx / ReportLab** : validation Pydantic, authentification, autorisations territoriales, endpoints de consultation et impression de documents **SPECIMEN**.
3. **Express 5 / Prisma 7 / PostgreSQL 16** : lecture et écriture, modèles citoyens/naissances/CIN, transitions de workflow, affectations et journal d'audit.
4. **Docker Compose** : conteneurs séparés pour DB, migrations, seed, API de données, FastAPI et Next.js ; API et Web liés aux ports loopback 127.0.0.1.

### Résultats vérifiés dans l'environnement d'audit

| Vérification | Résultat |
|---|---|
| Unitaires FastAPI | 47 / 47 passent |
| Tests Node service de données | 16 passent : 14 historiques + 2 nouveaux sur le seed ; 1 test PostgreSQL/RLS non exécuté faute de DB |
| Tests utilitaires Next | 10 / 10 passent |
| `node --check` du seed | Réussi |
| Compilation Python des scripts | Réussie |
| Précontrôle `.env.demo.maire` original | Réussi, secrets non affichés |
| `next build`, vérification visuelle interactive, navigateur authentifié | **Non exécutés** : dépendances npm indisponibles et accès au registre npm absent |
| Migration Prisma, seed PostgreSQL, vérification Docker et HTTP de bout en bout | **Non exécutés** : Docker absent du poste d'audit |

**Nuance :** un test unitaire réussi ne remplace pas une validation du comportement complet, du rendu à 1440 px, de la base PostgreSQL et des API. Aucun statut « prêt à 100 % » n'est attribué sans ce contrôle.

### Vérifications après intégration dans le dépôt existant (11 novembre 2026)

Les éléments ci-dessus décrivent l'environnement de l'audit initial. Depuis l'intégration, les contrôles suivants ont été exécutés sur le dépôt et sa base locale :

| Vérification | Résultat |
|---|---|
| FastAPI | 47 / 47 tests passent |
| Node.js sans DB | 16 passent ; le test RLS est exécuté séparément avec PostgreSQL |
| PostgreSQL / RLS | 1 / 1 passe, sur le rôle applicatif restreint, avec témoins citoyens, naissances et CIN |
| Next.js | 10 / 10 tests ; `tsc --noEmit` et `next build` réussis |
| Prisma | Client généré, schéma validé ; aucune migration en attente |
| Scripts et Compose | Syntaxe PowerShell/Python et configuration Compose valides |
| Initialisation et relance | Les deux scripts passent ; la relance tourne sans build, migration ni seed |
| Recette HTTP/PDF | Connexion, tableaux de bord, listes, demandes, archives, rapports et PDF valides dans les trois communes ; 12 CIN attendus, cinq statuts, aucun doublon |
| Données préexistantes | 12 citoyens, 12 naissances et 32 liens de permissions conservés ; 2 dossiers CIN existants conservés, puis 12 dossiers fictifs ajoutés |
| `.env.demo.maire` | Empreinte SHA-256 identique avant et après l'initialisation |
| Contrôle visuel interactif | Connexion testée à 1366 × 768, 768 × 1024 et 390 × 844, sans débordement horizontal ; écrans authentifiés à vérifier manuellement sur le poste de présentation |

Une sauvegarde PostgreSQL locale a été réalisée avant migrations/seed. Aucun `down -v` n'a été exécuté. La première tentative d'initialisation a révélé que Compose réutilisait une ancienne image data pour le seed ; `start_demo.ps1` a été corrigé pour construire les images des tâches de migration et de seed avant leur exécution, puis la recette complète a passé.

### Correctifs réalisés

- **P0 : seed CIN absent**. Ajout de 12 dossiers fictifs avec valeurs cohérentes : 6 pour le territoire historique et 3 dans chaque commune A et B. Les cinq statuts métier sont représentés. La création est idempotente et n'écrase pas les dossiers déjà suivis.
- **P0 : recette insuffisante**. Renforcement de `verify_demo.py` avec archives clôturées, PDF CIN de suivi + maquette, présence des dossiers CIN et vérification de l'isolation CIN A/B, en plus des tests naissances existants.
- **P0 : lancement sans verdict**. `start_demo.ps1` exécute dorénavant les recettes HTTP puis le test RLS avec rôle PostgreSQL restreint avant d'annoncer le succès.
- **P0 : redémarrage dangereux pour 09 h**. Ajout de `relaunch_demo.ps1` pour repartir sans compilation, migration ni seed, tout en vérifiant l'état des services.
- **P1 : cohérence seed naissances**. Alignement du statut initial de la déclaration et de son acte préchargé (une déclaration validée ne reste pas en `SUBMITTED`).
- **P1 : compatibilité Python Windows**. Le contrôle des dates de la recette utilise directement l'heure UTC+03 de Madagascar ; pas de dépendance Python `tzdata` sous Windows. Priorité au lanceur Windows `py`.
- **P1 : tests de non-régression**. Ajout de deux tests sans DB sur les dossiers CIN de démonstration.
- **P1 : confidentialité de la livraison**. La version redistribuable est nettoyée des sauvegardes, `.git`, fichiers `.env` et caches.

### Audit UI/UX

| Axe | Observation | Recommandation |
|---|---|---|
| Identité | Palette institutionnelle cohérente (marine, bleu, blanc) ; icônes Lucide réutilisées | **Conserver** la charte pour la présentation |
| Navigation | Sections Espace de travail, État civil, Dossiers et suivi, Pilotage ; menu accessible mobile | Montrer les 4 rubriques, sans promettre mariage/décès |
| Hiérarchie | En-têtes des listes, formulaires et cartes structurés | Éviter de surcharger de nouvelles cartes la veille |
| Desktop | Dans les **captures archivées**, la zone utile apparaît très étroite et laisse une grande surface vide | Contrôler en direct `1366×768` / `1440×900`, zoom 100 %, styles CSS chargés ; refaire les captures si le problème est réel |
| Mobile | JSX prévoit cartes sous `lg`, tables sur grand écran, menu dialog mobile | Tester 390 px et 768 px dans le navigateur réel |
| Accessibilité | Liens de saut, rôles ARIA, focus visible, erreurs en `role=alert`, support réduction du mouvement | Valider navigation clavier et contraste sur le projecteur |
| Feedback | État de chargement, erreurs et relance présents dans plusieurs écrans | Vérifier visuellement qu'une erreur de DB ne reste pas masquée |
| Métier | Filigranes PDF et messages « données fictives » visibles | Répéter la mention « spécimen » lors de l'ouverture des PDF |

**Lecture des captures :** celles archivées sous `docs/recette-visuelle/*-1440.png` ne suffisent pas à attester que la version actuelle est incorrecte : le JSX actuel prévoit un menu fixe à partir de `lg` et 4 indicateurs sur une ligne à partir de `xl`. Le décalage capture/source exige une recette visuelle **sur l'application compilée**, pas une refonte sur supposition.

### Points non résolus / risques résiduels

| Priorité | Risque / limite | Décision avant la présentation |
|---|---|---|
| **P0** | Démarrage complet Docker/PG/Prisma/Next non testé dans l'environnement d'audit initial | Résolu dans l'environnement d'intégration ; exécuter quand même sur le PC de présentation si différent |
| **P0** | Absence d'Internet pour télécharger les dépendances lors du premier build | Construire les images à l'avance ; utiliser `relaunch_demo.ps1` le matin |
| **P1** | Rendu des écrans authentifiés et résolution/projection du poste cible non observés dans un navigateur contrôlé | Ouvrir le tableau de bord et les modules sur le PC ; vérifier 1366 × 768 / 1440 × 900 et 390 px |
| P1 | Service Prisma ne dispose pas de `package-lock.json` | Générer/versionner un verrou de dépendances lors d'une prochaine itération connectée ; ne pas improviser une fausse lockfile |
| P1 | Aucun pipeline CI présent dans l'archive | Ajouter lint, build et tests conteneurisés avant une mise en production |
| P1 | Sauvegardes et secrets étaient inclus dans l'archive d'origine | Ne plus redistribuer les `.env*`, fichiers `.dump` et `.git` ; conserver les sauvegardes uniquement dans un espace sécurisé |
| P1 | Login démo local, cookies configurés pour HTTP localhost | Ne jamais exposer cette stack de démonstration sur Internet ou un réseau public |
| P2 | Mariage/décès non fonctionnels | Les annoncer explicitement comme modules futurs |
| P2 | Tests E2E navigateur (Playwright) absents | À prévoir après présentation, avec session et base de test isolées |

### À ne pas prétendre pendant la démonstration

- Que les documents générés sont des actes officiels ou de véritables CIN.
- Que la sécurité a été certifiée/auditée pour des données personnelles réelles.
- Que la migration PostgreSQL et le build Next.js ont été exécutés dans l'environnement d'audit présent.
- Que les modules Mariages / Décès sont déjà opérationnels.

### Préconisation générale

**Stabiliser et démontrer avant de redessiner.** La valeur de la présentation est d'expliquer le circuit agent → dossiers → suivi → documents fictifs → rapports → isolation multi-commune, pas d'ajouter une fonctionnalité risquée la veille.
