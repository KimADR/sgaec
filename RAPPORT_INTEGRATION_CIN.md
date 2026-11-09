# Rapport d’intégration de la maquette CIN

**Date de validation :** 8 novembre 2026  
**Démonstration visée :** 9 novembre 2026 à 9 h  
**Décision : GO CONDITIONNEL**

## 1. Fichiers créés ou modifiés

- Ajout de `apps/api/app/cin_card.py` et `apps/api/app/assets/cin_specimen_demo.jpg`.
- Modification de `apps/api/app/main.py` pour exposer `GET /api/v1/cin/{case_id}/maquette.pdf`.
- Modification de `apps/web/app/cin/[id]/page.tsx` pour choisir entre maquette paysage et fiche A4.
- Modification de `apps/web/components/Shell.tsx` et `apps/web/app/globals.css` pour masquer la barre de défilement visuelle sans désactiver le défilement, élargir le menu de 272 à 300 px, aérer les rubriques et compacter les éléments sur les fenêtres de faible hauteur.
- Modification de `apps/web/components/Shell.tsx` à la demande de l’utilisateur pour retirer le pied de barre latérale « Commune active / Périmètre d’accès » ; le sélecteur de commune dans l’en-tête est conservé.
- Ajout de `apps/api/tests/test_cin_card.py` et extension de `apps/api/tests/test_auth.py`.
- Mise à jour de `README.md`.
- Création du présent rapport.

Le générateur A4 de `apps/api/app/pdf.py`, les rôles, les permissions, le schéma Prisma, PostgreSQL et les fichiers `.env` n’ont pas été modifiés. Aucune migration, réinitialisation, suppression de volume ou exécution de seed n’a eu lieu.

Le workspace avait déjà de nombreux changements locaux non liés avant l’intégration. Les fichiers cibles préexistants ont été sauvegardés avant modification dans :

`C:\Users\Kim\.copilot\session-state\70691055-d1cc-4f0a-ad4d-d28248116d86\files\cin-integration-baseline`

## 2. Changements réalisés

- L’API utilise le service documentaire existant (`/documents/cin/{case_id}`), qui vérifie `documents:preview` et `cin:read`, applique le périmètre commune/centre, journalise la consultation et répond 404 si le dossier n’est pas accessible.
- FastAPI exige aussi `cin:read` dans sa garde générale et vérifie explicitement `documents:preview` pour la nouvelle route. La route ne génère pas de PDF si le service renvoie un identifiant différent ou des champs obligatoires/date incomplets.
- Le PDF ReportLab est au format paysage et superpose les champs demandés sur l’illustration fournie. Le texte long est ajusté visuellement, les caractères non imprimables sont neutralisés pour le rendu et les données de base ne sont pas altérées.
- Le filigrane **SPECIMEN** demeure intégré au fond. Aucun numéro national, photographie réelle, empreinte, signature ou donnée de délivrance n’est généré.
- L’interface propose par défaut **Maquette CIN — visuel** et conserve **Fiche de suivi — A4**. L’aperçu, le téléchargement et l’impression passent par la visionneuse existante. Les réponses obsolètes au changement de dossier sont ignorées et l’ancien dossier est retiré pendant le chargement du nouveau.
- La maquette doit être utilisée exclusivement avec des dossiers fictifs de démonstration. Le mode applicatif reste limité à `APP_MODE=demo`.

## 3. Problèmes rencontrés et corrections

- Les fichiers de l’API et de l’interface étaient déjà modifiés localement. Les changements ont été fusionnés de manière ciblée ; les modifications préexistantes ont été conservées et sauvegardées.
- Le serveur Pylance n’était pas joignable. La syntaxe et les chemins d’exécution Python ont été vérifiés par la suite de tests réelle.
- Lors de la validation initiale, le moteur Docker Linux n’était pas disponible. Après son démarrage, seuls les services API, web et leur dépendance data ont été reconstruits/redémarrés ; les images et services ont ensuite passé leurs contrôles de démarrage. Aucun volume n’a été modifié.
- Les tests frontend affichent des avertissements Node existants sur le mode de module de fichiers TypeScript ; les tests, le typage et le build réussissent.

## 4. Tests réellement exécutés

