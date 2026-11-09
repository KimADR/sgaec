# SGAEC — Design system de démonstration

## Intention

Une interface administrative sobre et lisible, adaptée aux dossiers d'état civil et
aux réunions de démonstration. La marque et les documents restent distincts de toute
identité ministérielle officielle. Les données visibles doivent provenir des services
de démonstration ; une action non implémentée est signalée comme telle.

## Tokens CSS

Les variables globales sont définies dans `apps/web/app/globals.css`.
Tailwind CSS 4 est activé avec le plugin PostCSS et reprend les mêmes couleurs via les
tokens `@theme`. Toutes les routes et leurs composants partagés sont stylés avec les
utilitaires Tailwind ; le tableau conservé dans Rapports est réservé aux agrégats.

| Usage | Token | Valeur |
|---|---|---|
| Navigation et titres forts | `--navy` / `text-navy` | `#0b203a` |
| Surfaces secondaires de navigation | `--navy-2` / `text-navy-2` | `#143553` |
| Actions principales | `--blue` / `text-blue` | `#1972b6` |
| Actions et liens foncés | `--blue-dark` / `text-blue-dark` | `#155b91` |
| Accent discret | `--gold` / `text-gold` | `#b9934f` |
| Texte | `--ink` / `text-ink` | `#182b40` |
| Texte secondaire | `--muted` / `text-muted` | `#607387` |
| Bordures | `--line` / `border-line` | `#e3e9f0` |
| Fond applicatif | `--background` / `bg-background` | `#f5f7fa` |
| États | classes Tailwind `emerald`, `amber`, `red`, `blue` | variantes lisibles dédiées |

Les panneaux sont majoritairement blancs, avec bordure et ombre discrètes. La couleur
est réservée à la navigation, aux actions et aux états ; les chiffres ne reçoivent pas
de tendances comparatives sans historique vérifiable.

## Typographie et contrôles

- Police système sans téléchargement externe ; corps de texte de base à 14 px.
- Titres de page autour de 29 px sur grand écran, réduits sur mobile.
- Texte des tableaux et en-têtes à 13 px au minimum ; badges de statut à 12 px.
- Champs et boutons principaux ont une hauteur tactile d'au moins 40 px.
- Les labels contenant un indicateur requis regroupent leur texte et l'astérisque
  dans un même élément afin d'éviter une séparation visuelle.

## Composants partagés

- `Shell` : navigation responsive hiérarchisée, indicateur de page active, commune/rôle et liens limités aux permissions de la commune active.
- `CitizenCard` : identité, statut, date et lieu de naissance, centre, nombre d'actes
  et accès à la fiche, sans photo ni donnée déduite.
- `AccessContext` / `AccessDenied` : habilitations d'interface uniquement ; le serveur reste l'autorité des contrôles d'accès.
- `Status` : libellés uniformes des états de workflow.
- `Pagination` : intervalle X–Y/N, navigation numérotée, format mobile compact et choix 5/10/25/50.
- `BirthWorkflowPanel` : transitions autorisées par les permissions et statuts existants ; aucune étape historique n'est inventée.
- `RequestExplorer` : recherche consolidée réutilisée par Demandes et Archives.
- `ComingSoon` : réservé aux modules non opérationnels ; aucune action fictive.
- `reports` : présentation de résultats agrégés et export CSV non nominatif.

Les pages et leurs états de chargement, erreur, vide, réussite ou limite de prototype
doivent réutiliser ces styles et composants lorsqu'ils existent.

## Responsive et clavier

- Sidebar fixe sur grand écran ; drawer mobile avec fermeture par Échap, focus initial
  et boucle de tabulation, clic extérieur, restitution du focus et verrouillage du défilement.
- Les panneaux et filtres se replient en une colonne sur petits écrans.
- Les listes d'enregistrements sont présentées sous forme de cartes responsives ; les tableaux de rapports restent dans un conteneur défilant horizontalement.
- Focus clavier visible, lien d'accès direct au contenu, libellés explicites et
  annonces d'erreur via les régions adaptées.
- Respect de `prefers-reduced-motion`.

Les écrans ont été contrôlés dans le navigateur à 1440 et 390 px ; Répertoire citoyen,
formulaire de naissance, rapports et menu clavier ont été inspectés. Les pages de listes
et formulaires vérifiées ne débordent pas horizontalement, et les listes s'affichent en
cartes aux largeurs adaptées. Le build Next.js et le build Docker web ont réussi. Ces
vérifications ne constituent pas une recette exhaustive ni une certification WCAG 2.2 AA.
Les contrastes et parcours clavier complets doivent encore faire l'objet d'une
évaluation dédiée avant toute utilisation réelle.

## Intégration DSI

- Les menus et actions de création, archivage, export, aperçu PDF et transition sont
  conditionnés aux permissions réelles renvoyées pour la commune sélectionnée.
- Les réponses de recherche anciennes sont ignorées ; les filtres et la taille de page
  ramènent la liste à la première page et les erreurs proposent une reprise explicite.
- Les communes et districts de démonstration ne sont plus préremplis dans les formulaires ;
  la commune d'un acte est fixée côté service selon la session et non selon le centre.
- La version de démonstration ne lance pas de migration ni d'amorçage de données lors de
  cette intégration. Consulter `RAPPORT_INTEGRATION_DSI.md` pour les limites de recette.
