# Peachy — Lymphatic Therapy

Site de démonstration de Peachy, centre spécialisé dans le drainage lymphatique.
Une page en chapitres, qui s'ouvre sur le logo doré dans un papier terracotta, alterne deux univers
(**Chocolat immersif** et **Crème éditoriale**) et se referme sur le nom gravé dans le cuir.

Site statique : HTML, CSS et JavaScript natifs. Aucun framework, aucune dépendance, aucune étape de build.

## Voir le site

```bash
python3 -m http.server 4173
```

Puis ouvrir http://localhost:4173. Le dossier se dépose tel quel chez n'importe quel hébergeur statique
(GitHub Pages, Netlify, Vercel, OVH…).

## Organisation

| Chemin | Rôle |
|---|---|
| `index.html` | La page : la première page, 7 chapitres et le pied de page |
| `mentions-legales.html`, `confidentialite.html` | Pages de texte (champs à compléter, non indexées) |
| `assets/css/tokens.css` | Variables de design : couleurs, matières, typographie, ombres, rayons, espacements, mouvement |
| `assets/css/base.css` | Typographie, matières, boutons, cadres photo, barre de navigation, menu, chapitres |
| `assets/css/sections.css` | Mise en page de chaque chapitre (mobile d'abord) |
| `assets/css/motion.css` | Entrée de la première page, révélations au défilement, mouvement réduit |
| `assets/js/config.js` | **Réservation, coordonnées, Instagram, témoignages** : tout ce qui reste à fournir se règle ici |
| `assets/js/main.js` | Navigation, menu, chapitres, révélations |
| `assets/img/logo/` | Logo vectorisé d'après la maquette : complet (crème, chocolat, masque), pêche seule, nom, version pour petites tailles, nom gravé |
| `assets/img/photos/` | Photos retouchées (AVIF + WebP, plusieurs largeurs) |
| `assets/img/textures/` | Matières : papier terracotta, cuir, papier, enduit, chocolat, lin, ombre de palme |
| `photos/originaux/` | Photos d'origine, jamais modifiées |
| `tools/` | Chaîne de retouche, générateurs de matières, vectorisation du logo |
| `tools/sources/` | Maquettes du logo fournies par Peachy (papier, cuir), dont tout le reste découle |
| `DESIGN.md` | Règles de design du projet |
| `PRODUCT.md` | Contexte produit |
| `CONTENU-A-COMPLETER.md` | Ce qui reste à fournir ou à valider |

## Le parcours

1. **Première page** (papier terracotta) : le logo doré, « L'art de prendre soin de soi », « Réserver un soin ».
   Le haut des rituels dépasse en bas de l'écran.
2. **Les rituels** (crème) : le titre et trois photos sous voûte ; défilement horizontal tactile sur mobile.
3. **Le drainage lymphatique** (chocolat) : la photo du soin en pleine hauteur, principe, approche, séance, sensations.
4. **La philosophie** (crème) : composition éditoriale, portrait en arche, ombre végétale. C'est le « À propos » de la barre.
5. **Le geste** (chocolat) : « Chaque geste a son intention. »
6. **L'univers Peachy** (crème) : galerie éditoriale du lieu.
7. **L'expérience** (beige minéral) : structure prête pour de vrais témoignages.
8. **Réserver** (chocolat profond) : « Un moment rien qu'à vous. »
9. **Pied de page** (cuir) : le nom gravé à blanc, navigation, Instagram, mentions.

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

Le papier de la première page, le cuir du pied de page et la gravure du nom, tirés des maquettes de `tools/sources` :

```bash
python3 tools/couverture.py
```

## Logo

Le logo est tracé d'après la maquette `tools/sources/maquette-papier.jpg`. Pour le régénérer
(Node, puis `npm install` une fois dans `tools/`) :

```bash
python3 tools/logo.py
```

```bash
node tools/logo.mjs
```

La première commande isole le logo de la maquette, la seconde le vectorise et écrit les fichiers de `assets/img/logo`
et `favicon.svg`. Le sous-titre est composé en Montserrat (licence OFL, dans `tools/sources`).
Le masque de la gravure (`tools/sources/masque-mot.png`) est un rendu noir sur blanc de `peachy-mot.svg`, en 2400 px de large.

## Skills de design

Les skills utilisés pour ce site sont installés dans `.claude/skills/` (copiés depuis le dépôt `skills`, licences conservées).
Le skill `design-taste-frontend` (kit de 26 Mo) reste dans le dépôt `skills`.

## Avant une mise en ligne

Voir `CONTENU-A-COMPLETER.md` : lien de réservation, adresse, rituels à valider (noms, durées, tarifs),
photographies en haute définition, mentions légales, nom de domaine.
