# Comparaison visuelle et redesign des actes de naissance

**Date :** 9 novembre 2026
**Périmètre :** rendu PDF des copies et extraits d'actes de naissance uniquement.

## Comparaison avec la photographie

La photo de référence présente un document imprimé formel : en-tête malgache centré, titre d'acte en style classique, références de registre compactes, texte dense, bordure fine et emplacement de sceau/signature. Le modèle précédent était plus proche d'une fiche d'application moderne, avec un grand titre sans-serif, des rangées grisées et de larges espacements.

Le nouveau rendu reprend ces repères sans copier un blason ni imiter un acte officiel : titre malgache en italique serif, en-tête centré, repères discrets de service, double filet fin, référence de registre encadrée, champs resserrés sur lignes sobres et espaces de signature identifiés. Les mentions « document fictif » restent explicites. Le filigrane rouge est désormais superposé au contenu avec une transparence légère, puis répété intégralement dans le pied de page de chaque page.

## Livrables

- [Acte de naissance fictif — PDF A4](./acte-naissance-specimen-final.pdf)
- [Capture du rendu PDF](./acte-naissance-specimen-final.png)

Le PDF d'exemple est généré par le moteur ReportLab de l'API avec des données entièrement fictives et des caractères accentués. Il n'est ni persisté dans la base, ni un document authentique. Aucun blason de naissance autorisé n'étant disponible dans les ressources du projet, l'en-tête utilise une composition institutionnelle textuelle et n'ajoute pas de logo inventé. Les espaces de signature sont explicitement signalés comme non apposés.

## Fichiers modifiés

- `apps/api/app/birth_pdf.py` — modèle A4 de naissance restylé selon la photo; le filigrane diagonal est rendu au-dessus du contenu sur chaque page.
- `apps/api/tests/test_birth_pdf.py` — vérifie A4, champs accentués/longs, superposition du filigrane et pagination multipage.
- `docs/acte-naissance-specimen-final.pdf` et `docs/acte-naissance-specimen-final.png` — exemple et capture régénérés.

L'aperçu, le téléchargement, les exports groupés et l'impression des actes continuent d'utiliser le même PDF serveur (`/births/{id}/specimen.pdf`). Le composant d'aperçu et son action d'impression n'ont pas été modifiés. Le modèle et les fonctions CIN n'ont pas été touchés dans ce redesign.

## Vérifications

- Suite API complète : **37 tests réussis**; les tests ciblés naissance et non-régression des documents en couvrent 19 (`test_birth_pdf.py` et `test_models.py`).
- PDF d'exemple : une page A4 portrait, extraction vérifiée du titre, des accents de « Noël », « Tanàna » et « Déclarant », et du filigrane.
- Filigrane `SPÉCIMEN — SANS VALEUR OFFICIELLE` présent en pied de page; la marque diagonale superposée est contrôlée page par page sur un document long multipage.
- Téléchargement authentifié via l'API : `application/pdf`, `Content-Disposition: inline` et `Cache-Control: no-store`; aperçu et impression consomment ce même fichier.
- CIN : les fonctions de génération partagées et `render_cin_specimen` sont identiques à leur version Git de référence (comparaison AST); les tests de documents passent. Aucun fichier propre au CIN ou au workflow n'a été modifié pour ce redesign.
- Aucun changement de données, schéma ou migration.

Le dialogue système d'impression n'a pas été ouvert pendant cette vérification ; le PDF transmis à l'iframe d'impression est le même flux que celui téléchargé et conserve donc le filigrane.
