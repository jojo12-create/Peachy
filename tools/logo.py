#!/usr/bin/env python3
"""
Peachy — logo, étape 1 : le masque.

Isole le logo de la maquette fournie par Peachy (tools/sources/maquette-papier.jpg :
dorure crème sur papier terracotta) et en tire un masque noir sur blanc, agrandi 8×,
prêt à être vectorisé par tools/logo.mjs.

    python3 tools/logo.py && node tools/logo.mjs

Chaque pixel est projeté sur l'axe « couleur du papier → couleur de la dorure » :
la texture du papier et le grain de la dorure s'effacent, il ne reste que le dessin.
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "tools" / "sources" / "maquette-papier.jpg"
CADRE = (280, 515, 810, 905)        # zone du logo dans la maquette (px)
ECHELLE = 8
PAPIER = np.array([116, 65, 40.0])
DORURE = np.array([236, 205, 160.0])
SEUIL = 0.46

img = np.asarray(Image.open(SOURCE).convert("RGB").crop(CADRE), float)
axe = DORURE - PAPIER
t = np.clip(((img - PAPIER) @ axe) / (axe @ axe), 0, 1)
gris = Image.fromarray(np.uint8(t * 255))
gris = gris.resize((gris.width * ECHELLE, gris.height * ECHELLE), Image.BICUBIC)
gris = gris.filter(ImageFilter.GaussianBlur(ECHELLE * 0.35))
masque = np.asarray(gris, float) / 255 > SEUIL
sortie = ROOT / "tools" / "sources" / "logo-masque.png"
Image.fromarray(np.uint8(~masque) * 255).save(sortie, optimize=True)
print(sortie.relative_to(ROOT), gris.size)
