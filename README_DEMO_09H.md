# SGAEC — démonstration du jeudi 12 novembre 2026 à 09 h (Antananarivo)

**Objet :** montrer un prototype de gestion administrative et d'état civil fonctionnant **uniquement sur des données fictives**. Il ne s'agit ni d'un service public mis en production, ni d'un système d'édition de pièces officielles. Les PDF sont des **SPECIMENS**.

## 1. Ce soir : initialiser et tester sur le PC de présentation

Conditions : **Windows 10/11**, **Docker Desktop démarré (moteur Linux/WSL2)**, **Python 3.10+**, accès Internet pour la **première construction** des images, ports **3000 et 8000** disponibles. Les fichiers sources sont à extraire dans un dossier local dont le chemin est simple (par exemple `C:\SGAEC-demo`). Éviter de lancer depuis un ZIP non extrait, OneDrive en cours de synchronisation ou un lecteur réseau.

Ouvrir **PowerShell** depuis le dossier `SGAEC_starter` :

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\start_demo.ps1
```

Ce script génère **localement** `.env.demo.maire` s'il n'existe pas, vérifie les paramètres, lance PostgreSQL, applique les migrations Prisma, installe les jeux de données fictives et démarre Next.js, FastAPI et le service de données. **Il effectue ensuite une recette HTTP** (connexion, liste, rapports, PDF naissance/CIN, archives, séparation des communes) ainsi que le **test PostgreSQL RLS**. Ne pas présenter une installation dont les tests finaux n'indiquent pas tous la réussite.

**Adresse :** <http://localhost:3000/connexion>
**Utilisateur :** `demo.admin`
**Mot de passe :** valeur de `BOOTSTRAP_ADMIN_PASSWORD` dans le fichier local `.env.demo.maire`. L'ouvrir **en privé**, jamais sur le vidéoprojecteur. Ne pas transmettre ce fichier ni le versionner.

> Cette archive corrigée **ne contient ni fichier de secrets, ni sauvegarde de base, ni historique Git**. Si vous avez déjà un `.env.demo.maire` valide, conservez-le dans le dossier de travail existant ; le nouveau ZIP ne doit pas remplacer ses secrets. Ne jamais copier les `.env` de l'archive d'origine dans un dépôt ou une présentation.

### Contrôles visuels manuels obligatoires

- Connexion avec `demo.admin` : aucune erreur ; menu latéral visible sur grand écran.
- Choisir dans le sélecteur de commune **Antananarivo II (démo)** si proposé (le libellé exact dépend de la base initialisée) ; à défaut montrer l'une des communes fictives A/B.
- Tableau de bord : compteurs non vides, listes de dossiers récents, typographie lisible sur la résolution du projecteur.
- Naissances : au moins un acte ; ouverture du détail ; affichage de son PDF **SPECIMEN**.
- CIN : dossiers préchargés ; aperçu **Maquette CIN — visuel**, puis **Fiche de suivi — A4** ; statuts variés.
- Demandes et archives : dossiers actifs et clôturés ; recherche, filtres et liens ouverts.
- Rapports : période incluant la date actuelle ; totaux, graphiques et export CSV.
- Changer de **Commune fictive A** à **Commune fictive B** ; les dossiers témoins A/B doivent rester séparés.
- Réduire la fenêtre à environ **390 px** pour contrôler le menu hamburger et l'absence de défilement horizontal global. Restaurer ensuite **1366 × 768 / 1440 × 900**.

## 2. Demain matin : relance sans reconstruire l'application

Ne pas déclencher une nouvelle compilation complète pendant la présentation. Laisser Docker Desktop démarrer, puis dans PowerShell :

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\relaunch_demo.ps1
```

Cette procédure conserve la base et ses données, **n'exécute ni migration ni seed et n'utilise pas `--build`**. Elle refait en revanche les vérifications HTTP/PDF et de séparation territoriale. Une première installation complète réussie la veille est indispensable.

L'application est **locale** : l'adresse `localhost` ne fonctionne que sur l'ordinateur où elle tourne. Prévoir le même PC pour la présentation, le chargeur et un navigateur déjà ouvert sur l'écran de connexion. Éviter les mises à jour de Docker, de Windows ou des dépendances juste avant 09 h.

## 3. Scénario de présentation de 8 à 10 minutes

