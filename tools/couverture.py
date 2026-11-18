#!/usr/bin/env python3
"""
Peachy — couverture : papier terracotta et logo gravé à blanc.

Produit deux fichiers :
  assets/img/textures/papier-terracotta.webp  matière du papier (raccord invisible)
  assets/img/logo/peachy-gravure.webp         gravure du logo : uniquement les ombres
                                              et les lumières du creux, en transparence

Le papier est un relief (fibres, grain, feutrage) éclairé par une lumière venant du
haut à gauche. La gravure est calculée avec la même lumière : bord haut-gauche du
creux dans l'ombre, bord bas-droit accroché par la lumière, fond du creux légèrement
tassé. Le logo n'a donc pas de couleur propre : c'est le papier lui-même, pressé.

    python3 tools/couverture.py

Le masque du logo (tools/masque-logo.png) est un rendu noir sur blanc de
assets/img/logo/peachy-logo-mono.svg, en 1300 × 1053 px.
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
PAPIER = np.array([122, 70, 43]) / 255.0      # terracotta du papier (--papier)
LUMIERE = np.array([1.0, 1.0]) / np.sqrt(2)   # la lumière vient du haut à gauche
rng = np.random.default_rng(11)


def flou(a, sigma):
    """Flou gaussien en pleine précision, calculé en fréquences (donc périodique :
    sans couture pour une tuile, sans effet de bord pour un masque entouré de marge)."""
    fy = np.fft.fftfreq(a.shape[0])[:, None]
    fx = np.fft.fftfreq(a.shape[1])[None, :]
    return np.real(np.fft.ifft2(np.fft.fft2(a) * np.exp(-2 * (np.pi * sigma) ** 2 * (fx ** 2 + fy ** 2))))


flou_periodique = flou


def bruit(n, beta, lo=None, hi=None):
    """Bruit périodique en 1/f^beta, éventuellement limité à une bande de longueurs d'onde (px)."""
    f = np.fft.fft2(rng.normal(size=(n, n)))
    fy, fx = np.meshgrid(np.fft.fftfreq(n), np.fft.fftfreq(n), indexing="ij")
    r = np.sqrt(fx ** 2 + fy ** 2)
    r[0, 0] = 1
    filtre = 1 / r ** beta
    if lo:
        filtre *= r < 1 / lo
    if hi:
        filtre *= r > 1 / hi
    out = np.real(np.fft.ifft2(f * filtre))
    return (out - out.mean()) / out.std()


def fibres(n, nombre, longueur, epaisseur=1):
    """Fibres courtes et courbes, dessinées sur une mosaïque 3 × 3 pour le raccord."""
    grand = Image.new("L", (n * 3, n * 3), 0)
    d = ImageDraw.Draw(grand)
    for _ in range(nombre):
        x, y = rng.uniform(n, 2 * n, 2)
        angle = rng.uniform(0, np.pi)
        L = longueur * rng.uniform(0.4, 1.5)
        pts = []
        for _ in range(7):
            pts.append((x, y))
            angle += rng.normal(0, 0.4)
            x += np.cos(angle) * L / 7
            y += np.sin(angle) * L / 7
        ton = int(rng.uniform(90, 255))
        for ox in (-n, 0, n):
            for oy in (-n, 0, n):
                d.line([(px + ox, py + oy) for px, py in pts], fill=ton, width=epaisseur)
    return np.asarray(grand.crop((n, n, 2 * n, 2 * n)), np.float64) / 255


def eclairage(relief, force):
    """Ombrage d'un relief par la lumière rasante : pente tournée vers la lumière = claire."""
    gy, gx = np.gradient(relief)
    return 1 - force * (gx * LUMIERE[0] + gy * LUMIERE[1])


def papier(n=768):
    """Papier coton feutré : fibres en relief, grain fin, nuages de pâte, quelques inclusions."""
    relief = (
        flou_periodique(fibres(n, 9000, 22), 0.75) * 1.0
        + flou_periodique(fibres(n, 1500, 52, 2), 1.3) * 0.7
        + bruit(n, 0.15) * 0.24
        + bruit(n, 1.2, lo=4, hi=26) * 0.20
    )
    lumiere = eclairage(relief, 0.34)
    lumiere = 1 + (lumiere - lumiere.mean())
    teinte = 1 + bruit(n, 1.2, lo=8, hi=36) * 0.012 + bruit(n, 0.3) * 0.014
    img = PAPIER[None, None, :] * (lumiere * teinte)[..., None]
    # inclusions : rares fibres sombres et points clairs pris dans la pâte
    sombres = flou_periodique(fibres(n, 70, 8), 0.6)
    clairs = flou_periodique(fibres(n, 44, 6), 0.5)
    img = img * (1 - 0.42 * sombres[..., None]) + 0.10 * clairs[..., None]
    out = ROOT / "assets" / "img" / "textures" / "papier-terracotta.webp"
    Image.fromarray((img.clip(0, 1) * 255).astype(np.uint8)).save(out, quality=82, method=6)
    print(out.name, (n, n), out.stat().st_size // 1024, "Ko")


def decale(a, d):
    """Décale l'image de d pixels dans le sens de la lumière (vers le bas à droite)."""
    d = int(round(d))
    out = np.zeros_like(a)
    out[d:, d:] = a[:-d, :-d]
    return out


def gravure():
    masque = 1 - np.asarray(Image.open(ROOT / "tools" / "masque-logo.png").convert("L"), np.float64) / 255
    marge = 40
    masque = np.pad(masque, marge)
    net = flou(masque, 1.1)                    # arête du creux
    doux = flou(masque, 4.5)                   # modelé large
    # 1. paroi du creux : sombre côté lumière, éclairée du côté opposé
    gy, gx = np.gradient(net)
    pente = gx * LUMIERE[0] + gy * LUMIERE[1]
    paroi_ombre = np.clip(pente, 0, None) * 2.6
    paroi_claire = np.clip(-pente, 0, None) * 2.6
    # 2. ombre portée par le bord haut-gauche sur le fond du creux
    portee = np.clip(net - decale(doux, 5), 0, 1) * net
    # 3. fond du creux : papier tassé, un peu plus dense
    fond = net
    # 4. bourrelet : la fibre remonte légèrement autour du creux, côté lumière opposé
    bourrelet = np.clip(decale(doux, 3) - net, 0, 1) * (1 - net)

    a_ombre = np.clip(0.66 * paroi_ombre + 0.56 * portee + 0.20 * fond, 0, 0.85)
    a_clair = np.clip(0.52 * paroi_claire + 0.26 * bourrelet, 0, 0.6)
    ombre = np.array([44, 20, 9]) / 255
    clair = np.array([255, 214, 172]) / 255
    alpha = a_ombre + a_clair - a_ombre * a_clair
    rgb = (ombre[None, None] * a_ombre[..., None] + clair[None, None] * a_clair[..., None]) / np.maximum(a_ombre + a_clair, 1e-6)[..., None]
    img = np.dstack([rgb, alpha])
    out = ROOT / "assets" / "img" / "logo" / "peachy-gravure.webp"
    Image.fromarray((img.clip(0, 1) * 255).astype(np.uint8), "RGBA").save(out, quality=88, method=6, alpha_quality=96)
    print(out.name, img.shape[1::-1], out.stat().st_size // 1024, "Ko")


if __name__ == "__main__":
    papier()
    gravure()
