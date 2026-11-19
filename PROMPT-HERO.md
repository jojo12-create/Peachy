# Prompts — la serviette brodée au format du hero

L'image fournie fait 1448 × 1011 px et la broderie touche presque le bord droit. Pour un hero plein écran,
il faut la même image avec plus de marge, en plus haute définition, et sa jumelle sans broderie.
Une fois les images obtenues : les déposer dans `photos/originaux` (`serviette-brodee.jpg`, `serviette-nue.jpg`)
et lancer `python3 tools/serviette.py`.

Joindre l'image actuelle comme référence à chaque prompt.

## 1. Image brodée, format ordinateur (16:9)

```
Use the attached image as the exact reference. Recreate the same photograph as a wide, full-bleed website hero.

Keep everything identical: the cream terry towel with soft diagonal folds, the flat woven band with its two
raised corded edges, the warm soft daylight coming from the upper left, and the chocolate-brown satin-stitch
embroidery sunk slightly into the pile. Same typeface (thin geometric capitals, the A drawn without crossbar),
same thread colour, same tilt, same layout:

Left block, two lines: L’ART DE PRENDRE / SOIN DE SOI
A thin embroidered vertical line
Right block, five lines: LA MAISON / LES RITUELS / LE DRAINAGE LYMPHATIQUE / LA PHILOSOPHIE / L’UNIVERS
On the woven band below: PEACHY, large, and LYMPHATIC THERAPY, small, underneath

Only the framing changes: pull the camera back so that all the embroidery sits inside the central 70% of the
width and the central 65% of the height, with plain towel continuing naturally on every side. Nothing embroidered
is cropped or touches an edge. The towel fills the whole frame: no table, no background, no hands, no objects.

Spelling must be exact, with the French apostrophes. No extra words, no logo mark, no watermark.
Macro product photography, every terry loop and every stitch in focus across the whole frame, no depth-of-field blur.
Aspect ratio 16:9, 3840 × 2160.
```

## 2. La même, sans broderie (avant couture)

À lancer sur l'image obtenue au prompt 1, pour que les deux se superposent.

```
Use the attached image as the exact reference. Produce the same photograph with all embroidery removed:
no letters, no vertical line, no logo. Where the thread was, the terry loops and the woven band are intact,
with no dent, shadow, ghost or colour trace left behind.

Everything else stays pixel-aligned with the reference: same framing, same folds in the same places, same woven
band and corded edges, same light, same colour, same sharpness. Same size and aspect ratio as the reference.
```

## 3. Version téléphone (9:16)

Facultatif : sur un téléphone, le site recompose déjà lui-même les mots brodés en pile verticale à partir de
l'image large. Une vraie image verticale donnerait seulement des lettres plus nettes de près.

```
Use the attached image as the exact reference for the towel, the light, the thread and the typeface.
Recompose the same embroidered towel for a vertical phone screen.

From top to bottom, centred, with generous plain towel above and below:
1. L’ART DE PRENDRE / SOIN DE SOI, on two lines
2. a short embroidered horizontal line
3. LA MAISON / LES RITUELS / LE DRAINAGE LYMPHATIQUE / LA PHILOSOPHIE / L’UNIVERS, one per line
4. the flat woven band crossing the full width, embroidered with PEACHY and, smaller underneath, LYMPHATIC THERAPY

All embroidery stays inside the central 78% of the width. Same slight tilt and same soft diagonal folds as the
reference, so the lines of text follow the waves of the fabric. The towel fills the whole frame.
Exact spelling, French apostrophes, nothing else written. Macro product photography, everything in focus.
Aspect ratio 9:16, 2160 × 3840.
```

Puis le prompt 2 sur cette image verticale, pour sa version sans broderie.

## 4. En vidéo (facultatif)

L'animation du site est calculée à partir des deux images : aucune vidéo n'est nécessaire. Ce prompt sert
seulement à comparer avec un générateur de vidéo (image de fin = l'image brodée).

```
Locked-off top-down macro shot, the attached image is the final frame.
A cream terry towel drops softly onto a surface from just above the lens: it lands, soft diagonal folds form
and settle, then the fabric is completely still. No embroidery yet.
Then chocolate-brown thread embroiders itself onto the towel, stitch by stitch, with no needle, no machine and
no hands visible: first L’ART DE PRENDRE / SOIN DE SOI, then the thin vertical line from top to bottom, then
LA MAISON, LES RITUELS, LE DRAINAGE LYMPHATIQUE, LA PHILOSOPHIE, L’UNIVERS one after the other, and finally
PEACHY and LYMPHATIC THERAPY on the woven band. Each satin stitch sinks slightly into the pile and follows the
folds of the fabric. The camera never moves. Soft warm daylight from the upper left. Exact spelling, no other text.
10 seconds, 16:9.
```
