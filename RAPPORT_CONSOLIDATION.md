# Rapport de consolidation SGAEC

**Date :** 9 novembre 2026
**Projet :** SGAEC Starter — démonstration isolée
**Périmètre :** vérifications sur les sources du projet et une base PostgreSQL Docker neuve dédiée à la recette. Aucune donnée ni base PostgreSQL existante n'a été réinitialisée.

## Résultat

Le workflow CIN demandé est déjà présent dans le projet principal : panneau d'instruction, mise à jour des pièces déclarées, transitions métier et historique. La comparaison avec `SGAEC_V2_Livraison_2026-11-09.zip` confirme que les fonctionnalités ciblées y existent également. Les différences observées portent sur le formatage et les ajustements d'interface ; le schéma Prisma et les permissions cin comparés sont identiques. Il n'était donc pas nécessaire de remplacer ni de recopier les services API ou data de la V2.

La page « Demandes » sélectionne les dossiers actifs et « Archives » consulte les statuts terminaux via le filtre `scope` côté API et interface. La page précise que cette consultation ne constitue pas un archivage réglementaire.

## Évolutions apportées

- `compose.demo.yaml` ajoute un démarrage autonome avec PostgreSQL 16 et un volume dédiés, séparés du Compose historique. L'API et le web sont publiés sur `127.0.0.1`; PostgreSQL n'expose aucun port hôte.
- `.env.demo.example` fournit une configuration sans secret réutilisable ; `.gitignore` autorise cet exemple mais continue d'ignorer `.env.demo`.
- `GUIDE_DEMONSTRATION.md` décrit la préparation, le démarrage, le compte fictif, les scénarios de démonstration et les limites fonctionnelles.
- `README.md` distingue le démarrage autonome du Compose existant.

Le mot de passe de `demo.admin` est défini localement dans `BOOTSTRAP_ADMIN_PASSWORD` de `.env.demo` ; aucun identifiant sensible ni mot de passe par défaut n'est inclus dans le dépôt ou le ZIP. Les utilisateurs et dossiers `QA-*` créés pour la recette sont confinés au volume isolé.

## Vérifications exécutées

| Vérification | Résultat |
|---|---|
| Tests API/FastAPI/PDF (`python -m pytest -q`) | **32 réussis** |
| Tests data (`npm test`) | **11 réussis, 1 ignoré** — contrôle RLS PostgreSQL réservé à un rôle de test non-superutilisateur |
| Tests frontend (`npm test`) | **10 réussis** |
| TypeScript (`npm run typecheck`) | **Réussi** |
| Build Next.js (`npm run build`) | **Réussi**, pages CIN dynamiques compilées |
| Prisma (`prisma validate`, `npm run db:generate`) | **Réussi** |
| Configuration Docker de démonstration | **Valide** |
| Migration et seed Prisma | **Réussis sur le volume neuf `sgaec-demo-isolated_demo_pgdata` seulement** |
| Services PostgreSQL, data, API et web | **Sains** après démarrage ; API `/health` et page `/connexion` répondent HTTP 200 |
| Naissance de recette | Création, instruction, validation, relecture après requête et PDF A4 `%PDF` vérifiés |
| CIN de recette | Pièces, instruction, validation, clôture simulée, relecture, historique et deux PDF `%PDF` vérifiés |
| Rejet CIN | Rejet avec motif requis vérifié |
| Permissions par rôle | `AGENT_SAISIE` : création permise, workflow refusé ; `VALIDATEUR` : workflow permis, création refusée ; `LECTURE_SEULE` : lecture permise, workflow refusé |
| Cloisonnement communal | Deux communes fictives ; accès à un dossier de l'autre commune refusé (404) et transition refusée |
| Filtres de demandes | Listes `active` et `closed` vérifiées sur les réponses API |
| Export | Archive ZIP vérifiée (`application/zip`, signature ZIP) |
| Inspection navigateur | Connexion affichée sur ordinateur et à 390 × 844 ; largeur de document 390 px, aucun débordement horizontal constaté |

Le contrôle automatisé RLS PostgreSQL n'a pas été exécuté : il requiert un rôle PostgreSQL sans privilèges superutilisateur et ne doit pas être lancé avec le compte propriétaire du conteneur. L'isolation applicative a, elle, été vérifiée via deux communes et plusieurs rôles réels de la base de recette.

L'inspection visuelle interactive authentifiée des pages internes et de la sidebar n'a pas été réalisée dans le navigateur intégré ; le rendu du formulaire de connexion a été observé sur ordinateur et mobile. Aucun parcours Playwright automatisé n'est présent dans les scripts du dépôt ; les parcours API ont été exercés contre les services isolés démarrés.

## Limites fonctionnelles confirmées

- La clôture CIN est une simulation et ne délivre aucun document officiel.
- Les pièces sont déclaratives ; aucun document réel n'est téléversé.
- « Archives » est un espace de consultation : versement, conservation et destruction réglementaires ne sont pas implémentés.
- Les modules Mariages et Décès restent à développer.
- La démonstration suppose Docker Desktop et un accès réseau au premier téléchargement des images et dépendances.

## Démarrage de démonstration

Suivre [GUIDE_DEMONSTRATION.md](./GUIDE_DEMONSTRATION.md). Le point d'entrée après démarrage est `http://localhost:3000`; le compte fictif est `demo.admin`, avec le mot de passe choisi localement dans `.env.demo`.

## Addendum — intégration ciblée de livraison

Les éléments ci-dessous ont été intégrés après les vérifications datées du 9 novembre ; ces vérifications antérieures ne valent pas validation de ces changements :

- Les portées territoriales sont maintenant calculées par permission et centre, puis intersectées pour les ressources qui exigent plusieurs permissions.
- Les transitions de naissance utilisent une mise à jour conditionnelle du statut et de `updatedAt`; une concurrence est renvoyée en HTTP 409.
- Le Compose isolé utilise un volume neuf `sgaec-demo-isolated_demo_pgdata_restricted`, un rôle PostgreSQL propriétaire pour les migrations et le seed, et `sgaec_app` sans superprivilèges pour le service data.
- Les tests PostgreSQL différés chargent Prisma uniquement lorsqu'ils sont activés. Les scripts de préparation des secrets et de smoke test HTTP sont documentés dans le guide.

Vérifications exécutées sur cette intégration : `npm test` dans `apps/data` (**14 réussis, 1 ignoré**), contrôles de syntaxe JavaScript et Python, et `docker compose ... config --quiet` (**réussi**). Le test ignoré est le contrôle RLS qui nécessite une base PostgreSQL de recette et un rôle non-superutilisateur.

**Non exécutés pour préserver les données existantes :** démarrage Docker, migration, seed, test RLS PostgreSQL et recette HTTP. Le nouveau volume isolé n'a pas été créé ni démarré ; le volume historique et les fichiers `.env` locaux n'ont pas été modifiés. Le `DATABASE_URL` applicatif doit viser `sgaec_app`; les migrations restent réservées au rôle propriétaire et uniquement à la base de démonstration isolée.
