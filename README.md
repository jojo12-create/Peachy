# Peachy — Lymphatic Therapy

Site de démonstration de Peachy, centre spécialisé dans le drainage lymphatique.
Une page en chapitres plein écran, qui alterne deux univers : **Chocolat immersif** et **Crème éditoriale**.

Site statique : HTML, CSS et JavaScript natifs. Aucun framework, aucune dépendance, aucune étape de build.

## Versions

| Dossier | Contenu |
| --- | --- |
| racine | version d'origine : couverture « logo gravé dans le papier », puis hero photo |
| `v2/` | copie fidèle de la version d'origine, gardée telle quelle |
| `v3/` | couverture « serviette brodée » : la serviette se dépose, puis la broderie se coud |

Chaque dossier est un site complet (ses pages, ses `assets`). Avec le serveur ci-dessous :
http://localhost:4173/ · http://localhost:4173/v2/ · http://localhost:4173/v3/

### La serviette brodée (v3)

L'animation part de deux images de la même serviette, dans `photos/originaux` : `serviette-brodee.jpg`
(état final) et `serviette-nue.jpg` (avant couture). Tout le reste est calculé :

```bash
pip install opencv-contrib-python-headless scikit-image   # une fois
python3 tools/serviette.py                                 # écrit v3/assets/img/serviette et v3/assets/js/serviette-donnees.js
python3 tools/serviette.py --controle                      # ajoute des planches de contrôle dans shots/
```

- Le minutage (fenêtre d'apparition de chaque groupe), le nombre de lanières et leur douceur se règlent en tête de `tools/serviette.py`.
- La disposition (photographie sur écran large, pile verticale sur écran en hauteur) et les plans de caméra
  sont dans `v3/assets/js/serviette.js`.
- Pour changer d'images, remplacer les deux originaux (même serviette, même cadrage) et relancer l'outil.
  `PROMPT-HERO.md` donne les prompts pour les régénérer au format du hero.
- `http://localhost:4173/v3/?instant=6.5` fige l'animation à 6,5 s (contrôle, captures).

## Voir le site

```bash
python3 -m http.server 4173
```

Puis ouvrir http://localhost:4173. Le dossier se dépose tel quel chez n'importe quel hébergeur statique
(GitHub Pages, Netlify, Vercel, OVH…).

## Organisation

| Chemin | Rôle |
|---|---|
| `index.html` | La page : la couverture, 8 chapitres et le pied de page |
| `mentions-legales.html`, `confidentialite.html` | Pages de texte (champs à compléter, non indexées) |
| `assets/css/tokens.css` | Variables de design : couleurs, matières, typographie, ombres, rayons, espacements, mouvement |
| `assets/css/base.css` | Typographie, matières, boutons, cadres photo, barre de navigation, menu, chapitres |
| `assets/css/sections.css` | Mise en page de chaque chapitre (mobile d'abord) |
| `assets/css/motion.css` | Entrée du hero, révélations au défilement, mouvement réduit |
| `assets/js/config.js` | **Réservation, coordonnées, Instagram, témoignages** : tout ce qui reste à fournir se règle ici |
| `assets/js/main.js` | Navigation, menu, chapitres, révélations |
| `assets/img/logo/` | Logo vectorisé : crème, chocolat, monochrome, symbole seul |
| `assets/img/photos/` | Photos retouchées (AVIF + WebP, plusieurs largeurs) |
| `assets/img/textures/` | Matières : papier, enduit, chocolat, lin, ombre de palme |
| `photos/originaux/` | Photos d'origine, jamais modifiées |
| `tools/` | Chaîne de retouche et générateur de matières |
| `prototypes/hero/` | Trois variantes du hero derrière un sélecteur |
| `DESIGN.md` | Règles de design du projet |
| `PRODUCT.md` | Contexte produit |
| `CONTENU-A-COMPLETER.md` | Ce qui reste à fournir ou à valider |

## Le parcours

0. **Couverture** : le logo gravé à blanc dans un papier terracotta, et rien d'autre.
1. **Hero** (chocolat) : la photo du soin, « L'art de prendre soin de soi », deux actions.
2. **La philosophie** (crème) : composition éditoriale, portrait en arche, ombre végétale.
3. **Le drainage lymphatique** (chocolat) : photo pleine hauteur, principe, approche, séance, sensations.
4. **Les rituels** (crème) : trois cartes ; défilement horizontal tactile sur mobile.
5. **Le geste** (chocolat) : « Chaque geste a son intention. »
6. **L'univers Peachy** (crème) : galerie éditoriale du lieu.
7. **L'expérience** (beige minéral) : structure prête pour de vrais témoignages.
8. **Réserver** (chocolat profond) : « Un moment rien qu'à vous. »
9. **Pied de page** : logo, navigation, Instagram, mentions.

## Brancher la réservation et les coordonnées

Tout se passe dans `assets/js/config.js` :

```js
reservation: { url: "https://…" },          // le bouton « Réserver mon soin » y mène, la note d'attente disparaît
coordonnees: { adresse: "…", itineraire: "https://…", telephone: "…", email: "…" },
temoignages: [{ texte: "…", auteur: "Prénom N.", contexte: "Drainage lymphatique" }],
```

Un champ laissé à `null` reste masqué. Sans lien de réservation, le bouton ouvre le compte Instagram officiel.

## Photographies

Les photos viennent de la grille Instagram de Peachy (vignettes de 382 px). Elles sont agrandies 4×, puis
étalonnées par `tools/retouche.py` selon la charte décrite dans `DESIGN.md` : balance chaude, ombres chocolat,
hautes lumières crème, noirs relevés, teintes froides ramenées dans la palette, grain fin.

Remplacer une photo par sa version haute définition :

1. déposer le fichier dans `photos/originaux/` sous le même nom (ou ajouter une entrée dans `tools/photos.json`) ;
2. ajuster si besoin `crop` (fractions de l'image) et `glyph` (à retirer pour une photo sans pictogramme Instagram) ;
3. lancer la chaîne :

```bash
python3 tools/retouche.py
```

Dépendances des outils : Python 3, `pillow` ≥ 11.3 et `numpy`. Le dossier `photos/hd/` (non versionné) peut contenir
des versions haute définition portant le même nom ; elles sont alors préférées aux originaux.

Les matières se régénèrent avec :

```bash
python3 tools/textures.py
```

Le papier de la couverture et la gravure du logo (calculés avec la même lumière) :

```bash
python3 tools/couverture.py
```

## Prototypes du hero

`prototypes/hero/index.html` présente trois directions du premier écran : **Diptyque** (retenue par défaut,
photo entière et nette), **Plein cadre** (photo sur tout l'écran, recadrage serré) et **Arche** (crème éditoriale).
Touches `1` à `3` ou flèches pour changer, `R` pour rejouer l'entrée. Le dossier se supprime une fois le choix fait.

## Skills de design

Les skills utilisés pour ce site sont installés dans `.claude/skills/` (copiés depuis le dépôt `skills`, licences conservées).
Le skill `design-taste-frontend` (kit de 26 Mo) reste dans le dépôt `skills`.

## Avant une mise en ligne

Voir `CONTENU-A-COMPLETER.md` : lien de réservation, adresse, rituels à valider (noms, durées, tarifs),
photographies en haute définition, mentions légales, nom de domaine.
