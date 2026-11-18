#!/usr/bin/env python3
"""
Peachy — chaîne de retouche photo.

Lit les originaux (photos/originaux), applique la charte de retouche Peachy
(étalonnage chaud, ombres chocolat, hautes lumières crème, grain fin), recadre
et exporte en AVIF + WebP aux largeurs utiles dans assets/img/photos.

Les originaux ne sont jamais modifiés.

    python3 tools/retouche.py            # toutes les photos du manifeste
    python3 tools/retouche.py hero-large # une seule sortie

Dépendances : Pillow >= 11.3 (AVIF natif), numpy.
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
ORIG = ROOT / "photos" / "originaux"
HD = ROOT / "photos" / "hd"          # optionnel : versions haute définition (même nom)
OUT = ROOT / "assets" / "img" / "photos"
MANIFEST = ROOT / "tools" / "photos.json"

CHOCOLAT = np.array([0x28, 0x17, 0x0F]) / 255.0

# ── Charte de retouche ────────────────────────────────────────────────────────
PRESETS = {
    # Sections sombres : contrastes doux mais profonds, ombres chocolat.
    "chocolat": dict(exposure=-0.015, contrast=0.30, shadow=0.20, high=0.10,
                     black=0.050, white=0.975, sat=0.93, warm=0.035, grain=0.016),
    # Sections claires : lumière diffuse, noirs relevés, hautes lumières crème.
    "creme": dict(exposure=0.020, contrast=0.14, shadow=0.12, high=0.16,
                  black=0.075, white=0.985, sat=0.90, warm=0.030, grain=0.013),
}
SHADOW_TINT = np.array([0.060, -0.004, -0.050])   # vers le chocolat
HIGH_TINT = np.array([0.030, 0.006, -0.040])      # vers la crème
LUMA = np.array([0.299, 0.587, 0.114])


def rgb_to_hsv(a):
    mx = a.max(-1)
    mn = a.min(-1)
    d = mx - mn
    h = np.zeros_like(mx)
    m = d > 1e-6
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    i = m & (mx == r)
    h[i] = ((g - b)[i] / d[i]) % 6
    i = m & (mx == g) & (mx != r)
    h[i] = (b - r)[i] / d[i] + 2
    i = m & (mx == b) & (mx != r) & (mx != g)
    h[i] = (r - g)[i] / d[i] + 4
    h = h / 6.0
    s = np.where(mx > 1e-6, d / np.maximum(mx, 1e-6), 0)
    return h, s, mx


def hsv_to_rgb(h, s, v):
    i = np.floor(h * 6).astype(int) % 6
    f = h * 6 - np.floor(h * 6)
    p, q, t = v * (1 - s), v * (1 - f * s), v * (1 - (1 - f) * s)
    out = np.zeros(h.shape + (3,))
    for k, (r, g, b) in enumerate([(v, t, p), (q, v, p), (p, v, t), (p, q, v), (t, p, v), (v, p, q)]):
        m = i == k
        out[m] = np.stack([r[m], g[m], b[m]], -1)
    return out


def smooth(x, lo, hi):
    t = np.clip((x - lo) / (hi - lo), 0, 1)
    return t * t * (3 - 2 * t)


def grade(a, preset):
    """Étalonnage : a = float RGB [0,1]."""
    p = PRESETS[preset]
    # 1. Les teintes froides (linge bleuté, ciel, reflets) rejoignent la palette chaude.
    h, s, v = rgb_to_hsv(a)
    deg = h * 360
    cool = smooth(deg, 140, 180) * (1 - smooth(deg, 265, 300))
    s = s * (1 - 0.80 * cool)
    # Les roses très vifs sont légèrement apaisés (vieux rose plutôt que fuchsia).
    pink = np.maximum(smooth(deg, 315, 340), 1 - smooth(deg, 0, 12)) * smooth(s, 0.35, 0.6)
    s = s * (1 - 0.14 * pink)
    a = hsv_to_rgb(h, s, v)
    # 2. Balance chaude légère.
    a = a * np.array([1 + p["warm"], 1.0, 1 - p["warm"] * 1.6])
    # 3. Exposition + courbe en S douce.
    a = np.clip(a + p["exposure"], 0, 1)
    sc = a * a * (3 - 2 * a)
    a = a + (sc - a) * p["contrast"]
    # 4. Virage partiel : ombres chocolat, hautes lumières crème.
    lum = (a @ LUMA)[..., None]
    a = a + ((1 - lum) ** 2) * SHADOW_TINT * (p["shadow"] / 0.2) \
          + (lum ** 2) * HIGH_TINT * (p["high"] / 0.2)
    # 5. Noirs relevés et teintés, blancs adoucis (jamais de noir ni de blanc pur).
    black = CHOCOLAT * (p["black"] / 0.09)
    white = np.array([1.0, 0.975, 0.94]) * p["white"]
    a = black + np.clip(a, 0, 1) * (white - black)
    # 6. Saturation globale légèrement contenue, tons chair préservés.
    lum = (a @ LUMA)[..., None]
    a = lum + (a - lum) * p["sat"]
    return np.clip(a, 0, 1)


def add_grain(a, amount, seed):
    """Grain photographique fin, plus présent dans les demi-teintes."""
    rng = np.random.default_rng(seed)
    n = rng.normal(0, 1, a.shape[:2])
    n = np.asarray(Image.fromarray(((n * 40) + 128).clip(0, 255).astype(np.uint8))
                   .filter(ImageFilter.GaussianBlur(0.55)), dtype=np.float64)
    n = (n - 128) / 40 * 1.6
    lum = a @ LUMA
    w = 0.55 + 0.45 * (1 - np.abs(lum * 2 - 1))
    return np.clip(a + (n * w * amount)[..., None], 0, 1)


def inpaint(a, box):
    """Efface un pictogramme d'interface (capture d'écran) par diffusion douce."""
    x0, y0, x1, y1 = box
    a = a.copy()
    m = np.zeros(a.shape[:2], bool)
    m[y0:y1, x0:x1] = True
    a[m] = a[max(0, y0 - 3):y1 + 3, max(0, x0 - 3):x1 + 3].reshape(-1, 3).mean(0)
    for _ in range(400):
        b = (np.roll(a, 1, 0) + np.roll(a, -1, 0) + np.roll(a, 1, 1) + np.roll(a, -1, 1)) / 4
        a[m] = b[m]
    return a


def blur(a, radius):
    im = Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8))
    return np.asarray(im.filter(ImageFilter.GaussianBlur(radius)), dtype=np.float64) / 255


def inpaint_region(a, box):
    """Efface une zone à pleine définition : diffusion calculée à basse résolution,
    puis fondue dans l'image avec un masque adouci."""
    x0, y0, x1, y1 = box
    h, w = a.shape[:2]
    m = 6
    f = max(1, (x1 - x0) // 44)
    X0, Y0, X1, Y1 = max(0, x0 - m * f * 3), max(0, y0 - m * f * 3), min(w, x1 + m * f * 3), min(h, y1 + m * f * 3)
    reg = Image.fromarray((a[Y0:Y1, X0:X1] * 255).astype(np.uint8))
    small = np.asarray(reg.resize((reg.width // f, reg.height // f), Image.LANCZOS), dtype=np.float64) / 255
    bx = ((x0 - X0) // f, (y0 - Y0) // f, min(small.shape[1], -(-(x1 - X0) // f)), min(small.shape[0], -(-(y1 - Y0) // f)))
    small = inpaint(small, bx)
    up = np.asarray(Image.fromarray((small * 255).astype(np.uint8)).resize(reg.size, Image.BICUBIC), dtype=np.float64) / 255
    mask = np.zeros((Y1 - Y0, X1 - X0))
    mask[y0 - Y0:y1 - Y0, x0 - X0:x1 - X0] = 1
    mask = np.asarray(Image.fromarray((mask * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(f * 1.5)), dtype=np.float64)[..., None] / 255
    a = a.copy()
    a[Y0:Y1, X0:X1] = a[Y0:Y1, X0:X1] * (1 - mask) + up * mask
    return a


def load(name, glyph):
    orig = Image.open(ORIG / f"{name}.png").convert("RGB")
    hd = HD / f"{name}.png"
    if hd.exists():
        im = Image.open(hd).convert("RGB")
    else:
        im = orig.resize((orig.width * 4, orig.height * 4), Image.LANCZOS)
    a = np.asarray(im, dtype=np.float64) / 255
    if glyph:
        k = im.width / orig.width
        x0, y0, x1, y1 = glyph
        a = inpaint_region(a, (int(x0 * k), int(y0 * k), min(im.width, int(x1 * k)), int(y1 * k)))
    return a


def process(entry):
    a = load(entry["src"], entry.get("glyph"))
    h, w = a.shape[:2]
    if "crop" in entry:                          # fractions x0,y0,x1,y1
        x0, y0, x1, y1 = entry["crop"]
        a = a[int(y0 * h):int(y1 * h), int(x0 * w):int(x1 * w)]
    a = grade(a, entry["preset"])
    h, w = a.shape[:2]
    full = Image.fromarray((a * 255).astype(np.uint8))
    sizes = []
    for width in entry["widths"]:
        width = min(width, w)
        im = full.resize((width, round(h * width / w)), Image.LANCZOS)
        g = add_grain(np.asarray(im, dtype=np.float64) / 255,
                      PRESETS[entry["preset"]]["grain"], seed=width)
        im = Image.fromarray((g * 255).astype(np.uint8))
        base = OUT / f"{entry['id']}-{width}"
        im.save(f"{base}.avif", quality=entry.get("avif", 58), speed=4)
        im.save(f"{base}.webp", quality=entry.get("webp", 78), method=6)
        sizes.append((width, im.height))
    return sizes


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    manifest = json.loads(MANIFEST.read_text())
    only = set(sys.argv[1:])
    sizes_file = ROOT / "tools" / "photos.sizes.json"
    known = {e["id"] for e in manifest["photos"]}
    report = {k: v for k, v in (json.loads(sizes_file.read_text()) if sizes_file.exists() else {}).items() if k in known}
    for entry in manifest["photos"]:
        if only and entry["id"] not in only:
            continue
        sizes = process(entry)
        report[entry["id"]] = sizes
        print(f"{entry['id']:<24} {entry['src']:<18} {entry['preset']:<9} "
              + " ".join(f"{w}x{h}" for w, h in sizes))
    sizes_file.write_text(json.dumps(report))


if __name__ == "__main__":
    main()
