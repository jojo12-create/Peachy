# DESIGN — Peachy Lymphatic Therapy

Règles de design du site. À lire avant de construire ou de modifier une interface.
Les valeurs vivent dans `assets/css/tokens.css` : on y ajoute, on ne les contourne pas.

## Direction

Une maison de soin, pas un centre esthétique. Deux univers du moodboard, fusionnés dans une seule page
qui alterne les chapitres :

- **Chocolat immersif** (drainage, geste, réservation) : chocolat profond, lumière chaude, peau, gestes.
- **Crème éditoriale** (luminothérapie, philosophie, univers, expérience) : ivoire, crème, sable, enduit, ombres végétales.

Et le terracotta des maquettes de Peachy : la page **s'ouvre sur le cuir grainé**, où le nom est gravé à blanc,
et se referme sur le même cuir (pied de page). Le papier feutré porte la bannière du brossage à sec.

La beauté tient à la composition, aux proportions, à la lumière, à la typographie et aux matières.
Jamais à un effet.

## Couleur

- **Palette fermée** : `--chocolat-nuit` `--chocolat` `--cacao` `--terracotta` `--taupe` `--sable` `--creme` `--ivoire`,
  plus `--cuir` et `--papier`, dont la couleur est relevée sur les maquettes de Peachy.
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
- **Aucun texte utile sous 12 px.** Le sous-titre du nom fait partie de son dessin, doublé par un `aria-label`.
- Le **lettrage de la maison** (voir plus bas) n'est pas une police : il ne sert qu'au nom et aux noms des prestations.
- **Pas de surtitre** au-dessus d'un titre, pas de numéros de section.

## Lettrage

- **Le nom PEACHY est un lettrage dessiné à la plume large**, dans l'esprit des identités d'Azuri Studio Solaire
  données en référence : chaque lettre est un squelette de quelques traits, parcouru par une plume plate tenue à
  angle constant. Les pleins et les déliés viennent du geste. Il n'est composé dans aucune police.
  <!-- 2026-11-18 : « Retravaille la calligraphie du lettrage avec ces exemples de studio azuria. Imagine que tu es studio azuria et tu refais Peachy lettrage » -->
- Le **A est sans barre**, comme sur la maquette cuir de Peachy. Dans le sous-titre, plus petit, il garde sa barre.
- **Il n'y a pas d'autre logo.** Plus de symbole à la pêche, nulle part : ni dans la barre, ni en filigrane, ni dans le pied de page.
  <!-- 2026-11-18 : « Je voulais ça en première page et cette typologie. Plus de logo hors ça » (capture du nom gravé dans le cuir) -->
- Tout sort de `tools/lettrage.mjs` : le nom et son sous-titre (`peachy-mot`), la version pour petites tailles
  (`peachy-marque`, plume plus encrée), l'initiale (`peachy-p`), et les noms des prestations ligne par ligne (`titre-*`).
  Une nouvelle prestation = une ligne de plus dans ce fichier, jamais un titre dans une police approchante.
- Le lettrage s'affiche par masque (`.lettrage`, `.marque__logo`) : il prend la couleur du texte.
  Le vrai texte reste dans la page pour les lecteurs d'écran.

## Matières

- Chaque fond = une couleur de la palette + une matière posée dessus
  (`.fond-chocolat`, `.fond-nuit`, `.fond-ivoire`, `.fond-creme`, `.fond-sable`, `.fond-cuir`, `.fond-papier`).
  Papier clair, enduit, chocolat, lin et ombre de palme sont générés par `tools/textures.py`.
- **Le cuir grainé et le papier feutré reprennent le grain des maquettes** : `tools/couverture.py` relève la signature
  d'une zone sans logo et la rejoue sur une tuile sans couture. On ne les remplace pas par une texture approchante.
  <!-- 2026-11-18 : « à partir de ce nouveau logo / métrages », maquettes papier et cuir jointes -->
- Les matières restent à la limite du visible. Si un motif répété se lit, la texture est trop forte.
- Les ombres végétales (`.ombre-vegetale`) ne se posent que derrière le contenu, jamais sur du texte.

## Surfaces, cartes, ombres

- Une carte se détache par **contraste de matière et ombre de contact** (`--ombre-carte`), jamais par une bordure épaisse.
- Rayons légers : `--rayon-bouton` 3 px, `--rayon-photo` 4 px, `--rayon-carte` 6 px.
  La seule forme ronde est l'**arche**, motif repris des niches du lieu (`--rayon-arche`), et la **voûte**
  (`--voute`) : le sommet arrondi d'un chapitre qui vient recouvrir le précédent.
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

## Couverture

