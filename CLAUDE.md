# Peachy

Avant de construire ou de modifier une interface, lire `DESIGN.md`.

- Site statique sans build : `python3 -m http.server 4173` pour le voir.
- Les valeurs de design vivent dans `assets/css/tokens.css`.
- Les informations à fournir par Peachy se règlent dans `assets/js/config.js` et sont listées dans `CONTENU-A-COMPLETER.md`.
- Les images du site sortent de `python3 tools/retouche.py` ; les originaux de `photos/originaux` ne se modifient pas.
- Ne rien inventer : adresse, tarifs, durées, certifications, témoignages, promesses médicales.
- Trois versions : la racine (version d'origine), `v2/` (copie fidèle, à garder telle quelle) et `v3/` (couverture « serviette brodée »). Chaque dossier est un site complet.
- La couverture de la v3 sort de `python3 tools/serviette.py` (dépendances : `opencv-contrib-python-headless`, `scikit-image`) ; on la voit sur `http://localhost:4173/v3/`.
