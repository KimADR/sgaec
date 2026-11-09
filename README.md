# SGAEC — Prototype Next.js + Tailwind CSS + FastAPI + Prisma ORM + PostgreSQL + Docker

> Compte rendu de la comparaison avec la livraison DSI : [RAPPORT_INTEGRATION_DSI.md](RAPPORT_INTEGRATION_DSI.md).

Application de démonstration inspirée de la maquette fournie, pour les démarches d'état civil de l'Arrondissement II à Antananarivo.

**Important : ce dépôt reste un prototype pédagogique. Il contient maintenant des comptes persistés, des rôles et un cloisonnement multi-communes, mais n'est pas certifié pour traiter des données personnelles réelles ni pour délivrer des documents officiels.**

## Modules implémentés

- **Accueil** : indicateurs des dossiers actifs et demandes récentes, filtrés selon les habilitations de l'utilisateur et le périmètre communal.
- **Naissances** : recherche et filtre de statut avec pagination serveur réglable (5/10/25/50), enregistrement guidé en trois étapes et transitions disponibles selon le rôle de la commune active. L'aperçu affiche le PDF A4 **SPÉCIMEN** réellement produit par l'API ; le téléchargement et l'impression portent sur le même fichier.
- **CIN** : liste paginée avec recherche et filtre de statut, workflow Enregistré → En instruction → Validé → Clôturé (simulation), rejet motivé, contrôle et correction des pièces déclarées, journal horodaté des opérations et deux aperçus PDF marqués **SPECIMEN**. Les transitions et exports restent soumis aux permissions et au périmètre territorial.
- **Citoyens** : répertoire multi-communes paginé avec recherche, fiches, création, modification et archivage non destructif ; les actes associés restent consultables et inchangés.
- **Demandes** : recherche consolidée paginée (5/10/25/50) des dossiers actifs Naissances et CIN accessibles, avec filtres et export CSV de la page en cours, protégé contre l'injection de formules tableur.
- **Archives numériques consultables** : recherche paginée des dossiers clôturés ou rejetés accessibles. Le versement et la conservation réglementaires ne sont pas implémentés.
- **Rapports** : volumes agrégés réels par période, type et statut, limités à la commune et au périmètre d’affectation ; export CSV sans données nominatives et marqué démonstration.
- **Administration** : création et consultation de comptes d’agents fictifs, avec rôles et centres limités à la commune active ; l’administration complète des permissions et de l’audit reste à développer.
- **Mariages et Décès** : réservés aux phases ultérieures, sans faux fonctionnement.

## Architecture

```text
Navigateur
   |
   v
Next.js 16 + React 19 + Tailwind CSS 4 (apps/web, port localhost:3000)
   |  proxy /backend/*
   v
FastAPI (apps/api, port localhost:8000)
   |  HTTP /internal/* + X-Internal-Token
   v
Service Node / Express + Prisma 7 (apps/data, non exposé)
   |
   v
PostgreSQL 16 existant (conteneur `sgaec-v3-postgres-1`)
```

Tailwind CSS 4 est configuré via PostCSS et le thème de couleurs est défini dans
`apps/web/app/globals.css`. Toutes les routes de l'interface et les composants partagés
utilisent désormais les utilitaires Tailwind. Les listes de dossiers sont présentées
sous forme de cartes responsive ; le tableau des rapports reste tabulaire car il
représente des agrégats et comporte des en-têtes accessibles.

Prisma ORM est utilisé dans le service JavaScript interne car il n'est pas un ORM Python pour FastAPI. FastAPI centralise les règles de validation et la génération PDF. Le service Prisma ne doit pas être exposé directement au public.

Les permissions de chaque commune sont transmises séparément au frontend et vérifiées côté FastAPI dans le périmètre sélectionné, puis à nouveau par le service de données. Après cette mise à jour, les anciens jetons sans permissions par commune doivent être renouvelés à la reconnexion.

Pour un système moins complexe avec une seule API, une autre option serait d'utiliser SQLAlchemy avec FastAPI à la place de Prisma ; ce prototype conserve **les technologies demandées**.

## Références documentaires

Le workspace contient `apps/api/app/assets/cin_specimen_demo.jpg`, une illustration de maquette marquée **SPECIMEN** sans valeur officielle, ainsi que la fiche de suivi A4. La maquette ne renseigne ni numéro national, ni photographie, ni signature, empreinte ou donnée de délivrance. Les deux PDF sont des documents de démonstration et ne doivent être générés qu'avec des dossiers fictifs. Le modèle mariage/décès reste en attente des images sources et d'une validation juridique.

