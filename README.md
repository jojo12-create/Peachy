# Peachy — Lymphatic Therapy

Site de démonstration de Peachy, centre spécialisé dans le drainage lymphatique.
Une page en chapitres, qui s'ouvre sur le nom gravé dans le cuir, consacre une bannière à chaque prestation
et alterne deux univers (**Chocolat immersif** et **Crème éditoriale**).

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
| `index.html` | La page : la couverture, 8 chapitres et le pied de page |
| `mentions-legales.html`, `confidentialite.html` | Pages de texte (champs à compléter, non indexées) |
| `assets/css/tokens.css` | Variables de design : couleurs, matières, typographie, ombres, rayons, espacements, mouvement |
| `assets/css/base.css` | Typographie, matières, boutons, cadres photo, barre de navigation, menu, chapitres |
| `assets/css/sections.css` | Mise en page de chaque chapitre (mobile d'abord) |
| `assets/css/motion.css` | Entrée de la couverture, passage d'un chapitre à l'autre, révélations, mouvement réduit |
| `assets/js/config.js` | **Réservation, coordonnées, Instagram, témoignages** : tout ce qui reste à fournir se règle ici |
| `assets/js/main.js` | Navigation, menu, chapitres, révélations, repli des transitions |
| `assets/img/logo/` | Le lettrage de la maison : nom, version pour petites tailles, initiale, noms des prestations, nom gravé |
| `assets/img/photos/` | Photos retouchées (AVIF + WebP, plusieurs largeurs) |
| `assets/img/textures/` | Matières : papier terracotta, cuir, papier, enduit, chocolat, lin, ombre de palme |
| `photos/originaux/` | Photos d'origine, jamais modifiées |
| `tools/` | Chaîne de retouche, générateurs de matières, tracé du lettrage |
| `tools/sources/` | Maquettes fournies par Peachy (papier, cuir), d'où viennent les deux matières terracotta |
| `DESIGN.md` | Règles de design du projet |
| `PRODUCT.md` | Contexte produit |
| `CONTENU-A-COMPLETER.md` | Ce qui reste à fournir ou à valider |

## Le parcours

1. **Couverture** (cuir) : le nom gravé à blanc, et rien d'autre.
2. **Drainage lymphatique** (chocolat) : bannière, photo du soin, principe, approche, séance, sensations.
3. **Luminothérapie** (crème) : bannière, photo à droite.
4. **Brossage à sec** (papier terracotta) : bannière.
5. **La philosophie** (crème) : composition éditoriale, portrait en arche, ombre végétale. C'est le « À propos » de la barre.
6. **Le geste** (chocolat) : « Chaque geste a son intention. »
7. **L'univers Peachy** (crème) : galerie éditoriale du lieu.
8. **L'expérience** (beige minéral) : structure prête pour de vrais témoignages.
9. **Réserver** (chocolat profond) : « Un moment rien qu'à vous. »
10. **Pied de page** (cuir) : navigation, Instagram, mentions.

D'un chapitre à l'autre, le suivant arrive par-dessus le précédent, qui recule et s'assombrit.

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

Le cuir de la couverture, le papier terracotta et la gravure du nom, tirés des maquettes de `tools/sources` :

```bash
python3 tools/couverture.py
```

## Lettrage

Le nom PEACHY, son sous-titre et les noms des prestations sont dessinés à la plume par `tools/lettrage.mjs` :
chaque lettre y est décrite par quelques traits. Pour le régénérer (Node, puis `npm install` une fois dans `tools/`) :

```bash
node tools/lettrage.mjs
```

La commande écrit les fichiers de `assets/img/logo`, `favicon.svg` et le masque de la gravure
(`tools/sources/masque-mot.png`) ; relancer ensuite `python3 tools/couverture.py`.
Pour ajouter une prestation, ajouter sa ligne dans `LIGNES` (et les lettres qui manqueraient dans `LETTRES`).

## Skills de design

Les skills utilisés pour ce site sont installés dans `.claude/skills/` (copiés depuis le dépôt `skills`, licences conservées).
Le skill `design-taste-frontend` (kit de 26 Mo) reste dans le dépôt `skills`.

## Avant une mise en ligne

Voir `CONTENU-A-COMPLETER.md` : lien de réservation, adresse, rituels à valider (noms, durées, tarifs),
photographies en haute définition, mentions légales, nom de domaine.