- **La première page n'est que le nom, gravé dans le cuir.** Ni titre, ni bouton, ni barre de navigation :
  la barre et les repères de chapitres n'apparaissent qu'en quittant la couverture. Seul un trait discret invite à descendre.
  <!-- 2026-11-18 : « La première page je veux juste ça. » -->
  <!-- 2026-11-18 : « Je voulais ça en première page et cette typologie. Plus de logo hors ça » (capture du nom gravé dans le cuir) -->
- **Le nom est de la couleur du cuir, gravé à blanc** (débossage) : aucune encre, aucune dorure.
  Il n'existe que par l'ombre et la lumière du creux.
  <!-- 2026-11-18 : « Retravaille pour que même le logo soit de la couleur du fond mais en gravé comme dans du papier » -->
- **Le cuir** est éclairé au centre, plus dense sur les bords. Cuir et gravure partagent la même lumière (haut à gauche) :
  ils sortent tous deux de `tools/couverture.py`. La gravure est tracée d'une plume plus large que le nom imprimé :
  un creux doit se lire sans encre.
- Une version précédente (logo doré à la pêche sur papier, devise, bouton, bandeau des rituels) a été refusée :
  ne pas y revenir.

## Mise en page

- **Chaque prestation est une section à elle seule, en bannière** : la photographie d'un côté sur toute la hauteur,
  de l'autre le nom dans le lettrage de la maison, une phrase et la réservation. La photo change de côté et la
  matière change d'une bannière à l'autre (chocolat, crème, papier terracotta). Jamais de cartes côte à côte.
  <!-- 2026-11-18 : « Je veux que chaque prestation soit une section à elle toute seule en mode bannière. » -->
- **L'ordre de la page est celui de la barre** : drainage lymphatique, luminothérapie, brossage à sec,
  la philosophie (« À propos »), puis le geste, l'univers, l'expérience, la réservation et le contact.
- Une suite de **chapitres plein écran** (`min-height: 100svh`). Un contenu long peut dépasser la hauteur d'un écran.
- Chaque chapitre a sa composition : nom gravé (couverture), bannière photo/texte (prestations),
  asymétrie texte/arche (philosophie), tableau à fond perdu (geste), galerie éditoriale (univers),
  colonne sobre (expérience), arche + appel (réserver). Hors bannières, deux chapitres voisins ne partagent
  jamais la même structure.
- Marges latérales égales : tout s'aligne sur `.cadre` (`--gouttiere`, `--largeur`).
- Mobile d'abord. Les compositions éditoriales commencent à `62rem`.
- Aucun défilement imposé : pas de scroll-jacking, pas de snap vertical.

## Mouvement

- Courbes : `--ease-out` (entrées, sorties, survols) et `--ease-in-out` (déplacements). Jamais `ease-in`, jamais `transition: all`.
- Propriétés animées : `transform`, `opacity`, `clip-path`. Jamais `width`, `height`, `margin`, `top`, `left`.
- **Couverture** : la gravure apparaît lentement au chargement, comme pressée dans le cuir.
- **D'un chapitre à l'autre** : le suivant arrive comme une feuille au sommet arrondi (`--voute`) et recouvre le
  précédent, qui ralentit et s'assombrit au lieu de simplement sortir de l'écran (`.scene`, `--recul`).
  Le mouvement suit le doigt : piloté par la position de défilement, jamais par une durée.
  <!-- 2026-11-18 : « Trouve des animations premium à faire pour passage de section en section » -->
- **Dans une bannière** : le nom de la prestation s'écrit de gauche à droite (`data-reveal="ecrit"`), la
  photographie se dévoile puis glisse un peu moins vite que son cadre.
- **Révélations** (`data-reveal`) : `ecrit` pour le lettrage, `monte` pour le texte, `photo` pour les images (masque de bas en haut), `trait` pour les filets.
  Une seule fois, décalages courts et dégressifs (`--pas`, `--i`). Le contenu est visible sans JavaScript.
- **Liés au défilement** : recul des chapitres, glissement des photos de bannière, cadrage du geste, glissement du détail.
  En CSS (`animation-timeline`) ; là où ce n'est pas disponible, `main.js` pilote le seul recul des chapitres.
- Tout survol est derrière `@media (hover: hover) and (pointer: fine)`. Tout élément tactile a un état `:active`.
- `prefers-reduced-motion` : plus aucun déplacement, un fondu court.
- Pas d'animation sur ce qui s'utilise au clavier ou plusieurs fois par visite (liens de la barre, chapitres).

## Mobile

- `100svh` pour les chapitres, zones tactiles ≥ 44 px, `touch-action: manipulation`, pas de surbrillance au toucher.
- Menu plein écran chocolat, grandes entrées Playfair, fermeture par Échap et au clic sur un lien.
- L'accès à la réservation reste dans la barre à toutes les tailles. Rien de flottant par-dessus le contenu.
- Une bannière de prestation s'empile : la photographie d'abord, puis le nom, la phrase et la réservation.
  Aucun défilement horizontal.

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