## Démarrage avec Docker Desktop

**Prérequis :** Docker Desktop / Docker Engine avec plugin Docker Compose, connexion Internet pour télécharger les images et dépendances au premier lancement. Le Compose de ce projet réutilise le conteneur PostgreSQL existant `sgaec-v3-postgres-1` sur le réseau externe `sgaec-v3_default` ; il ne crée ni serveur PostgreSQL ni volume.

Pour une démonstration autonome et isolée, sans réutiliser cette base, suivre le [guide de démonstration](GUIDE_DEMONSTRATION.md) et utiliser `compose.demo.yaml`.

À partir du dossier `SGAEC_starter` :

```bash
cp .env.example .env
```

Sur Windows PowerShell, à la place de cette commande :

```powershell
Copy-Item .env.example .env
```

Dans `.env`, configurer `DATABASE_URL` avec les identifiants locaux existants et générer une valeur aléatoire longue pour `INTERNAL_API_TOKEN` (au moins 20 caractères). Encoder les caractères spéciaux du mot de passe dans l'URL. Sur la machine de développement initiale, `.env` a été configuré depuis les variables du conteneur PostgreSQL ; il ne faut pas partager ce fichier.

Configurer également `INTERNAL_API_TOKEN`, `JWT_SECRET` (au moins 32 octets aléatoires), `BOOTSTRAP_ADMIN_USERNAME` et `BOOTSTRAP_ADMIN_PASSWORD` (au moins 16 caractères). Ces secrets restent dans `.env`, ignoré par Git. Le bootstrap crée un compte persistant dans PostgreSQL ; les connexions suivantes vérifient son mot de passe haché. Les jetons JWT expirent après 30 minutes et sont transportés dans un cookie `HttpOnly`, `SameSite=Strict`, avec protection CSRF sur les requêtes mutantes. Pour un déploiement HTTPS, définir `AUTH_COOKIE_SECURE=true` et ajuster `WEB_ORIGIN`.

Le prototype se connecte à la base `sgaec`, avec le rôle `postgres`, dans le schéma isolé `sgaec`. Avant toute migration, identifier le conteneur, le volume, la base, le rôle et le schéma réels. Ne pas supposer que la configuration décrite ci-dessus correspond encore à l'état courant. La sauvegarde historique `backups/sgaec_demo_pre_starter_20261105.dump` ne remplace pas un dump frais de `sgaec`.

Avant le premier démarrage, vérifiez l'état Docker et PostgreSQL en lecture seule :

```powershell
docker ps -a
docker volume inspect sgaec-v3_pg_data
docker network inspect sgaec-v3_default
docker exec <conteneur-postgres> psql -U postgres -d postgres -c "SELECT datname FROM pg_database WHERE datname = 'sgaec';"
```

Si `sgaec` existe, contrôler son schéma et ses migrations avant toute modification. Faire un nouveau dump au moyen de `pg_dump -Fc -U postgres -d sgaec`, vérifier le fichier avec `pg_restore --list` et conserver cette sauvegarde hors du répertoire public. Ne jamais supprimer ni recréer le volume, la base ou les données.

Les migrations ne sont **pas** exécutées au démarrage normal. Après inspection et sauvegarde vérifiée, examiner `apps/data/prisma/migrations/20261106000000_multi_tenant_foundation/migration.sql`, puis lancer explicitement :

```bash
docker compose build
docker compose --profile maintenance run --rm migrate
```

Le 6 novembre 2026, l'audit a confirmé PostgreSQL 16 dans le conteneur `sgaec-v3-postgres-1`, sur `sgaec-v3_pg_data` et `sgaec-v3_default`. La base `sgaec`, le schéma `sgaec` et le rôle de connexion `postgres` ont été identifiés. Avant migration, le schéma contenait les 8 lignes `BirthRecord`, 2 lignes `CinApplication`, 0 `AuditEvent` et une migration Prisma initiale.

Un dump pré-migration vérifié est conservé dans `backups/sgaec_pre_multitenant_20261106T155430Z.dump` (format PostgreSQL custom ; 22 entrées lisibles par `pg_restore --list`). La migration `20261106000000_multi_tenant_foundation` a ensuite été appliquée explicitement avec succès. Les 8 naissances et 2 dossiers CIN ont été conservés et rattachés au tenant historique de démonstration ; les communes A et B sont fictives.

