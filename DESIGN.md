# DESIGN — Peachy Lymphatic Therapy

Règles de design du site. À lire avant de construire ou de modifier une interface.
Les valeurs vivent dans `assets/css/tokens.css` : on y ajoute, on ne les contourne pas.

## Direction

Une maison de soin, pas un centre esthétique. Deux univers du moodboard, fusionnés dans une seule page
qui alterne les chapitres :

- **Chocolat immersif** (drainage, geste, réservation) : chocolat profond, lumière chaude, peau, gestes.
- **Crème éditoriale** (rituels, philosophie, univers, expérience) : ivoire, crème, sable, enduit, ombres végétales.

Et deux couvertures terracotta, tirées des maquettes du logo : la page **s'ouvre sur le papier feutré**, logo doré
(première page), et **se referme sur le cuir grainé**, nom gravé à blanc (pied de page).

La beauté tient à la composition, aux proportions, à la lumière, à la typographie et aux matières.
Jamais à un effet.

## Couleur

- **Palette fermée** : `--chocolat-nuit` `--chocolat` `--cacao` `--terracotta` `--taupe` `--sable` `--creme` `--ivoire`,
  plus les deux couvertures : `--papier` et `--cuir`, dont la couleur est relevée sur les maquettes.
- **Dorure** (`--dorure`, `--dorure-claire`, `--dorure-ombre`) : réservée au logo de la première page.
  Jamais pour un texte, un bouton ou un aplat.
  Pas de noir absolu ni de blanc pur, y compris dans les ombres (toujours `rgb(40 23 15 / α)`).
- **Texte** : `--encre` / `--encre-douce` sur fonds clairs, `--lumiere` / `--lumiere-douce` sur fonds sombres.
  Le texte secondaire est teinté de la palette, jamais gris.
- **Terracotta** : accent rare (filets, guillemet, sélection, focus). Jamais en aplat ni pour du texte courant
  (3,7:1 sur crème : réservé aux grands éléments).

## Typographie

- **Playfair Display 400** (romain et italique) pour titres, phrases de marque et citations ;
  **Inter** pour navigation, boutons, descriptions. Polices hébergées dans `assets/fonts`.
- L'emphase d'un titre passe par l'**italique** (`<em>`), jamais par la graisse ni la couleur.
- Tailles fluides (`--t-*`), titres équilibrés (`text-wrap: balance`), paragraphes courts (≤ 38em).
- **Aucun texte utile sous 12 px.** Le sous-titre du logo fait partie du dessin du logo, doublé par un `aria-label`.
- **Pas de surtitre** au-dessus d'un titre, pas de numéros de section.

## Logo

- **Le logo est celui de la maquette fournie par Peachy** (la pêche, PEACHY, LYMPHATIC THERAPY) : il est tracé d'après
  elle par `tools/logo.py` puis `tools/logo.mjs`, jamais redessiné ni recomposé dans une police approchante.
  <!-- 2026-11-18 : « Crée le site de peachy lymphatic drainage à partir de ce nouveau logo » -->
- Fichiers (`assets/img/logo`) : logo complet (`peachy-logo-*`), pêche seule (`peachy-symbole`), nom et sous-titre
  (`peachy-mot`), et `peachy-marque` pour les petites tailles (sous-titre agrandi, justifié sur le nom).
- Le logo s'affiche par masque : il prend la couleur du texte dans la barre, la dorure sur la première page.
- Dans la barre, le logo attend que le grand logo de la première page soit sorti de l'écran : jamais les deux ensemble.

## Matières

- Chaque fond = une couleur de la palette + une matière posée dessus
  (`.fond-chocolat`, `.fond-nuit`, `.fond-ivoire`, `.fond-creme`, `.fond-sable`, `.fond-cuir`).
  Papier, enduit, chocolat, lin et ombre de palme sont générés par `tools/textures.py`.
- **Le papier feutré et le cuir grainé reprennent le grain des maquettes** : `tools/couverture.py` relève la signature
  d'une zone sans logo et la rejoue sur une tuile sans couture. On ne les remplace pas par une texture approchante.
  <!-- 2026-11-18 : « à partir de ce nouveau logo / métrages », maquettes papier et cuir jointes -->