| Vérification | Résultat |
|---|---|
| `python -m pytest -q` depuis `apps/api` | **29 réussis** |
| `npm test` depuis `apps/web` | **9 réussis** |
| `npm run typecheck` | **Réussi** |
| `npm run build` | **Réussi**, route CIN dynamique compilée |
| Génération PDF avec dossier entièrement fictif | **Réussie**, 1 page paysage, 1 262 062 octets |
| Extraction du texte du PDF avec pypdf | **9/9 champs fictifs retrouvés** |
| Tests API d’autorisation | **200, 401 et 403 vérifiés** |
| Test API dossier hors périmètre | **404 vérifié avec service simulé** |
| Dossier incomplet / identifiant incohérent | **422 / 502 vérifiés** |
| Tests du PDF A4 et de l’export existant | **Inclus dans les 29 tests Python, réussis** |
| `docker compose config --quiet` | **Réussi** |
| `docker compose build api web` | **Réussi**, images de l’API et du web reconstruites |
| `docker compose up -d api web` | **Réussi**, API et data sains, web démarré |
| `GET /` du web et `GET /health` de l’API | **HTTP 200** |
| Appels non authentifiés aux PDF maquette et A4 | **HTTP 401** chacun |
| Ouverture de `/connexion` dans le navigateur intégré | **Réussie**, formulaire de connexion et mention « données fictives » affichés |
| Parcours connecté sur `CIN-DEMO-2026-0001` | **Dossier affiché** et sélecteur visuel / A4 manipulé dans le navigateur |
| Récupération authentifiée des PDF maquette et A4 depuis l’interface | **HTTP 200** chacun, `application/pdf`, signatures `%PDF-` ; maquette 1 250 282 octets, A4 45 655 octets |
| Demande du même dossier depuis les deux autres communes auxquelles le compte a accès | **HTTP 404** chacune (vérification réelle contre les services en cours) |
| Menu latéral à 920 × 530 px, rubriques dépliées | **Toutes les rubriques tiennent sans défilement** (`scrollHeight=459`, `clientHeight=459`), aucune barre affichée ; bandeaux « Prototype de démonstration » et commune/périmètre retirés |
| `docker compose build web` et redémarrage du service web | **Réussis**, seul le web a été reconstruit/redémarré |
| TypeScript et build après l’ajustement d’espace du menu | **Réussis** (`npm run typecheck`, `npm run build`) |
| `docker compose build web` après l’ajustement et disponibilité de l’application | **Réussis** ; le service web redémarré et la page de connexion répond |
| Vérification visuelle du menu après le dernier redémarrage | **À refaire après reconnexion** : le rechargement du navigateur a redirigé vers `/connexion`, la session précédente n’étant plus active |
| Journaux de démarrage API / web | **Aucune erreur de démarrage observée** |
| Liste des volumes Docker avant/après démarrage | **Inchangée** |
| `git diff --check` sur les fichiers suivis modifiés | **Réussi** |

Le contrôle 404 et l’isolation ont d’abord été exercés avec un service simulé ; ils ont ensuite été confirmés en conditions réelles avec le dossier explicitement numéroté `CIN-DEMO-2026-0001` et les deux autres communes autorisées. Le téléchargement a été vérifié via les réponses PDF authentifiées ; le dialogue d’impression n’a pas été déclenché. La capture de l’iframe PDF dans le navigateur intégré reste grise malgré une réponse PDF valide et des boutons actifs : le rendu raster visuel dans cette visionneuse n’est donc pas confirmé par la capture.

## 5. Vérifications restant à faire

- Confirmer que le téléchargement déclenché depuis le bouton de la visionneuse a bien été enregistré sous le nom attendu sur la machine cible ; le clic a été testé, mais l’outil navigateur ne confirme pas le fichier enregistré.
- Vérifier visuellement le positionnement des champs avec un lecteur PDF sur la machine de démonstration : le moteur de capture du navigateur intégré n’a pas rendu l’iframe dans la capture, même si les PDF authentifiés sont retournés normalement.
- Essayer le bouton **Imprimer** depuis le navigateur sur la machine de démonstration ; le bouton est disponible, mais aucun dialogue d’impression n’a été ouvert pendant ces tests.
- Sur des fenêtres exceptionnellement plus basses que 530 px, confirmer au besoin le défilement tactile/clavier du menu (la barre reste masquée).

## 6. Procédure de démarrage

Depuis `SGAEC_starter`, sur la machine où Docker Desktop, le réseau externe et la base existante sont opérationnels :

```powershell
docker compose config --quiet
docker compose build api web
docker compose up -d api web
docker compose ps
docker compose logs --tail=100 api web
```

Ne pas lancer de migration ni de seed pour cette fonctionnalité. Ne pas exécuter `docker compose down -v`, supprimer de volume, réinitialiser PostgreSQL ou remplacer les fichiers `.env`. Vérifier que les services et le jeu de données sont exclusivement destinés à la démonstration fictive avant le parcours.

## 7. Conclusion

**GO CONDITIONNEL pour le 9 novembre 2026 à 9 h.** Les tests Python et frontend, le typage, le build Docker et Next.js, et la génération PDF sont validés. Le parcours authentifié avec le dossier de démonstration a confirmé les deux PDF (HTTP 200) et l’isolation réelle entre communes (HTTP 404). Les volumes n’ont pas changé. Il reste à confirmer le rendu visuel du PDF avec un lecteur PDF sur la machine cible et à essayer l’impression avant la présentation.
