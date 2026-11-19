# DESIGN — Peachy Lymphatic Therapy

Règles de design du site. À lire avant de construire ou de modifier une interface.
Les valeurs vivent dans `assets/css/tokens.css` : on y ajoute, on ne les contourne pas.

## Direction

Une maison de soin, pas un centre esthétique. Deux univers du moodboard, fusionnés dans une seule page
qui alterne les chapitres :

- **Chocolat immersif** (hero, drainage, geste, réservation, pied de page) : chocolat profond, lumière chaude, peau, gestes.
- **Crème éditoriale** (philosophie, rituels, univers, expérience) : ivoire, crème, sable, enduit, ombres végétales.

La beauté tient à la composition, aux proportions, à la lumière, à la typographie et aux matières.
Jamais à un effet.

## Couleur

- **Palette fermée** : `--chocolat-nuit` `--chocolat` `--cacao` `--terracotta` `--taupe` `--sable` `--creme` `--ivoire`.
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
- **Aucun texte utile sous 12 px.** Le sous-titre du logo dans la barre (9 px) fait partie du logo, doublé par un `aria-label`.
- **Pas de surtitre** au-dessus d'un titre, pas de numéros de section.

## Matières

- Chaque fond = une couleur de la palette + une matière transparente posée dessus
  (`.fond-chocolat`, `.fond-nuit`, `.fond-ivoire`, `.fond-creme`, `.fond-sable`).
  Les matières sont générées par `tools/textures.py` (papier, enduit, chocolat, lin, ombre de palme).
- Les matières restent à la limite du visible. Si un motif répété se lit, la texture est trop forte.
- Les ombres végétales (`.ombre-vegetale`) ne se posent que derrière le contenu, jamais sur du texte.
- Le symbole du logo peut être **débossé** dans un fond sombre (section Réserver). Jamais au détriment d'un texte.

## Surfaces, cartes, ombres

- Une carte se détache par **contraste de matière et ombre de contact** (`--ombre-carte`), jamais par une bordure épaisse.
- Rayons légers : `--rayon-bouton` 3 px, `--rayon-photo` 4 px, `--rayon-carte` 6 px.
  La seule forme ronde est l'**arche** (`--rayon-arche`), motif repris des niches du lieu.
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

- **La première page n'est que le logo, gravé dans le papier.** Ni titre, ni bouton, ni barre de navigation :
  la barre et les chapitres n'apparaissent qu'en quittant la couverture. Seul un trait discret invite à descendre.
  <!-- 2026-11-18 : « La première page je veux juste ça. » -->
- **Le logo de la couverture est de la couleur du fond, gravé à blanc** (débossage) : aucune encre, aucune dorure.
  Il n'existe que par l'ombre et la lumière du creux.
  <!-- 2026-11-18 : « Retravaille pour que même le logo soit de la couleur du fond mais en gravé comme dans du papier » -->
- **Le papier** est un terracotta feutré (`--papier`), à fibres visibles et rares inclusions, éclairé du haut à gauche.
  Papier et gravure partagent la même lumière : ils sortent tous deux de `tools/couverture.py`.
  <!-- 2026-11-18 : « Travaille la texture pour que ça soit comme sur les moods donnés, pareil pour la DA et la gravure » -->

## Couverture de la v3 : la serviette brodée

Dans `v3/`, la couverture et le hero ne font plus qu'un : une serviette éponge crème, brodée.
Les règles ci-dessus (logo gravé dans le papier) restent celles de la racine et de `v2/`.

- **À l'ouverture, seulement la serviette.** Elle se dépose, ses plis se forment, puis tout s'arrête.
  Alors seulement la broderie se coud sous nos yeux : la devise, le trait du milieu, chaque catégorie, le logo.
  <!-- 2026-11-19 : « À l'ouverture juste la serviette qui se dépose et les plis se crée puis ça se stop et les catégories et différents écrits se cousent petit à petit sous nos yeux. Chaque coutures, même le trait du mieu, tout ce qui représente quelque chose de cousu. » -->
- **Le fil suit la serviette.** La broderie affichée est celle de l'image brodée : elle épouse les plis et la perspective.
  On n'y superpose jamais de texte dessiné par le navigateur ; seul l'ordre d'apparition des points est calculé.
  <!-- 2026-11-19 : « Les catégories et donc les coutures qui se sont cousues suivent les ondulations de la serviettes et ça crée de la perspective et un sentiment de réalisme très détaillé. » -->
- **Avant la couture, la serviette nue est une vraie image**, pas la serviette brodée dont on aurait effacé le fil.
  <!-- 2026-11-19 : « Utilise image ici sans rien dessus juste serviette pour avant couture car la suppression a laissé des marques » -->
- Les deux images (`photos/originaux/serviette-brodee.jpg`, `serviette-nue.jpg`) ont été fournies pour cette couverture :
  c'est la seule exception à la règle « seules les vraies photographies de Peachy ».
  <!-- 2026-11-19 : images de la serviette fournies avec la demande « pour que cette image devienne le hero » -->
