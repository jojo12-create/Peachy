# Contenus à fournir ou à valider

Rien de ce qui suit n'a été inventé : ce qui manque est absent du site ou marqué comme provisoire.

## À fournir

| Élément | Où le renseigner | État actuel sur le site |
|---|---|---|
| Lien du système de réservation | `assets/js/config.js` → `reservation.url` | Le bouton « Réserver mon soin » ouvre Instagram, avec une note d'attente |
| Adresse et lien d'itinéraire | `assets/js/config.js` → `coordonnees` | Masqués dans le pied de page |
| Téléphone, e-mail | `assets/js/config.js` → `coordonnees` | Masqués |
| Témoignages réels et validés | `assets/js/config.js` → `temoignages` | La section affiche la phrase de la maison, sans aucun avis |
| Photographies en haute définition | `photos/originaux/` (mêmes noms de fichiers), puis `python3 tools/retouche.py` | Vignettes de la grille Instagram (382 px de large) agrandies 4× |
| Nom de domaine | `og:image`, `og:url`, lien canonique dans `index.html` | Chemin relatif pour l'image de partage, pas de lien canonique |
| Mentions légales (éditeur, immatriculation, hébergeur) | `mentions-legales.html` | Champs marqués « à compléter », page non indexée |
| Contact pour les données personnelles, hébergeur | `confidentialite.html` | Champs marqués « à compléter », page non indexée |

## À valider

| Élément | Origine | Où le modifier |
|---|---|---|
| Les trois rituels : **Drainage lymphatique**, **Luminothérapie**, **Brossage à sec** | Relevés sur les publications Instagram de Peachy (le soin, la publication « La luminothérapie, c'est quoi ? », la brosse). À confirmer comme prestations réservables | `index.html`, section `#rituels` |
| Descriptions des rituels | Rédigées sans durée, sans tarif, sans promesse de résultat | `index.html`, section `#rituels` |
| Durées et tarifs | Non fournis, donc absents | À ajouter dans chaque carte |
| Déroulé de la séance (« un échange, puis le soin, allongée, au chaud ») | Formulation générale à confirmer | `index.html`, section `#drainage` |
| Textes de marque (philosophie, geste, univers, phrase de la section Expérience) | Rédigés pour la démo | `index.html` |
| Liens de navigation « À propos » et « Contact » | Repris du moodboard ; ils mènent à la philosophie et au pied de page | `index.html` |

## Photographies utilisées

Toutes viennent de la grille Instagram de Peachy. Chaque photo n'apparaît qu'une fois.

| Section | Fichier d'origine |
|---|---|
| 01 Hero | `massage-dos` |
| 02 Philosophie | `clavicule-roses`, `vase-ombre` |
| 03 Drainage | `jambes` |
| 04 Rituels | `ventre-main`, `bandeau-mains`, `brosse` |
| 05 Le geste | `main-dos` (partie basse : la partie haute porte un texte) |
| 06 Univers | `niches-mur`, `jarre-chapeau`, `mains-huile`, `niches-haut` (partie haute), `buste-niches` |
| 08 Réserver | `dos-fougere` |

Non retenues : la photo avec le magazine et le masque (marques visibles), le flacon d'huile (marque visible),
les portraits de personnes reconnaissables, la plage, les visuels avec texte, la vue large de la salle,
la lumière rouge (hors palette). `miroir` est conservée dans les originaux mais incomplète sur la capture.

## Prolongement génératif des photos

Demandé : étendre une photo en générant la suite de l'image quand un format l'exige, en gardant la photo exacte.
Non réalisé dans cette version : aucun modèle image vers image n'est joignable depuis l'environnement de travail
(le compte Figma Weave n'est pas lié ; un essai avec le modèle libre LaMa a donné un résultat inutilisable).
La mise en page s'appuie donc sur le format natif des photos, sans fondu ni faux bord.
Pour l'activer : lier le compte Weave à Figma, ou fournir des originaux plus larges.
