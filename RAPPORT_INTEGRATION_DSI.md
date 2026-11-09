# Rapport d’intégration de la version DSI

## Objectif et méthode

La livraison `SGAEC_Version_DSI_2026-11-09` a été comparée au projet actif à partir de `CHANGEMENTS_DSI.txt`, `DESIGN_SYSTEM.md`, `README.md`, de l’audit, de la recette et des sources concernées dans `apps/web/`, `apps/api/`, `apps/data/` et `compose.yaml`.

Les éléments déjà présents dans le projet actif ont été conservés. Les améliorations pertinentes absentes ont été intégrées aux fichiers existants, sans remplacement global de fichiers ni changement de schéma Prisma. Le projet comportait déjà des modifications locales non enregistrées : elles ont été préservées. Un point de restauration Git est disponible sur `backup/pre-dsi-integration-2026-11-08`, et le diff de travail initial a été conservé dans `files/pre-dsi-integration.patch` de l’espace de session Copilot.

## Corrections intégrées

### Accès et périmètre territorial

- Les permissions utilisées par FastAPI sont maintenant celles de la commune active, et non l’union des permissions de toutes les communes affectées.
- Une session ancienne qui ne contient pas les permissions par commune est refusée pour renouvellement de session ; l’agent doit se reconnecter.
- La réponse de connexion du service de données expose les permissions associées à chaque commune.
- Le lieu des naissances est rattaché à la commune, et non au centre d’état civil.
- Les contrôles d’accès API restent la protection effective ; les contrôles d’interface complètent l’expérience et ne s’y substituent pas.

### Interface, navigation et listes

- La navigation affiche la commune et les rôles actifs, filtre les modules selon les droits et identifie les modules non disponibles.
- Le menu mobile gère l’ouverture, la fermeture avec Échap ou clic extérieur, ainsi que le retour du focus.
- Le composant partagé [Pagination](./apps/web/components/Pagination.tsx) permet les tailles 5, 10, 25 et 50, une navigation numérotée et l’affichage de la plage de résultats.
- Les listes Citoyens, Naissances, CIN et Demandes utilisent la pagination, la recherche différée et des états de chargement, erreur, reprise et liste vide. Les réponses périmées ne doivent pas écraser les résultats d’une recherche plus récente.
- L’accueil et les actions de création sont filtrés selon les habilitations. Les états de chargement du tableau de bord sont annulés proprement au démontage.

### Formulaires, workflow et PDF

- Les formulaires de naissance et CIN ne préremplissent plus de localités géographiques en dur ; la commune active est utilisée pour le dossier de naissance.
- Le panneau de workflow de naissance n’affiche que les transitions permises par le profil.
- L’aperçu PDF partagé vérifie l’autorisation `documents:preview`, présente un refus explicite et adapte la hauteur à l’écran. Les PDF restent des spécimens non officiels.
- Les PDF de naissance et de suivi CIN présentent une référence dans un encadré dédié, puis répartissent les champs en sections thématiques afin d’améliorer la lecture. Les pages conservent le filigrane « SPÉCIMEN » et les mentions interdisant toute valeur officielle ; la fiche CIN précise qu’elle ne constitue pas une pièce d’identité.
- Les formulaires et pages de détail affichent les états d’accès et les actions correspondantes aux droits de l’utilisateur.

### Build et documentation

- Le Dockerfile frontend installe les dépendances depuis le lockfile avec `npm ci`.
- `README.md` et `DESIGN_SYSTEM.md` décrivent les permissions par commune, la pagination et le workflow de démonstration.
- Pendant la recette, l’export CSV n’a pas déclenché de téléchargement observable dans le navigateur intégré. Le lien blob est maintenant ajouté au document avant son clic, puis retiré ; le handler retesté crée un blob CSV et clique un lien `download` connecté au document.
- Aucun changement n’a été apporté à `compose.yaml`, au réseau Docker externe, aux secrets, au schéma Prisma ou aux données PostgreSQL.
- Aucune migration, aucun seed, aucun reset et aucune commande `docker compose down -v` n’ont été exécutés.

## Compatibilité et arbitrages

- Le projet actif contenait déjà des changements plus récents ou spécifiques, notamment sur le cloisonnement multi-communes, les PDF spécimens, les rapports et la conservation des fiches citoyen. Ils ont été conservés plutôt que remplacés par la copie DSI.
- La version DSI retire le refus explicite d’accès lorsqu’une fiche citoyen est déjà en mode édition alors que le droit de gestion n’est plus présent. Le garde d’accès du projet actif a été conservé.
- Le changement de format des permissions rend les anciens jetons incompatibles : une reconnexion renouvelle la session avec les droits de la commune active.

## Principaux fichiers concernés