- Les matières restent à la limite du visible. Si un motif répété se lit, la texture est trop forte.
- Les ombres végétales (`.ombre-vegetale`) ne se posent que derrière le contenu, jamais sur du texte.
- Le logo peut être **gravé à blanc** (débossé) dans un fond sombre : la pêche dans la section Réserver, le nom dans le
  cuir du pied de page. Jamais au détriment d'un texte.

## Surfaces, cartes, ombres

- Une carte se détache par **contraste de matière et ombre de contact** (`--ombre-carte`), jamais par une bordure épaisse.
- Rayons légers : `--rayon-bouton` 3 px, `--rayon-photo` 4 px, `--rayon-carte` 6 px.
  La seule forme ronde est l'**arche**, motif repris des niches du lieu : plein cintre (`--rayon-arche`) ou
  surbaissée pour les rituels (`--rayon-voute`), comme sur la maquette.
- Les rituels ne sont pas des cartes : une photo sous voûte, son nom, une phrase, un lien. Pas de fond, pas de cadre.
- Pas de carte dans une carte.

## Boutons

- Trois variantes, une seule forme : `.btn--ivoire` (principal sur fond sombre), `.btn--chocolat` (principal sur fond clair),
  `.btn--contour` (secondaire). Hauteur 52 px (44 px en `.btn--petit`).
- Pas de brillance, pas de dégradé visible, pas de bordure lourde.
- Survol : montée de 1 px et ombre plus profonde. Pression : `scale(0.97)` en 140 ms.

## Photographie

- **Seules les vraies photographies de Peachy sont utilisées.** Pas de banque d'images, pas de visuel généré de toutes pièces.
  <!-- 2026-11-18 : grille Instagram de Peachy fournie en réponse à la question des visuels provisoires -->
- **Une photo n'est jamais prolongée par un flou, un fondu ou un dégradé pour atteindre un format.**
  Si un format exige plus d'image, on génère la suite de l'image (outpainting) pour qu'elle se lise comme une seule
  photographie ; si ce n'est pas possible, la mise en page s'adapte au format natif de la photo.
  Pourquoi : le prolongement doit se lire « comme si c'était une même image ».
  <!-- 2026-11-18 : « Non je te demande pas de généré un fondu mais de générer le reste de l'image comme si c'était une même image. Quand c'est nécéssaire » -->
- **Quand une photo est étendue, la photo d'origine reste exacte au centre** ; seuls les bords ajoutés sont générés.
  <!-- 2026-11-18 : « ajouter des bords au photo en générant ce qui n'est pas tout en gardant la photo exacte au centre s'il faut faire correspondre les photos à un format spécifique » -->
- Un dégradé chocolat peut couvrir une photo **pour la lisibilité d'un texte posé dessus**. Ce n'est pas un prolongement.
- Les originaux (`photos/originaux`) ne sont jamais modifiés. Toute image du site sort de `tools/retouche.py`.
- **Charte de retouche** : balance chaude, ombres chocolat, hautes lumières crème, noirs relevés, teintes froides
  ramenées dans la palette, grain fin. Deux réglages : `chocolat` (sections sombres) et `creme` (sections claires).
  Peau naturelle, aucune transformation du corps, aucun lissage.
- Une photo n'apparaît qu'une fois sur la page. Aucune légende sous une image.
- Une photo n'est jamais affichée au-delà de ce que sa définition permet : on réduit le cadre plutôt que d'agrandir un flou.

## Première page

- **La première page reprend la page du logo à la pêche** : le papier terracotta feutré, le logo doré au centre.
  Elle a l'ergonomie de la maquette du site : barre de navigation, devise, un seul bouton « Réserver un soin »,
  et le haut des rituels qui dépasse en bas de l'écran (`--apercu`).
  <!-- 2026-11-18 : « fais cette ergonomie de site comme sur exemple avec une hero page qui est inspirée de la page avec logo pêche » -->
  Cette demande remplace la couverture précédente (logo seul, gravé à blanc, sans barre ni bouton).
- **Rien d'autre sur le papier** : ni photo, ni second bouton, ni texte d'introduction. Le logo domine, la devise
  « L'art de prendre soin de soi » reste petite, en italique.