Après migration, amorcer les rôles, le compte bootstrap et les données de démonstration :

```powershell
docker compose --profile maintenance run --rm seed
docker compose up --build -d
```

Le compte de connexion utilise `BOOTSTRAP_ADMIN_USERNAME` et `BOOTSTRAP_ADMIN_PASSWORD` de `.env` ; pour compatibilité avec le `.env` initial, le seed utilise aussi `AUTH_USERNAME` et `AUTH_PASSWORD` s'ils sont définis et que les variables bootstrap sont absentes. Toutes les routes `/api/v1` sauf la connexion exigent un JWT valide ; `/health` reste public pour le contrôle de santé. Le seed est idempotent pour ses comptes, rôles et données fictives.

L'interface de connexion est disponible sur http://localhost:3000/connexion. Les opérations territoriales utilisent la commune sélectionnée et le service Prisma revérifie l'affectation active. Les utilisateurs limités à un centre ne voient pas les dossiers des autres centres de la commune.

## Résultats de l'intégration multi-communes (2026-11-06)

- Migration Prisma initiale et migration multi-tenant : appliquées.
- Seed : compte bootstrap, rôles, affectations et trois registres amorcés. La commune historique contient 8 naissances et 2 dossiers CIN ; chaque commune fictive contient une déclaration et un dossier de naissance de test.
- RLS : test PostgreSQL automatisé exécuté avec le rôle `postgres` non-superutilisateur — **1 réussi, 0 échoué**. Les 11 tables territoriales vérifiées ont RLS activé et forcé, avec une politique par table.
- API : connexion, indicateurs, listes, consultation inter-commune (404 attendu) vérifiés. Création d'une naissance fictive, transitions `IN_REVIEW` → `VALIDATED` → `ISSUED`, génération du PDF spécimen et indicateurs de délivrance vérifiés.
- Persistance : les services `data`, `api` et `web` ont été redémarrés sans redémarrer PostgreSQL ; les données et indicateurs attendus sont restés présents.
- Santé HTTP après redémarrage : `/health`, `/`, `/connexion` et `/administration` ont répondu 200.
- Le contrôle de schéma Prisma, le build Next.js et les 7 tests backend unitaires ont réussi avant l'intégration Docker.

Le test de persistance a redémarré les services applicatifs, pas le conteneur PostgreSQL. La persistance sur redémarrage du serveur PostgreSQL lui-même reste à valider séparément si nécessaire.

## Répertoire citoyen multi-communes (2026-11-06)

- Le modèle `Citizen` existant était déjà lié aux naissances. Le backfill précédent est vérifié : **11 fiches citoyen pour 11 actes, aucun acte sans fiche**.
- Une sauvegarde fraîche `backups/sgaec_pre_citizen_crud_20261106T193900.dump` (63 031 octets, format PostgreSQL custom, 145 entrées) a été validée avec `pg_restore --list` dans le conteneur PostgreSQL.
- La migration additive `20261106000100_citizen_lifecycle` ajoute l’état actif, un index de recherche et la permission `citizens:manage`. Elle n’efface ni ne recopie les dossiers existants.
- Le répertoire permet de rechercher, créer et consulter les citoyens, de modifier les champs d’identité et d’archiver une fiche. L’archivage logique conserve les actes et la fiche détaillée ; les opérations sensibles sont journalisées.
- Test manuel UI : recherche, création, modification et archivage d’un citoyen fictif de la commune B ; après archivage, il disparaît du répertoire et le compteur revient à 1 citoyen actif. Les trois opérations sont présentes dans l’audit.
- Test inter-commune : la commune A reçoit `404` pour la fiche de la commune B et ne trouve pas son nom dans la recherche. Le test automatisé PostgreSQL RLS passe (**1 réussi, 0 échoué**).
- Vérification après redémarrage de `data`, `api` et `web` (PostgreSQL non redémarré) : **12 fiches au total, 11 actives, 1 archivée, 11 actes, 0 acte sans fiche** ; l’archivage et les compteurs persistent.
- Validation : **10 tests backend réussis**, build/type-check Next.js réussi, génération Prisma réussie, services sains après redémarrage.

## Export des documents existants (2026-11-07)

