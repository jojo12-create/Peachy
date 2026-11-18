#!/usr/bin/env python3
"""
Peachy — matières procédurales (raccords invisibles, WebP avec transparence).

Chaque matière est une image noir/blanc transparente : elle se pose sur
n'importe quelle couleur de la palette sans mode de fusion (coût GPU nul).

    python3 tools/textures.py
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

OUT = Path(__file__).resolve().parent.parent / "assets" / "img" / "textures"
DARK = (40, 23, 15)      # chocolat
LIGHT = (255, 244, 230)  # ivoire chaud
rng = np.random.default_rng(7)


def fbm(n, beta):
    """Bruit périodique filtré en 1/f^beta (raccord parfait par construction)."""
    f = np.fft.fft2(rng.normal(size=(n, n)))
    fy, fx = np.meshgrid(np.fft.fftfreq(n), np.fft.fftfreq(n), indexing="ij")
    r = np.sqrt(fx ** 2 + fy ** 2)
    r[0, 0] = 1
    out = np.real(np.fft.ifft2(f / r ** beta))
    return (out - out.mean()) / out.std()


def to_rgba(field, strength_dark, strength_light):
    """field ~ N(0,1) : négatif → voile sombre, positif → voile clair."""
    h, w = field.shape
    img = np.zeros((h, w, 4), np.float64)
    neg = np.clip(-field, 0, 3) / 3
    pos = np.clip(field, 0, 3) / 3
    use_dark = neg >= pos
    img[..., :3] = np.where(use_dark[..., None], DARK, LIGHT)
    img[..., 3] = np.where(use_dark, neg * strength_dark, pos * strength_light) * 255
    return Image.fromarray(img.clip(0, 255).astype(np.uint8), "RGBA")


def fibres(n, count, length, alpha):
    """Fibres de papier : petits traits courbes, dessinés sur une mosaïque 3×3."""
    big = Image.new("L", (n * 3, n * 3), 0)
    d = ImageDraw.Draw(big)
    for _ in range(count):
        x, y = rng.uniform(n, 2 * n, 2)
        ang = rng.uniform(0, np.pi)
        pts = []
        for i in range(6):
            pts.append((x, y))
            ang += rng.normal(0, 0.35)
            x += np.cos(ang) * length / 6
            y += np.sin(ang) * length / 6
        for ox in (-n, 0, n):
            for oy in (-n, 0, n):
                d.line([(px + ox, py + oy) for px, py in pts], fill=int(alpha * rng.uniform(0.4, 1)), width=1)
    return np.asarray(big.crop((n, n, 2 * n, 2 * n)).filter(ImageFilter.GaussianBlur(0.6)), np.float64) / 255


def save(img, name, quality=55):
    OUT.mkdir(parents=True, exist_ok=True)
    img.save(OUT / f"{name}.webp", quality=quality, method=6, alpha_quality=45)
    print(f"{name}.webp", img.size, (OUT / f"{name}.webp").stat().st_size // 1024, "Ko")


def papier():
    """Papier artisanal : grain fin + fibres claires et sombres."""
    n = 192
    field = fbm(n, 0.3) * 0.8 + fbm(n, 0.9) * 0.22
    field -= fibres(n, 70, 22, 255) * 2.2
    field += fibres(n, 40, 16, 255) * 1.6
    save(to_rgba(field, 0.12, 0.22), "papier")


def enduit():
    """Enduit minéral : marbrures larges et taloche légère."""
    n = 384
    field = fbm(n, 2.1) * 1.0 + fbm(n, 1.1) * 0.35 + fbm(n, 0.3) * 0.22
    save(to_rgba(field, 0.085, 0.16), "enduit", quality=50)


def chocolat():
    """Chocolat mat : poudre claire très fine + nuances profondes."""
    n = 192
    field = fbm(n, 0.2) * 0.85 + fbm(n, 0.9) * 0.25
    save(to_rgba(field, 0.20, 0.055), "chocolat")


def lin():
    """Lin naturel : trame et chaîne irrégulières."""
    n = 256
    y, x = np.mgrid[0:n, 0:n]
    period = 4
    warp = np.sin(2 * np.pi * (x / period + fbm(n, 1.6) * 0.18))
    weft = np.sin(2 * np.pi * (y / period + fbm(n, 1.6) * 0.18))
    weave = np.where(((x // period) + (y // period)) % 2 == 0, warp, weft)
    field = weave * 0.9 + fbm(n, 0.4) * 0.5 + fbm(n, 2.0) * 0.4
    save(to_rgba(field, 0.11, 0.13), "lin")


def frond(d, base, angle, length, leaflets, spread, curve, scale):
    """Une palme : nervure courbe et folioles effilées de part et d'autre."""
    bx, by = base
    pts = []
    for i in range(leaflets + 1):
        t = i / leaflets
        a = angle + curve * t * t
        pts.append((bx + np.cos(a) * length * t, by + np.sin(a) * length * t, a))
    d.line([(p[0], p[1]) for p in pts], fill=255, width=max(2, int(5 * scale)))
    for i, (x, y, a) in enumerate(pts[2:], 2):
        t = i / leaflets
        env = np.sin(np.pi * min(1, t * 1.08)) ** 0.6 * (1 - 0.35 * t)
        ll = length * 0.42 * env * rng.uniform(0.85, 1.1)
        for side in (-1, 1):
            la = a + side * (spread - 0.35 * t) + rng.normal(0, 0.05)
            tip = (x + np.cos(la) * ll, y + np.sin(la) * ll + ll * 0.12)
            wdt = max(2.0, 9 * scale * env)
            nx, ny = -np.sin(la) * wdt, np.cos(la) * wdt
            mid = (x + np.cos(la) * ll * 0.35, y + np.sin(la) * ll * 0.35)
            d.polygon([(x, y), (mid[0] + nx, mid[1] + ny), tip, (mid[0] - nx, mid[1] - ny)], fill=255)


def ombre_palme():
    """Ombre végétale projetée : deux palmes, deux profondeurs de flou."""
    w, h = 1400, 1000
    near = Image.new("L", (w, h), 0)
    far = Image.new("L", (w, h), 0)
    frond(ImageDraw.Draw(near), (w + 60, -40), 2.42, 1180, 30, 1.05, 0.34, 1.25)
    frond(ImageDraw.Draw(far), (w + 220, 260), 2.86, 1050, 26, 1.0, -0.28, 1.0)
    frond(ImageDraw.Draw(far), (w - 260, -120), 1.95, 760, 22, 1.0, 0.25, 0.8)
    a = np.asarray(near.filter(ImageFilter.GaussianBlur(9)), np.float64) * 0.55 \
        + np.asarray(far.filter(ImageFilter.GaussianBlur(22)), np.float64) * 0.36
    # la lumière s'éteint vers le bas-gauche
    y, x = np.mgrid[0:h, 0:w]
    fade = np.clip(1.15 - ((w - x) / w) * 0.75 - (y / h) * 0.55, 0, 1)
    a = np.clip(a * fade, 0, 255)
    img = np.zeros((h, w, 4), np.uint8)
    img[..., :3] = DARK
    img[..., 3] = a.astype(np.uint8)
    save(Image.fromarray(img, "RGBA"), "ombre-palme", quality=60)


if __name__ == "__main__":
    papier()
    enduit()
    chocolat()
    lin()
    ombre_palme()