- **La dorure** est un métal crème mat qui garde le grain du papier. Elle laisse une ombre de contact, pas un halo.
- **Le papier** est éclairé du haut à gauche, un peu plus dense sur les bords. Il porte son ombre sur le bandeau des rituels.
- **Le pied de page est l'autre couverture** : le cuir, et le nom gravé à blanc, sans encre ni dorure,
  qui n'existe que par l'ombre et la lumière du creux.

## Mise en page

- **L'ordre de la page est celui de la barre** : les rituels, le drainage lymphatique, la philosophie (« À propos »),
  puis le geste, l'univers, l'expérience, la réservation et le contact.
- Une suite de **chapitres plein écran** (`min-height: 100svh`), sauf la première page et le bandeau des rituels,
  qui se partagent le premier écran. Un contenu long peut dépasser la hauteur d'un écran.
- Chaque chapitre a sa composition : logo centré (première page), bandeau titre + trois voûtes (rituels),
  photo pleine hauteur (drainage), asymétrie texte/arche (philosophie), tableau à fond perdu (geste),
  galerie éditoriale (univers), colonne sobre (expérience), arche + appel (réserver), nom gravé (pied de page).
  Deux chapitres voisins ne partagent jamais la même structure.
- Marges latérales égales : tout s'aligne sur `.cadre` (`--gouttiere`, `--largeur`).
- Mobile d'abord. Les compositions éditoriales commencent à `62rem`.
- Aucun défilement imposé : pas de scroll-jacking, pas de snap vertical.

## Mouvement

- Courbes : `--ease-out` (entrées, sorties, survols) et `--ease-in-out` (déplacements). Jamais `ease-in`, jamais `transition: all`.
- Propriétés animées : `transform`, `opacity`, `clip-path`. Jamais `width`, `height`, `margin`, `top`, `left`.
- **Première page** : un seul mouvement au chargement. Le logo se pose, un reflet traverse la dorure une fois, puis
  viennent le filet, la devise, le bouton et le haut des rituels. Rien ne bloque le clic.
- **Reflet** : à la souris, une bande de lumière suit le geste sur la dorure, discrète (50 %). Rien au toucher.
- **Révélations** (`data-reveal`) : `monte` pour le texte, `photo` pour les images (masque de bas en haut), `trait` pour les filets.
  Une seule fois, décalages courts et dégressifs (`--pas`, `--i`). Le contenu est visible sans JavaScript.
- **Liés au défilement** : le logo s'enfonce un peu en quittant la première page, cadrage du geste, glissement du détail.
  En CSS (`animation-timeline`), amplitude minime.
- Tout survol est derrière `@media (hover: hover) and (pointer: fine)`. Tout élément tactile a un état `:active`.
- `prefers-reduced-motion` : plus aucun déplacement, un fondu court.
- Pas d'animation sur ce qui s'utilise au clavier ou plusieurs fois par visite (liens de la barre, chapitres).

## Mobile

- `100svh` pour les chapitres, zones tactiles ≥ 44 px, `touch-action: manipulation`, pas de surbrillance au toucher.
- Menu plein écran chocolat, grandes entrées Playfair, fermeture par Échap et au clic sur un lien.
- L'accès à la réservation reste dans la barre à toutes les tailles. Rien de flottant par-dessus le contenu.
- Les rituels défilent horizontalement (`scroll-snap`), avec un repère discret.

## Contenu

- Phrases courtes, sensorielles, sans cliché commercial.
- **Aucune promesse médicale** : on décrit le soin, le geste, la sensation recherchée. Jamais un résultat.
- **Rien n'est inventé** : ni adresse, ni tarif, ni durée, ni certification, ni témoignage.
  Ce qui manque est listé dans `CONTENU-A-COMPLETER.md` et se règle dans `assets/js/config.js`.
- Typographie française : apostrophe courbe, espace insécable avant `:` `;` `?` `!`, guillemets « ».

## Accessibilité

- Contraste ≥ 4,5:1 pour le texte courant, ≥ 3:1 pour les grands titres.
- Lien d'évitement, focus visible à la palette, ordre des titres sans saut, `alt` descriptif sur chaque photo.
- Le menu ouvert rend le reste de la page inerte ; Échap le referme et rend le focus au bouton.