- Le bouton **Exporter les PDF de la commune** présent dans les listes Naissances et CIN télécharge une archive ZIP avec un PDF par acte de naissance et une fiche CIN de démonstration par dossier de la commune active. Les fiches CIN emploient uniquement des données fictives.
- L'export est limité à la portée territoriale autorisée de l'utilisateur et journalisé dans `AuditEvent`. Pour exporter une autre commune, sélectionner cette commune dans l'en-tête puis lancer un nouvel export.
- Chaque page porte un filigrane **SPÉCIMEN — SANS VALEUR OFFICIELLE**, un pied de page et sa pagination. Les fiches CIN précisent également qu'elles ne constituent pas une pièce d'identité. La maquette CIN reprend une disposition et une palette inspirées de la référence, sans emblème ni dispositif de sécurité officiel.
- Les noms de fichiers reprennent les références de démonstration ; le ZIP contient également un fichier LIRE-MOI avec le nombre de documents exportés.

Pages disponibles :

- **Interface :** http://localhost:3000
- **Documentation interactive FastAPI :** http://localhost:8000/docs
- **Contrôle de santé FastAPI :** http://localhost:8000/health

Journalisation :

```bash
docker compose logs -f api data web
```

Arrêter sans supprimer les données :

```bash
docker compose down
```

`docker compose down` arrête uniquement les services du projet. Le conteneur PostgreSQL et son volume sont externes et restent inchangés. Ne pas supprimer ni réinitialiser ce volume.

## Endpoints FastAPI

| Méthode | Route | Description |
|---|---|---|
| POST | `/api/v1/auth/login` | Ouvrir une session et recevoir un cookie JWT HttpOnly |
| GET | `/api/v1/auth/me` | Vérifier la session |
| POST | `/api/v1/auth/logout` | Fermer la session |
| GET | `/api/v1/users` | Lister les utilisateurs dans la portée autorisée |
| GET | `/api/v1/user-options` | Lister les rôles et centres affectables |
| POST | `/api/v1/users` | Créer un utilisateur territorial (permission `users:manage`) |
| GET | `/api/v1/dashboard` | Indicateurs et demandes récentes (JWT requis) |
| GET | `/api/v1/reports?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD` | Agrégats naissance/CIN sur 366 jours maximum, selon la portée territoriale |
| GET | `/api/v1/requests?q=&type=&status=&scope={active,closed,all}&page=&page_size=` | Recherche consolidée paginée, avec séparation des dossiers actifs et clôturés |
| GET | `/api/v1/citizens?q=` | Rechercher les citoyens actifs dans la commune |
| POST | `/api/v1/citizens` | Créer une fiche citoyen (permission `citizens:manage`) |
| GET | `/api/v1/citizens/{id}` | Consulter une fiche et ses actes liés |
| PUT | `/api/v1/citizens/{id}` | Modifier l’identité (les actes restent inchangés) |
| DELETE | `/api/v1/citizens/{id}` | Archiver une fiche sans supprimer ses actes |
| GET | `/api/v1/documents/export.zip` | Exporter les PDF spécimens des naissances et dossiers CIN de la commune autorisée |
| GET | `/api/v1/births?q=&status=&page=&page_size=` | Rechercher les naissances avec pagination serveur |
| POST | `/api/v1/births` | Créer un acte de naissance de démonstration |
| GET | `/api/v1/births/{id}` | Consulter un acte |
| POST | `/api/v1/births/{id}/transition` | Instruire, valider, rejeter ou enregistrer une délivrance |
| GET | `/api/v1/births/{id}/specimen.pdf` | Export PDF A4 non officiel |
| GET | `/api/v1/cin?q=&status=&page=&page_size=` | Rechercher les demandes CIN avec pagination serveur |
| POST | `/api/v1/cin` | Créer un dossier CIN de démonstration |
| GET | `/api/v1/cin/{id}` | Consulter un dossier |
| PUT | `/api/v1/cin/{id}/evidence` | Corriger les pièces déclarées avant validation |
| POST | `/api/v1/cin/{id}/transition` | Instruire, valider, rejeter avec motif ou clôturer en simulation |
| GET | `/api/v1/cin/{id}/history` | Consulter le journal des changements et actions |

Les dossiers de naissance traversent les statuts de démonstration `REGISTERED`, `IN_REVIEW`, `VALIDATED`, `REJECTED` et `ISSUED`, avec permissions distinctes de workflow et de délivrance. Les déclarations sont conservées dans `BirthDeclaration`, le registre compétent est sélectionné depuis la commune autorisée, et les transitions sont journalisées. Une référence `*-DEMO-*` est produite automatiquement et ne correspond **pas** à un numéro officiel.

