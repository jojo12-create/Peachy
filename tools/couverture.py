#!/usr/bin/env python3
"""
Peachy — la couverture : le cuir grainé, le nom gravé à blanc, et le papier feutré.

Produit trois fichiers :
  assets/img/textures/cuir.webp               cuir grainé de la première page et du pied de page
  assets/img/textures/papier-terracotta.webp  papier feutré (bannière du brossage à sec)
  assets/img/logo/peachy-mot-gravure.webp     nom gravé à blanc dans le cuir : uniquement
                                              les ombres et les lumières du creux

    python3 tools/couverture.py

Les deux matières viennent des maquettes fournies par Peachy (tools/sources). Une maquette
ne se répète pas : on en relève donc la « signature » (le spectre d'une zone sans logo) et
on la rejoue sur un bruit blanc. Le résultat a le même grain, la même couleur, les mêmes
nuances que la maquette, et se raccorde sans couture dans les deux sens.

La gravure est calculée avec une lumière venant du haut à gauche : bord haut-gauche du
creux dans l'ombre, bord bas-droit accroché par la lumière, fond du creux tassé et assombri.
Le masque du nom (tools/sources/masque-mot.png) est écrit par tools/lettrage.mjs.
"""
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SOURCES = ROOT / "tools" / "sources"
LUMIERE = np.array([1.0, 1.0]) / np.sqrt(2)   # la lumière vient du haut à gauche
TUILE = 768


def flou(a, sigma):
    """Flou gaussien en pleine précision, calculé en fréquences (donc périodique)."""
    fy = np.fft.fftfreq(a.shape[0])[:, None]
    fx = np.fft.fftfreq(a.shape[1])[None, :]
    noyau = np.exp(-2 * (np.pi * sigma) ** 2 * (fx ** 2 + fy ** 2))
    if a.ndim == 3:
        noyau = noyau[..., None]
    return np.real(np.fft.ifft2(np.fft.fft2(a, axes=(0, 1)) * noyau, axes=(0, 1)))


def flou_sans_bord(a, sigma):
    """Même flou, sur une image prolongée en miroir : pas de fuite d'un bord à l'autre."""
    p = int(3 * sigma)
    return flou(np.pad(a, ((p, p), (p, p), (0, 0)), mode="reflect"), sigma)[p:-p, p:-p]


def matiere(source, zone, sortie, graine, qualite=80):
    """Rejoue le grain d'une zone de maquette sur une tuile sans couture.

    La zone est débarrassée de son éclairage (tout ce qui est plus large que 40 px),
    fondue sur ses bords, puis convoluée avec un bruit blanc : chaque canal reçoit le
    même bruit, ce qui conserve la couleur du grain."""
    zone_px = np.asarray(Image.open(SOURCES / source).convert("RGB").crop(zone), float) / 255
    couleur = zone_px.mean((0, 1))
    grain = zone_px - flou_sans_bord(zone_px, 40)
    h, w, _ = grain.shape

    def fenetre(n, bord=24):
        f = np.ones(n)
        f[:bord] = np.sin(np.linspace(0, 1, bord) * np.pi / 2) ** 2
        f[-bord:] = f[:bord][::-1]
        return f

    masque = fenetre(h)[:, None] * fenetre(w)[None, :]
    motif = np.zeros((TUILE, TUILE, 3))
    hh, ww = min(h, TUILE), min(w, TUILE)
    motif[:hh, :ww] = (grain * masque[..., None])[:hh, :ww] / np.sqrt((masque[:hh, :ww] ** 2).sum())
    bruit = np.fft.fft2(np.random.default_rng(graine).normal(size=(TUILE, TUILE)))
    tuile = np.real(np.fft.ifft2(np.fft.fft2(motif, axes=(0, 1)) * bruit[..., None], axes=(0, 1)))
    img = (couleur + tuile).clip(0, 1)
    chemin = ROOT / "assets" / "img" / "textures" / sortie
    Image.fromarray((img * 255).round().astype(np.uint8)).save(chemin, quality=qualite, method=6)
    teinte = "#%02x%02x%02x" % tuple(int(round(c * 255)) for c in couleur)
    print(f"{sortie:26s} {TUILE} px  {chemin.stat().st_size // 1024} Ko  couleur moyenne {teinte}")


def decale(a, d):
    """Décale l'image de d pixels dans le sens de la lumière (vers le bas à droite)."""
    d = int(round(d))
    out = np.zeros_like(a)
    out[d:, d:] = a[:-d, :-d]
    return out


def gravure(masque_png, sortie, fond_creux=0.34):
    """Gravure à blanc : la matière pressée, sans encre ni dorure."""
    masque = 1 - np.asarray(Image.open(SOURCES / masque_png).convert("L"), np.float64) / 255
    masque = np.pad(masque, 40)
    net = flou(masque, 1.1)                    # arête du creux
    doux = flou(masque, 4.5)                   # modelé large
    # 1. paroi du creux : sombre côté lumière, éclairée du côté opposé
    gy, gx = np.gradient(net)
    pente = gx * LUMIERE[0] + gy * LUMIERE[1]
    paroi_ombre = np.clip(pente, 0, None) * 2.6
    paroi_claire = np.clip(-pente, 0, None) * 2.6
    # 2. ombre portée par le bord haut-gauche sur le fond du creux
    portee = np.clip(net - decale(doux, 5), 0, 1) * net
    # 3. fond du creux : cuir tassé par le fer, plus dense et plus sombre
    fond = net
    # 4. bourrelet : la matière remonte légèrement autour du creux, du côté opposé à la lumière
    bourrelet = np.clip(decale(doux, 3) - net, 0, 1) * (1 - net)

    a_ombre = np.clip(0.66 * paroi_ombre + 0.56 * portee + fond_creux * fond, 0, 0.85)
    a_clair = np.clip(0.52 * paroi_claire + 0.26 * bourrelet, 0, 0.6)
    ombre = np.array([44, 20, 9]) / 255
    clair = np.array([255, 214, 172]) / 255
    alpha = a_ombre + a_clair - a_ombre * a_clair
    rgb = (ombre[None, None] * a_ombre[..., None] + clair[None, None] * a_clair[..., None]) / np.maximum(a_ombre + a_clair, 1e-6)[..., None]
    img = np.dstack([rgb, alpha])
    chemin = ROOT / "assets" / "img" / "logo" / sortie
    Image.fromarray((img.clip(0, 1) * 255).astype(np.uint8), "RGBA").save(chemin, quality=88, method=6, alpha_quality=96)
    print(f"{sortie:26s} {img.shape[1]} × {img.shape[0]}  {chemin.stat().st_size // 1024} Ko")


if __name__ == "__main__":
    # zones sans logo : le bas de la page de papier, le haut de la page de cuir
    matiere("maquette-papier.jpg", (40, 930, 1046, 1440), "papier-terracotta.webp", graine=7)
    matiere("maquette-cuir.jpg", (60, 40, 897, 620), "cuir.webp", graine=11, qualite=66)
    gravure("masque-mot.png", "peachy-mot-gravure.webp")