| Durée | Écran | Démonstration et message métier |
|---|---|---|
| 0:00–1:00 | Connexion / commune | Contrôle d'accès et périmètre territorial, données fictives |
| 1:00–2:00 | Tableau de bord | Volumes, dossiers récents, indicateurs opérationnels |
| 2:00–3:00 | Citoyens / Naissances | Rechercher une personne, ouvrir un acte et sa fiche |
| 3:00–5:00 | Dossier CIN `CIN-DEMO-2026-0001` | Documents de suivi, circuit enregistré → instruction → validation |
| 5:00–6:00 | PDF spécimens | Aperçu du document naissance et de la maquette CIN, marquage non officiel |
| 6:00–7:00 | Demandes / Archives | Dossiers actifs versus clôturés, suivi des statuts |
| 7:00–8:30 | Rapports | Filtrage temporel, export CSV, suivi des volumes |
| 8:30–10:00 | Changement de commune | Cloisonnement A/B, rôles et habilitations ; limites du prototype |

**Important :** pour les actes et les dossiers CIN, présenter les actions possibles plutôt que de les exécuter toutes en direct si le temps manque. Si vous faites évoluer un dossier de `REGISTERED` à `VALIDATED`, les statuts sont persistants et les valeurs d'indicateurs évoluent : ce comportement est attendu.

## 4. Dépannage rapide

Afficher les conteneurs :

```powershell
docker compose --env-file .env.demo.maire -f compose.demo.yaml ps
```

Afficher les journaux pertinents :

```powershell
docker compose --env-file .env.demo.maire -f compose.demo.yaml logs --tail 100 postgres data api web
```

Relancer les vérifications sans modifier les dossiers :

```powershell
py -3 .\scripts\verify_demo.py --env-file .env.demo.maire
```

Tester l'isolation SQL dans le service de données :

```powershell
docker compose --env-file .env.demo.maire -f compose.demo.yaml exec -T data sh -c "SGAEC_RUN_TENANT_TESTS=1 node --test tests/tenant-isolation.test.mjs"
```

**Ne pas exécuter `docker compose down -v`**, qui supprimerait les données du volume. Si le navigateur affiche une page vide, vérifier d'abord les services puis recharger. Si les dossiers CIN sont absents, utiliser la procédure **complète** `start_demo.ps1` (qui rejoue le seed sans supprimer les enregistrements existants), pas une suppression de volume.

## 5. Présentation de secours si Docker ne démarre pas

Conserver à part les **documents témoins** déjà fournis : `docs/acte-naissance-specimen-final.pdf`, `docs/cin-specimen-preview.pdf`, les autres PDF du dossier `docs`, et les captures `docs/recette-visuelle/`. Ces supports peuvent illustrer les parcours, mais **ne prouvent pas une exécution en direct**. Présenter explicitement cette alternative comme une prévisualisation du prototype et éviter d'annoncer que les opérations sont démontrées si l'application ne répond pas.

---

**Limites déclarées :** mariages et décès restent « À venir » ; aucune CIN ni acte officiel n'est délivré par ce prototype ; les règles métier réelles, la conservation des documents et la sécurité de production nécessitent une validation institutionnelle.

## Contrôles de l'intégration du 11 novembre 2026

- `start_demo.ps1` et `relaunch_demo.ps1` ont été exécutés avec succès sur le projet existant. La relance ne construit pas d'image, ne migre pas et ne rejoue pas le seed.
- FastAPI : 47 tests ; données Node : 16 tests sans DB et test RLS PostgreSQL exécuté séparément ; utilitaires Next : 10 tests. TypeScript, build Next.js et validation Prisma réussis.
- Recette HTTP : connexion, tableau de bord, citoyens, naissances, CIN, demandes, archives, rapports et PDF naissance/CIN dans les trois communes. Les 12 dossiers CIN attendus et les cinq statuts sont contrôlés, sans doublons.
- Avant/après seed : citoyens 12, naissances 12, permissions 32 inchangés ; les 12 dossiers CIN fictifs ont été ajoutés aux 2 dossiers existants. `.env.demo.maire` et le volume PostgreSQL n'ont pas été remplacés ni supprimés ; une sauvegarde locale de la base a été conservée hors du dépôt.
- Le formulaire de connexion a été contrôlé dans le navigateur à 1366 × 768, 768 × 1024 et 390 × 844 : aucune largeur de document supérieure à la fenêtre. La validation visuelle des écrans authentifiés reste à faire sur le poste de présentation, selon la checklist ci-dessus.