- **La broderie apparaît par lanières.** Ni lettre après lettre, ni fil à fil : de longues bandes souples, d'épaisseurs
  inégales, ondulent le long de chaque ligne et la dévoilent par endroits, puis en entier. Elles sont éparses
  (chacune part à son heure, quelques-unes de l'autre bout), leurs bords et leur pointe sont fondus, et une lueur
  très légère effleure l'éponge là où elles passent. Aucun fil, aucune aiguille n'est dessiné.
  <!-- 2026-11-19 : « Supprime effet fils et à la place fait apparaître les mots ou lettres de lanières éparses et de lanières douce et sensuelle » -->
  <!-- 2026-11-19, remplacé le même jour par les lanières : couture point par point à plusieurs aiguilles, puis arcs de fil sortant de la serviette. -->
- Le relief des points de broderie reste visible sur le fil, un peu exagéré : la broderie se lit comme du fil, pas comme une encre.
  <!-- 2026-11-19 : « J'aimerais voir les fils de couture aussi. Exagérés un peu. » -->
- **La caméra suit la broderie, sur tous les écrans.** Une fois la serviette immobile, elle s'approche de ce qui se coud,
  passe d'un ouvrage au suivant (léger recul en chemin), puis revient au plan d'ensemble. Mouvements longs, courbe douce
  à l'entrée et à la sortie (easeInOutSine), jamais d'arrêt net : chaque plan dérive lentement.
  <!-- 2026-11-19 : « J'aimerais que sur ordi ou mobile, après que la serviette s'est figée, la caméra zoom sur ce qui est en train de se coudre. Puis se déplace, dezoom, zoom, déplace au bon vouloir de chaque couture. Il faut que ça soit fluide, pas saccadé, harmonieux. » -->
- **La bande tissée est toujours vers le bas de l'écran**, le logo dedans. Si l'écran est plus haut que l'image,
  la serviette se prolonge vers le haut (éponge et plis continués, jamais de flou ni de miroir).
  <!-- 2026-11-19 : « après le dernier dezoom on est trop loin c'est pas jolie. Le bandeau doit toujours se trouver vers le bas de la page. » -->
- **Écran en hauteur (téléphone, tablette droite) : les menus brodés s'empilent** sur toute la hauteur, agrandis jusqu'à
  occuper la largeur : la devise, le trait couché en filet, puis une catégorie par ligne (« Le drainage / lymphatique »
  sur deux). Le logo et la serviette ne changent pas. Chaque mot déplacé prend la lumière et l'ondulation des plis où il se pose.
  Écran large : la disposition de la photographie.
  <!-- 2026-11-19 : « Trouve une autre disposition des menus sauf le logo laisse-le dans la bande, et serviette garde comme ça, juste les menus cousus change de dispo pour que ça prenne plus l'écran et toute la verticalité. » -->
- **Rythme** : pose 2,4 s, apparition de la broderie 7,6 s, retour au plan d'ensemble 1,7 s.
  <!-- 2026-11-19 : « Accélère un peu les coutures et donc les animations qui vont avec » -->
- **Les catégories brodées sont la navigation** de la couverture : chaque mot est un lien, actif une fois la caméra
  revenue au plan d'ensemble. La barre n'apparaît qu'en quittant la couverture, comme avant.
- **La broderie n'est jamais coupée** dans le plan d'ensemble.
- **Rien ne retient la personne** : dès qu'elle défile, la couture se hâte ; au retour arrière ou en mouvement réduit,
  la serviette est déjà brodée.
- Le fil a sa couleur (`--fil`), le linge la sienne (`--linge`). L'invitation à descendre est cousue du même fil.
- Tout sort de `tools/serviette.py` (serviette nue calée, carte des lanières, relief des points, plis, grain) :
  on ne retouche pas ces fichiers à la main.

## Mise en page

- Une suite de **chapitres plein écran** (`min-height: 100svh`). Un contenu long peut dépasser la hauteur d'un écran.
- Chaque chapitre a sa composition : diptyque (hero), asymétrie texte/arche (philosophie), photo pleine hauteur (drainage),
  cartes (rituels), tableau à fond perdu (geste), galerie éditoriale (univers), colonne sobre (expérience), arche + appel (réserver).
  Deux chapitres voisins ne partagent jamais la même structure.
- Marges latérales égales : tout s'aligne sur `.cadre` (`--gouttiere`, `--largeur`).
- Mobile d'abord. Les compositions éditoriales commencent à `62rem`.
- Aucun défilement imposé : pas de scroll-jacking, pas de snap vertical.

## Mouvement

- Courbes : `--ease-out` (entrées, sorties, survols) et `--ease-in-out` (déplacements). Jamais `ease-in`, jamais `transition: all`.
- Propriétés animées : `transform`, `opacity`, `clip-path`. Jamais `width`, `height`, `margin`, `top`, `left`.
- **Couverture** : la gravure apparaît lentement au chargement, comme pressée dans le papier.
- **Hero** : une entrée quand il arrive à l'écran (titre ligne à ligne, puis filet, texte, boutons). Rien ne bloque le clic.
- **Révélations** (`data-reveal`) : `monte` pour le texte, `photo` pour les images (masque de bas en haut), `trait` pour les filets.
  Une seule fois, décalages courts et dégressifs (`--pas`, `--i`). Le contenu est visible sans JavaScript.
- **Liés au défilement** : dérive du hero, cadrage du geste, glissement du détail. En CSS (`animation-timeline`), amplitude minime.
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