Les dossiers CIN n'acceptent la validation que si une copie d'acte, un justificatif de domicile et au moins deux photos sont déclarés. La permission `cin:workflow` gouverne l'instruction, la validation et le rejet ; `documents:deliver` gouverne la clôture simulée. La modification des pièces cesse après validation. Aucun de ces états ne constitue une délivrance de CIN officielle.

## Organisation des fichiers

```text
SGAEC_starter/
  compose.yaml              # Orchestration des quatre services
  .env.example              # Configuration locale à copier
  README.md
  docs/maquette-reference.jpg
  apps/
    web/                    # Next.js 16 App Router, interface en français
      app/                  # Pages et CSS
      components/           # Sidebar, formulaires, aperçus
      lib/                  # Types et API
      public/               # Visuel issu de la maquette fournie
    api/                    # FastAPI et ReportLab
      app/main.py           # API REST
      app/models.py         # Validations Pydantic
      app/pdf.py            # PDF A4 spécimen
    data/                   # Node.js / Express + Prisma ORM 7
      src/index.mjs         # Endpoints internes
      prisma/schema.prisma  # Schéma ORM
      prisma/migrations/    # Migration SQL initiale
      prisma/seed.mjs       # Jeux de données fictives
```

## Feuille de route avant toute utilisation réelle

1. **Authentification** : le prototype utilise des comptes persistés, des mots de passe hachés scrypt, des rôles et des JWT courts. MFA, révocation, récupération et gouvernance de rôles restent à concevoir avant production.
2. **Isolation des territoires** : les portées commune/centre sont contrôlées dans l'API et le service de données ; PostgreSQL RLS applique l'isolation par commune. Les tests d'intégration RLS ne sont concluants qu'après exécution contre PostgreSQL migré avec un rôle non-superutilisateur.
3. **Identités et traçabilité** : vrai modèle citoyen, déduplication contrôlée, journal d'audit avec agent authentifié, historique des corrections et conservation réglementée.
4. **Cycle de vie des actes** : brouillon, instruction, contrôle, validation, émission, annulation ; séparation des fonctions, signature et numérotation officielle après validation juridique.
5. **Protection des données** : TLS, chiffrement et sauvegardes, gestion des pièces, prévention de l'énumération des dossiers, limitation des recherches, journalisation sans données sensibles, politique de conservation et conformité au droit applicable à Madagascar.
6. **Documents officiels** : uniquement après vérification juridique et institutionnelle des modèles, signatures, sceaux, codes de vérification, habilitations et règles de délivrance. Le PDF présent est délibérément un spécimen non officiel.
7. **Qualité** : tests d'intégration, validation des migrations, supervision, protection CSRF/CORS, limitations de débit, exports, pagination, tests de restauration et revue de sécurité.

## Versions et vérification

Versions majeures déclarées : **Next.js 16**, **React 19**, **FastAPI 0.x récent**, **Prisma 7**, **PostgreSQL 16** (conteneur existant), **Node 24**, **Python 3.13**. Le choix de Prisma 7 permet de conserver le Client historique (`prisma-client-js`) et son adaptateur PostgreSQL ; la version 8 introduit une nouvelle API.

Le compte bootstrap attribue des affectations de démonstration aux communes fictives et au tenant historique. Les rôles restent des profils de démonstration, à valider avec les règles institutionnelles. Ce prototype reste réservé à un usage local. Ne pas y saisir de données personnelles réelles ni l'exposer sur Internet.

## Tests de validation hors Docker

```bash
cd apps/api
python -m pip install -r requirements.txt pytest
PYTHONPATH=. pytest -q
```

Sur PowerShell : `$env:PYTHONPATH = '.'; python -m pytest -q`. Pour vérifier Prisma et le client :

```powershell
cd apps/data
npx prisma validate
npm run db:generate
npm run test:tenant
```

Le test RLS est explicitement réservé à la base migrée de démonstration : définir `SGAEC_RUN_TENANT_TESTS=1` et un `DATABASE_URL` visant un rôle PostgreSQL non-superutilisateur. Il est ignoré autrement. Construire le frontend avec `cd apps/web; npm run build`. Ces tests unitaires ne remplacent pas un essai complet après audit et sauvegarde de la base réelle.