- API et données : `apps/api/app/main.py`, `apps/api/app/pdf.py`, `apps/api/tests/test_auth.py`, `apps/data/src/index.mjs`.
- Accès et composants communs : `apps/web/components/AccessContext.tsx`, `AccessDenied.tsx`, `Shell.tsx`, `Pagination.tsx`, `BirthWorkflowPanel.tsx`, `PdfDocumentViewer.tsx`.
- Pages et formulaires : `apps/web/app/page.tsx`, `apps/web/app/naissances/`, `apps/web/app/citoyens/`, `apps/web/app/cin/`, `apps/web/app/demandes/`, `BirthForm.tsx`, `CinForm.tsx`.
- Installation et documentation : `apps/web/Dockerfile`, `README.md`, `DESIGN_SYSTEM.md`, le présent rapport.

La liste des changements inclut aussi des travaux antérieurs déjà présents dans l’arbre de travail avant cette intégration. Le rapport distingue les améliorations DSI intégrées des éléments conservés et ne présente pas l’ensemble des modifications Git comme ayant été créées par cette seule opération.

## Vérifications exécutées

| Vérification | Résultat |
|---|---|
| `npm ci --no-audit --no-fund` dans `apps/web` | Réussi |
| `npm run typecheck` dans `apps/web` | Réussi |
| `npm run test` dans `apps/web` | 9 réussis, 0 échec |
| `npm run build` dans `apps/web` | Réussi ; routes Next.js compilées |
| `PYTHONPATH=apps\api python -m pytest -q apps\api\tests` | 23 réussis ; relancés après la mise en page PDF |
| `node --check src\index.mjs` dans `apps/data` | Réussi |
| `npm test` dans `apps/data` | 6 réussis, 0 échec, 1 ignoré |
| `docker compose config --quiet` | Réussi |
| `docker compose build web api data` | Réussi |
| Vérification navigateur à 390 px avec API synthétique | Pagination 5 lignes et passage à la page 2 vérifiés ; menu Échap, restitution du focus et absence de débordement horizontal vérifiés |
| Démarrage réel `docker compose up -d web api data` | Réussi ; API et données saines, frontend démarré ; PostgreSQL existant sain |
| HTTP via l’application | `/health` API et `/connexion` frontend : HTTP 200 |
| Authentification réelle via le proxy Next.js avec les paramètres locaux | Réussie ; session reconnue, 3 communes accessibles |
| API authentifiée : tableau de bord, citoyens, naissances, CIN, demandes et rapports | HTTP 200 sur les routes testées |
| Recherche, filtre et pagination API réels | Recherche par référence : 1 résultat ; filtre `REGISTERED` cohérent ; pagination 5/3 sur 8 résultats, pages distinctes |
| Consultation d’un acte et d’un dossier CIN | HTTP 200 |
| PDF spécimens naissance et CIN | HTTP 200, `application/pdf`, signature `%PDF` présente |
| Rendu PDF dans le lecteur navigateur | Naissance et CIN inspectés visuellement après reconstruction ; référence encadrée, sections lisibles, avertissement CIN et filigrane visibles |
| Export ZIP de spécimens | HTTP 200, archive lisible : 11 entrées, 10 PDF valides et fichier LIRE-MOI |
| Isolation entre deux communes autorisées | Consultation d’un acte de l’autre commune : HTTP 404 attendu |
| Protections négatives | Sans session : HTTP 401 ; requête mutante sans marqueur CSRF : HTTP 403 ; charge invalide : HTTP 422 |
| Navigateur réel, connexion et protection des routes | Affichage mobile 390 px et desktop 1440 px sans débordement ; bascule du mot de passe fonctionnelle ; route Naissances redirigée vers la connexion sans session |
| Navigateur authentifié | Naissances, Citoyens (8 fiches), CIN (2 dossiers), Demandes et Archives (10 dossiers), Rapports (8 naissances + 2 CIN) affichés sans erreur |
| Formulaire naissance et workflow | Validation obligatoire observée ; parcours des trois étapes et aperçu de confirmation testés sans envoyer le dossier ; les actions autorisées activent/désactivent la confirmation |
| Aperçu PDF | PDF naissance et CIN chargés dans l’iframe ; actions Imprimer/Télécharger activées |
| Texte des PDF extraits | Les deux PDF contiennent `SPÉCIMEN — SANS VALEUR OFFICIELLE` |
| Export CSV | Blob `text/csv` (330 octets observés) et clic du lien de téléchargement connecté au document ; le navigateur intégré n’a pas remonté d’objet de téléchargement |
| Construction des images Docker | `web`, `api` et `data` construites avec succès |

La recette authentifiée a utilisé le compte déjà configuré localement, sans révéler ses identifiants. Les routes et documents ont été consultés en lecture seule. Aucune création ou transition de dossier n’a été envoyée et aucune donnée n’a été modifiée. Le test PostgreSQL RLS reste ignoré par défaut ; il nécessite `SGAEC_RUN_TENANT_TESTS=1` et un `DATABASE_URL` vers la base migrée, avec un rôle non-superutilisateur.

