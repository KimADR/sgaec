# Guide de démonstration SGAEC

Ce guide lance une instance locale isolée avec son propre PostgreSQL et un volume Docker distinct. Il ne réutilise ni la base ni le réseau de `compose.yaml`. Les données de démonstration sont fictives ; ne saisissez aucune donnée personnelle réelle.

## Préparer l’environnement

Prérequis : Docker Desktop avec Docker Compose, PowerShell et une connexion Internet lors de la première construction.

Depuis `SGAEC_starter` :

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start_demo.ps1
```

Le script vérifie Docker et la configuration, crée `.env.demo.maire` uniquement
s'il est absent, applique les migrations et amorce les données fictives. Le
fichier `.env` et l'ancien `.env.demo` restent inchangés. Cette instance utilise
le projet et le volume Docker `sgaec-demo-maire`, distincts des volumes existants.
Le script ne réinitialise pas de base et ne supprime aucun volume. Pour préparer
les secrets séparément ou démarrer manuellement :

```powershell
py -3 .\scripts\prepare_demo.py --target .env.demo.maire
```

Le script génère des secrets distincts pour le propriétaire PostgreSQL et le rôle applicatif, et ne remplace jamais un fichier existant. Gardez `.env.demo.maire` privé : il est ignoré par Git.

Le compte amorcé par le seed est `demo.admin` (rôle **Administrateur communal**, affecté aux trois communes fictives A, B et à la commune historique de démonstration). Son mot de passe est la valeur locale de `BOOTSTRAP_ADMIN_PASSWORD` ; aucun mot de passe par défaut n’est fourni ni distribué.

## Construire et démarrer

Cette procédure utilise le volume propre `sgaec-demo-maire_demo_pgdata_restricted`. Elle ne réutilise ni ne supprime les autres volumes. L'initialisation du compte applicatif ne s'exécute que si ce volume est neuf. La migration explicite est destinée à cette base de démonstration isolée ; ne la lancez pas contre la base externe de `compose.yaml`.

```powershell
docker compose --env-file .env.demo.maire -f compose.demo.yaml build
docker compose --env-file .env.demo.maire -f compose.demo.yaml up -d postgres
docker compose --env-file .env.demo.maire -f compose.demo.yaml --profile maintenance run --rm migrate
docker compose --env-file .env.demo.maire -f compose.demo.yaml --profile maintenance run --rm seed
docker compose --env-file .env.demo.maire -f compose.demo.yaml up -d
docker compose --env-file .env.demo.maire -f compose.demo.yaml ps
py -3 .\scripts\verify_demo.py --env-file .env.demo.maire
```

Ouvrez `http://localhost:3000`, connectez-vous avec le compte `demo.admin` et le mot de passe défini localement. `migrate` et `seed` sont des commandes explicites ; ils ne sont pas exécutés au démarrage normal des services.

Les migrations s'exécutent avec le rôle propriétaire; le service data et le seed utilisent `sgaec_app`, sans privilèges de superutilisateur ni `BYPASSRLS`. Les services ne publient que l’interface et l’API sur `localhost`. PostgreSQL reste sur un réseau Docker interne. La base et le volume de démonstration persistent après `docker compose down` ; cette commande n’efface pas les données. N’utilisez pas `docker compose down -v`.

Le script `verify_demo.py` réalise une recette HTTP après connexion ; l'authentification, la déconnexion et l'aperçu PDF peuvent ajouter des événements techniques/audit. Ne l'exécutez que sur la base de démonstration isolée, jamais sur une base existante contenant des données à préserver.

## Scénario de présentation

1. **Accueil et accès** — afficher la vue d’ensemble, le profil et le sélecteur de commune ; choisir « Commune fictive A ». La sidebar conserve ses rubriques, son état actif et ses permissions.
2. **Citoyen** — rechercher le témoin `CITOYEN-FICTIF-A`, puis créer un citoyen dont les informations sont manifestement fictives.
3. **Naissance** — créer une déclaration fictive, l’instruire puis la valider avec les actions permises. Recharger la fiche pour montrer la persistance, puis prévisualiser et télécharger le PDF marqué **SPÉCIMEN**.
4. **CIN** — créer un dossier fictif ; déclarer une copie d’acte, un justificatif de domicile et au moins deux photos ; enregistrer les pièces ; passer le dossier en instruction puis le valider. Recharger la page et montrer l’historique.
5. **Rejet et clôture simulée** — sur des dossiers fictifs distincts, rejeter avec un motif explicite d’au moins cinq caractères et clôturer un dossier validé. La clôture est une simulation ; elle ne délivre aucun titre officiel.
6. **Périmètre communal** — sélectionner « Commune fictive B » et rechercher `CITOYEN-FICTIF-B`. Montrer que les dossiers de la commune A ne sont pas accessibles depuis B.
7. **Demandes, consultation et PDF** — comparer la file des dossiers actifs à la consultation des dossiers clôturés/rejetés ; exporter les PDF spécimens depuis la liste CIN ou Naissances. La consultation n’est pas un archivage réglementaire.

Pour montrer d’autres profils, créer des comptes fictifs par la page Administration avec les rôles **Agent de saisie**, **Validateur** et **Consultation**, puis se reconnecter sous chaque compte. Un agent de saisie ne doit pas voir les actions d’instruction ; un validateur peut instruire mais ne peut pas créer comme l’administrateur.

## Vérifications et limites

- Tests locaux : `npm test` dans `apps/data` et `apps/web`, `python -m pytest -q` dans `apps/api`, `npm run typecheck` et `npm run build` dans `apps/web`.
- Le test PostgreSQL multi-communes `npm run test:tenant` doit être exécuté avec une base migrée, les fixtures A/B présentes et un rôle PostgreSQL non-superutilisateur sans `BYPASSRLS`.
- Les PDF CIN et naissance sont des spécimens ; aucune pièce officielle ne peut être délivrée.
- La page Archives est une consultation numérique de dossiers terminaux. Le versement, la conservation et la destruction réglementaires ne sont pas implémentés.
- Les modules Mariages et Décès ne sont pas implémentés.
- La reconstruction initiale requiert l’accès aux images de conteneur et aux dépendances de paquets.