## Écarts et limites connus

- Les jetons créés avant l’ajout des permissions par commune doivent être renouvelés par une reconnexion.
- La création d’un acte et les transitions réussies `REGISTERED → IN_REVIEW → VALIDATED` ne sont pas validées de bout en bout : elles écrivent durablement dans PostgreSQL. Aucun dossier de recette n’a été ajouté faute de confirmation explicite pour cette écriture.
- Le navigateur intégré ne fournit pas d’objet `Download` pour le bouton CSV, malgré la génération du blob et le clic du lien ; vérifier manuellement que le fichier est présent dans le dossier Téléchargements.
- Les mises en page des PDF de naissance et CIN ont été inspectées visuellement dans le lecteur navigateur. Vérifier encore le rendu imprimé sur papier et les réglages d’impression avant la démonstration.
- Le sélecteur de commune n’a pas été validé dans le navigateur lors de cette session ; son isolation a été vérifiée via les requêtes API authentifiées.
- Le test d’isolation RLS reste à exécuter contre la base migrée, avec les variables et le rôle appropriés.
- Le projet reste un prototype de démonstration : il n’est ni homologué ni autorisé à produire des documents officiels ou à traiter des données personnelles réelles.

## Résultats de la recette réelle du 8 novembre 2026

L’application a été construite puis laissée démarrée pour la suite de la démonstration. À la suite du test d’export, le frontend a été corrigé puis reconstruit/redémarré seul ; `web`, `api` et `data` sont actifs, `api` et `data` sains selon Docker. Le conteneur PostgreSQL existant est resté sain et n’a été ni redémarré ni modifié.

La mise en page PDF a ensuite été améliorée et vérifiée : l’API a été reconstruite et redémarrée seule, les 23 tests backend passent, et l’endpoint de santé renvoie HTTP 200. Les rendus naissance et CIN ont été ouverts dans le navigateur ; l’impression physique reste à contrôler manuellement.

Le compte local dispose du rôle `COMMUNE_ADMIN` sur les trois communes présentées en démonstration. Les listes de naissances sont isolées : 8 dossiers historiques, 2 dans la commune fictive A et 1 dans la commune fictive B. La lecture d’un identifiant connu depuis une autre commune autorisée renvoie bien 404. La ligne de journal `Acte introuvable` correspond à ce test d’isolation attendu ; aucun plantage applicatif n’a été observé.

Les services exposés localement :

- Frontend : <http://localhost:3000/connexion>
- API et OpenAPI : <http://localhost:8000/docs>
- Santé API : <http://localhost:8000/health>

Le parcours navigateur a confirmé la validation des champs obligatoires du formulaire naissance, l’accès aux trois étapes, les options de traitement autorisées pour un acte enregistré et l’activation/désactivation du bouton de transition. Ni l’enregistrement ni la transition n’ont été confirmés afin de ne pas ajouter ou modifier des données persistées.

## Démarrage local pour la recette

Depuis la racine `SGAEC_starter`, après vérification de l’état PostgreSQL, du réseau externe et de la configuration locale existante dans `.env` :

```powershell
docker compose ps
docker compose up -d data api web
docker compose ps
```

Cette commande ne sélectionne ni ne lance les profils `maintenance` `migrate` ou `seed`. Ne pas exécuter de migration ou de seed sans inspection préalable de la base et sauvegarde vérifiée.

- Interface : <http://localhost:3000/connexion>
- Documentation FastAPI : <http://localhost:8000/docs>
- Santé FastAPI : <http://localhost:8000/health>

Les identifiants de démonstration doivent être récupérés localement depuis la configuration prévue ; aucun secret ou mot de passe n’est inscrit dans ce rapport.

## Vérifications manuelles restantes avant la présentation

1. Vérifier depuis le navigateur que le CSV apparaît bien dans Téléchargements ; le navigateur intégré n’a pas émis d’événement `Download`.
2. Tester manuellement l’impression des PDF de démonstration et confirmer que les mentions **SPÉCIMEN — SANS VALEUR OFFICIELLE** restent lisibles sur le rendu papier.
3. Vérifier le changement de commune avec le sélecteur d’interface ; l’isolement a été établi via l’API, mais le rechargement du sélecteur n’a pas été validé visuellement.
4. Après confirmation qu’une écriture fictive supplémentaire est acceptable, créer un dossier marqué « recette » dans une commune fictive, vérifier ses détails et le faire passer par `IN_REVIEW` puis `VALIDATED`. Ne pas utiliser de données réelles. Aucun dossier n’a été créé pendant la présente recette.
5. Exécuter le test PostgreSQL RLS uniquement avec `SGAEC_RUN_TENANT_TESTS=1` et une configuration autorisée utilisant un rôle non-superutilisateur.
