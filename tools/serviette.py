#!/usr/bin/env python3
"""
Peachy — hero « serviette brodée » (v3).

À partir de deux images de la même serviette :

  photos/originaux/serviette-brodee.jpg   la serviette brodée (état final)
  photos/originaux/serviette-nue.jpg      la serviette seule, avant couture (facultative :
                                          sans elle, la broderie est effacée et la bouclette
                                          reconstituée, ce qui peut laisser des traces)

fabrique tout ce dont l'animation a besoin :

  serviette-brodee.webp   l'image brodée, telle quelle
  serviette-nue.webp      la serviette nue, calée au pixel sur l'image brodée, prolongée sur les côtés
  couture.png             carte d'apparition : R,V = instant où le pixel apparaît (16 bits),
                          B = emprise du fil et de son ombre (fondu vers la serviette nue)
  points.png              relief des points de broderie : R,V = position dans le point,
                          B = numéro du groupe (× 20), + 8 pour les A
  plis.webp               lumière des plis (basse fréquence), prolongée au-dessus et en dessous
  eponge.png              grain de bouclette raccordable, pour prolonger la serviette
  assets/js/serviette-donnees.js   mesures, groupes, minutage

La broderie affichée reste celle de l'image : elle suit donc les plis et la perspective
de la serviette au pixel près. Seul l'ordre d'apparition est calculé ici.

    python3 tools/serviette.py            # écrit dans v3/assets
    python3 tools/serviette.py --controle # écrit aussi des planches de contrôle dans shots/

Dépendances : numpy, opencv-contrib-python-headless, scikit-image, Pillow.
"""
import json
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image
from skimage.morphology import skeletonize

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "photos" / "originaux" / "serviette-brodee.jpg"
SOURCE_NUE = ROOT / "photos" / "originaux" / "serviette-nue.jpg"
SITE = ROOT / "v3"
OUT = SITE / "assets" / "img" / "serviette"
DONNEES = SITE / "assets" / "js" / "serviette-donnees.js"
SHOTS = ROOT / "shots"

# Prolongement de la serviette autour de l'image (pixels image), pour les écrans plus hauts
# ou plus larges qu'elle.
MARGE_HAUT = 2000         # la bande tissée reste en bas de l'écran : la serviette se prolonge surtout vers le haut
MARGE_BAS = 1000
MARGE_COTE = 256          # prolongement à gauche et à droite, pour les écrans très larges
ECHELLE_PLIS = 4          # la lumière des plis est stockée au quart de la définition
SIGMA_PLIS = 14.0
TUILE = 512               # côté du grain de bouclette

# ── Groupes brodés ───────────────────────────────────────────────────────────
# Les lignes sont reconnues d'elles-mêmes dans l'image :
#   gauche / droite : lignes de texte de part et d'autre du trait vertical, de haut en bas ;
#   trait : le trait vertical ; grand : les grandes lettres du logo ; dessous : la ligne sous le logo.
# texte : ce qui est brodé, lettre pour lettre (sert à reconnaître les A, qui apparaissent en dernier).
# lien : ancre du chapitre (les catégories brodées servent de navigation).
GROUPES = [
    dict(nom="devise-1", texte="L’art de prendre", cote="gauche"),
    dict(nom="devise-2", texte="soin de soi", cote="gauche"),
    dict(nom="trait", texte="", cote="trait"),
    dict(nom="maison", texte="La maison", cote="droite"),
    dict(nom="rituels", texte="Les rituels", cote="droite"),
    dict(nom="drainage", texte="Le drainage lymphatique", cote="droite"),
    dict(nom="philosophie", texte="La philosophie", cote="droite"),
    dict(nom="univers", texte="L’univers", cote="droite"),
    dict(nom="peachy", texte="Peachy", cote="grand"),
    dict(nom="lymphatic", texte="Lymphatic Therapy", cote="dessous"),
]

# Un point de broderie : la longueur de fil posée à chaque piqûre, en pixels image.
# Sert au relief des points, légèrement exagéré pour que la broderie se lise comme du fil.
PAS_POINT = 3.0
PAS_GRAND = 4.4

# ── Apparition de la broderie ────────────────────────────────────────────────
# D'abord toutes les lettres sauf les A, une à une, au hasard d'un mot à l'autre, chacune dans un
# léger flou. Puis les A, eux aussi dans le désordre, dévoilés par des lanières : de fines bandes
# souples qui glissent en travers de la lettre. Durées en secondes, après la pose de la serviette.
DUREE_LETTRES = 3.9       # temps pendant lequel les lettres (hors A) commencent à apparaître
FONDU_LETTRE = 0.55       # fondu d'une lettre, du flou au net
PAUSE_AVANT_A = 0.3       # entre la dernière lettre et le premier A
ECART_A = 0.14            # entre deux A
DUREE_A = 0.85            # temps que mettent les lanières à dévoiler un A
LANIERES_PAR_LETTRE = 5   # nombre moyen de lanières dans la hauteur d'une lettre
DOUCEUR = 0.15            # fondu de la pointe d'une lanière


# ── 1. Masque du fil ─────────────────────────────────────────────────────────
def masque_fil(img8):
    """Le fil est le seul élément saturé de l'image : on le sépare par la chroma."""
    lab = cv2.cvtColor(img8.astype(np.float32) / 255, cv2.COLOR_BGR2Lab)
    chroma = np.hypot(lab[..., 1], lab[..., 2])
    fond = cv2.medianBlur((np.clip(chroma / 60, 0, 1) * 255).astype(np.uint8), 51).astype(np.float32) / 255 * 60
    brut = ((chroma - fond) > 6).astype(np.uint8)
    n, etiquettes, stats, _ = cv2.connectedComponentsWithStats(brut, 8)
    fil = np.zeros_like(brut)
    for i in range(1, n):
        if stats[i, cv2.CC_STAT_AREA] >= 25:
            fil[etiquettes == i] = 1
    return fil


def disque(r):
    return cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * r + 1, 2 * r + 1))


# ── 2. Serviette nue ─────────────────────────────────────────────────────────
def combler(img8, trou, cote=11, rayon=44, graine=7):
    """Comble le trou en recopiant, morceau par morceau, la matière voisine la plus ressemblante."""
    rng = np.random.default_rng(graine)
    h, w = trou.shape
    demi = cote // 2
    out = img8.astype(np.float32).copy()
    connu = ~trou
    source_ok = cv2.erode((~trou).astype(np.uint8), np.ones((cote, cote), np.uint8), borderValue=0).astype(bool)
    while (~connu).any():
        compte = cv2.boxFilter(connu.astype(np.float32), -1, (cote, cote), normalize=False, borderType=cv2.BORDER_CONSTANT)
        compte[connu] = -1
        ordre = np.argsort(compte, axis=None)[::-1]
        pris = np.zeros_like(connu)
        poses = 0
        for idx in ordre[:20000]:
            y, x = divmod(int(idx), w)
            if compte[y, x] <= 0 or (compte[y, x] < cote * cote * 0.35 and poses):
                break
            if pris[y, x]:
                continue
            y0, y1, x0, x1 = y - demi, y + demi + 1, x - demi, x + demi + 1
            if y0 < 0 or x0 < 0 or y1 > h or x1 > w:
                connu[y, x] = True
                continue
            pris[max(0, y0 - cote):y1 + cote, max(0, x0 - cote):x1 + cote] = True
            cible = out[y0:y1, x0:x1]
            vu = connu[y0:y1, x0:x1]
            sy0, sy1, sx0, sx1 = max(0, y0 - rayon), min(h, y1 + rayon), max(0, x0 - rayon), min(w, x1 + rayon)
            fenetre = out[sy0:sy1, sx0:sx1]
            poids = np.repeat(vu[..., None].astype(np.float32), 3, axis=2)
            ecart = cv2.matchTemplate(fenetre, cible, cv2.TM_SQDIFF, mask=poids)
            ecart = np.where(source_ok[sy0 + demi:sy1 - demi, sx0 + demi:sx1 - demi], ecart, np.inf)
            if not np.isfinite(ecart).any():
                connu[y0:y1, x0:x1] = True
                continue
            plat = ecart.ravel()
            meilleurs = np.argpartition(plat, 3)[:4]
            meilleurs = meilleurs[np.isfinite(plat[meilleurs])]
            # un peu de hasard parmi les meilleurs : évite les répétitions visibles
            j = meilleurs[rng.integers(len(meilleurs))] if rng.random() < 0.3 else meilleurs[np.argmin(plat[meilleurs])]
            ry, rx = divmod(int(j), ecart.shape[1])
            cible[~vu] = fenetre[ry:ry + cote, rx:rx + cote][~vu]
            connu[y0:y1, x0:x1] = True
            poses += 1
    return out


def serviette_nue(img8, fil):
    trou = cv2.dilate(fil, disque(5)).astype(bool)
    nue = combler(img8, trou)
    # Le fil laisse une ombre autour de lui : on remplace la basse fréquence de la zone
    # par celle de la serviette alentour, pour qu'aucun fantôme de lettre ne subsiste.
    loin = 1.0 - cv2.dilate(fil, disque(12)).astype(np.float32)
    sigma = 9.0
    lisse = cv2.GaussianBlur(nue * loin[..., None], (0, 0), sigma) / np.maximum(cv2.GaussianBlur(loin, (0, 0), sigma), 1e-3)[..., None]
    actuel = cv2.GaussianBlur(nue, (0, 0), sigma)
    zone = cv2.GaussianBlur(cv2.dilate(fil, disque(9)).astype(np.float32), (0, 0), 3.0)
    nue = nue + zone[..., None] * (lisse - actuel)
    # Hors de la zone retouchée, la serviette nue est l'image d'origine, exactement.
    zone = np.clip(zone * 4, 0, 1)[..., None]
    nue = img8.astype(np.float32) * (1 - zone) + nue * zone
    return np.clip(nue, 0, 255)


def caler(nue8, img8, fil):
    """Cale la serviette nue fournie sur l'image brodée : même cadre, même lumière.

    Les deux images montrent la même serviette, à une échelle ou un cadrage légèrement différents.
    """
    h, w = img8.shape[:2]
    nue = cv2.resize(nue8, (w, h), interpolation=cv2.INTER_AREA if nue8.shape[1] > w else cv2.INTER_CUBIC)
    hors_fil = (cv2.dilate(fil, disque(14)) == 0).astype(np.uint8)
    gris = lambda im: cv2.GaussianBlur(cv2.cvtColor(im, cv2.COLOR_BGR2GRAY).astype(np.float32), (0, 0), 2.5)
    a, b = gris(img8), gris(nue)
    critere = (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 300, 1e-7)
    # d'abord grossièrement (affine, au quart), puis finement (homographie, pleine définition)
    e = 4
    petit = lambda im: cv2.resize(im, (w // e, h // e), interpolation=cv2.INTER_AREA)
    M = np.eye(2, 3, dtype=np.float32)
    try:
        _, M = cv2.findTransformECC(petit(a), petit(b), M, cv2.MOTION_AFFINE, critere, petit(hors_fil), 5)
        H = np.vstack([M, [0, 0, 1]]).astype(np.float32)
        H[0, 2] *= e
        H[1, 2] *= e
        accord, H = cv2.findTransformECC(a, b, H, cv2.MOTION_HOMOGRAPHY, critere, hors_fil, 5)
        print(f"  calage : accord {accord:.4f}, décalage ({H[0, 2]:+.1f}, {H[1, 2]:+.1f}) px, échelle {H[0, 0]:.4f}")
        nue = cv2.warpPerspective(nue, H, (w, h), flags=cv2.INTER_CUBIC + cv2.WARP_INVERSE_MAP, borderMode=cv2.BORDER_REFLECT)
    except cv2.error as erreur:
        print(f"  calage impossible ({erreur.err}) : la serviette nue est utilisée telle quelle")
    # même lumière : la basse fréquence de la serviette nue suit celle de l'image brodée
    libre = hors_fil.astype(np.float32)
    sigma = 24.0
    cible = cv2.GaussianBlur(img8.astype(np.float32) * libre[..., None], (0, 0), sigma) / np.maximum(cv2.GaussianBlur(libre, (0, 0), sigma), 1e-3)[..., None]
    actuel = cv2.GaussianBlur(nue.astype(np.float32), (0, 0), sigma)
    nue = nue.astype(np.float32) * np.clip(cible / np.maximum(actuel, 1), 0.85, 1.18)
    ecart = np.abs(nue - img8.astype(np.float32)).mean(2)[hors_fil > 0].mean()
    print(f"  écart moyen avec l'image brodée, hors broderie : {ecart:.1f} / 255")
    return np.clip(nue, 0, 255)


# ── 3. Ordre de couture ──────────────────────────────────────────────────────
VOISINS = [(-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1)]


def parcours(squelette):
    """Parcourt le squelette d'une lettre comme une aiguille : un trait après l'autre.

    Retourne la liste des points (y, x) dans l'ordre, et la longueur cousue à chaque point.
    """
    pts = set(zip(*np.nonzero(squelette)))
    if not pts:
        return [], []

    def voisins(p):
        return [(p[0] + dy, p[1] + dx) for dy, dx in VOISINS if (p[0] + dy, p[1] + dx) in pts]

    bouts = [p for p in pts if len(voisins(p)) == 1]
    # départ en haut à gauche, comme on écrit ; une lettre fermée (O) part de son sommet
    depart = min(bouts, key=lambda p: p[1] + 0.6 * p[0]) if bouts else min(pts, key=lambda p: (p[0], p[1]))
    ordre, longueurs, vus, pile = [], [], set(), []
    courant, longueur = depart, 0.0
    while True:
        vus.add(courant)
        ordre.append(courant)
        longueurs.append(longueur)
        libres = [q for q in voisins(courant) if q not in vus]
        if libres:
            if len(ordre) >= 4:
                dy, dx = courant[0] - ordre[-4][0], courant[1] - ordre[-4][1]
            else:
                dy, dx = 0, 0
            # on continue tout droit ; les embranchements attendent leur tour
            suivant = max(libres, key=lambda q: (q[0] - courant[0]) * dy + (q[1] - courant[1]) * dx)
            if len(libres) > 1:
                pile.append(courant)
            longueur += float(np.hypot(suivant[0] - courant[0], suivant[1] - courant[1]))
            courant = suivant
            continue
        suivant = None
        while pile:
            noeud = pile[-1]
            libres = [q for q in voisins(noeud) if q not in vus]
            if libres:
                suivant = libres[0]
                break
            pile.pop()
        if suivant is None:
            reste = pts - vus
            if not reste:
                break
            suivant = min(reste, key=lambda q: (q[0] - courant[0]) ** 2 + (q[1] - courant[1]) ** 2)
        longueur += 3.0  # le saut de l'aiguille
        courant = suivant
    return ordre, longueurs


def ranger(fil):
    """Range chaque lettre dans son groupe, de gauche à droite."""
    n, etiquettes, stats, centres = cv2.connectedComponentsWithStats(fil, 8)
    hauteurs = stats[:, cv2.CC_STAT_HEIGHT]
    lettres = list(range(1, n))
    mediane = float(np.median(hauteurs[1:]))
    trait = max(lettres, key=lambda i: hauteurs[i])
    x_trait = centres[trait][0]
    bas_trait = stats[trait, cv2.CC_STAT_TOP] + hauteurs[trait]
    grands = [i for i in lettres if i != trait and hauteurs[i] > 1.9 * mediane]
    # inclinaison des lignes : celle du logo
    pente = -np.polyfit(centres[grands, 0], centres[grands, 1], 1)[0] if len(grands) > 1 else 0.0
    v = centres[:, 1] + pente * centres[:, 0]
    autres = [i for i in lettres if i != trait and i not in grands]
    dessous = [i for i in autres if centres[i][1] > bas_trait]
    cotes = dict(
        trait=[[trait]], grand=[grands], dessous=[dessous],
        gauche=[], droite=[],
    )
    for cote, garde in (("gauche", lambda i: centres[i][0] < x_trait), ("droite", lambda i: centres[i][0] >= x_trait)):
        membres = sorted((i for i in autres if i not in dessous and garde(i)), key=lambda i: v[i])
        for i in membres:
            # une nouvelle ligne commence quand l'écart dépasse une bonne demi-lettre
            if cotes[cote] and v[i] - v[cotes[cote][-1][-1]] < 0.6 * mediane:
                cotes[cote][-1].append(i)
            else:
                cotes[cote].append([i])
    rangs = {}
    for cote, lignes in cotes.items():
        attendus = [g["nom"] for g in GROUPES if g["cote"] == cote]
        if len(attendus) != len(lignes):
            raise SystemExit(f"{cote} : {len(lignes)} ligne(s) trouvée(s) dans l'image, {len(attendus)} attendue(s) ({', '.join(attendus)})")
        for nom, ligne in zip(attendus, lignes):
            rangs[nom] = sorted(ligne, key=lambda i: centres[i][0])
    return etiquettes, rangs


def traits_d_une_lettre(squelette):
    """Les traits d'une lettre : le parcours de l'aiguille, coupé à chaque saut."""
    ordre, _ = parcours(squelette)
    traits, courant = [], ordre[:1]
    for a, b in zip(ordre, ordre[1:]):
        if max(abs(b[0] - a[0]), abs(b[1] - a[1])) > 1:
            traits.append(courant)
            courant = [b]
        else:
            courant.append(b)
    traits.append(courant)
    return [np.array(t, np.float32) for t in traits if len(t) >= 5]   # les barbes du squelette sont laissées


def lanieres(xs, ys, centre, angle, haut_lettre, debut, duree, rng):
    """L'instant où chaque pixel d'une lettre apparaît, par lanières.

    La lettre est découpée dans sa hauteur en lanières d'épaisseurs inégales, qui ondulent
    doucement. Chacune part à son heure, sans ordre (elles sont éparses), et glisse d'un bord
    à l'autre ; son milieu avance un peu devant ses bords, ce qui lui donne une pointe arrondie.
    """
    c, s_ = np.cos(angle), np.sin(angle)
    u = (xs - centre[0]) * c + (ys - centre[1]) * s_          # le long de la ligne
    v = -(xs - centre[0]) * s_ + (ys - centre[1]) * c         # en travers
    avance = (u - u.min()) / max(1.0, np.ptp(u))
    onde = (0.16 * haut_lettre * np.sin(2 * np.pi * u / (5.5 * haut_lettre) + rng.uniform(0, 6.28))
            + 0.07 * haut_lettre * np.sin(2 * np.pi * u / (2.3 * haut_lettre) + rng.uniform(0, 6.28)))
    vv = v + onde
    epais = max(2.5, haut_lettre / LANIERES_PAR_LETTRE)
    bords = [vv.min() - 1e-3]
    while bords[-1] < vv.max():
        bords.append(bords[-1] + epais * rng.uniform(0.55, 1.6))
    bords = np.array(bords)
    rang = np.clip(np.searchsorted(bords, vv) - 1, 0, len(bords) - 2)
    n = len(bords) - 1
    depart = debut + rng.uniform(0, 0.36, n) * duree
    course = rng.uniform(0.42, 0.54, n) * duree
    retour = rng.random(n) < 0.2                               # quelques-unes viennent de l'autre bout
    milieu, demi = (bords[:-1] + bords[1:]) / 2, np.diff(bords) / 2
    ecart = np.abs(vv - milieu[rang]) / demi[rang]
    f = np.where(retour[rang], 1 - avance, avance)
    return depart[rang] + course[rang] * (0.9 * f ** 0.9 + 0.1 * ecart ** 2), n


def ordre_eparpille(groupes_des_lettres, rng):
    """Un ordre de passage où deux lettres qui se suivent ne sont jamais du même mot (tant que c'est possible)."""
    reste = {}
    for i, g in enumerate(groupes_des_lettres):
        reste.setdefault(g, []).append(i)
    for lettres in reste.values():
        rng.shuffle(lettres)
    ordre, dernier = [], None
    while reste:
        choix = [g for g in reste if g != dernier] or list(reste)
        poids = np.array([len(reste[g]) for g in choix], float)
        g = choix[rng.choice(len(choix), p=poids / poids.sum())]
        ordre.append(reste[g].pop())
        if not reste[g]:
            del reste[g]
        dernier = g
    return ordre


def carte_couture(fil):
    """Décide quand chaque pixel de la broderie apparaît, et note le relief de ses points.

    Les lettres apparaissent une à une, éparses, d'un mot à l'autre ; les A en dernier, par lanières
    (voir lanieres). Le relief des points de broderie suit le tracé de chaque lettre.
    """
    h, w = fil.shape
    etiquettes, rangs = ranger(fil)
    _, _, stats, centres = cv2.connectedComponentsWithStats(fil, 8)
    rng = np.random.default_rng(5)
    phase_sq = np.zeros((h, w), np.float32)       # position dans le point (pour le relief des points)
    groupe_sq = np.zeros((h, w), np.uint8)        # numéro du groupe : chaque mot peut être déplacé seul
    lettre_sq = np.zeros((h, w), np.int32)        # numéro de la lettre
    squelettes = np.zeros((h, w), bool)
    infos, lettres = [], []                       # lettres : (composante, rang du groupe, est un A)
    for rang, g in enumerate(GROUPES, start=1):
        grand = g["cote"] == "grand"
        pas = PAS_GRAND if grand else PAS_POINT
        signes = [c for c in g["texte"].lower() if not c.isspace()]
        if signes and len(signes) != len(rangs[g["nom"]]):
            raise SystemExit(f"{g['nom']} : {len(rangs[g['nom']])} lettres trouvées dans l'image, {len(signes)} dans « {g['texte']} »")
        for k, i in enumerate(rangs[g["nom"]]):
            lettres.append((i, rang, bool(signes) and signes[k] == "a"))
            for trait in traits_d_une_lettre(skeletonize(etiquettes == i)):
                abscisse = np.r_[0.0, np.cumsum(np.hypot(*np.diff(trait, axis=0).T))]
                ys, xs = trait.astype(int).T
                phase_sq[ys, xs] = 2 * np.pi * abscisse / pas
                groupe_sq[ys, xs] = rang
                lettre_sq[ys, xs] = len(lettres)
                squelettes[ys, xs] = True
        ys, xs = np.nonzero(np.isin(etiquettes, rangs[g["nom"]]))
        (cx, cy), (bw, bh), angle = cv2.minAreaRect(np.column_stack([xs, ys]).astype(np.float32))
        if bw < bh and g["cote"] != "trait":
            bw, bh, angle = bh, bw, angle - 90
        if g["cote"] == "trait":
            angle = 0.0
            bw, bh = float(xs.max() - xs.min()), float(ys.max() - ys.min())
        # Les mots du groupe (boîtes), pour pouvoir le couper en deux lignes dans une autre disposition.
        boites = sorted(([int(stats[i, 0]), int(stats[i, 1]), int(stats[i, 0] + stats[i, 2]), int(stats[i, 1] + stats[i, 3])]
                         for i in rangs[g["nom"]]), key=lambda b: b[0])
        seuil = 0.5 * float(np.median([b[3] - b[1] for b in boites]))
        mots = [list(boites[0])]
        for b in boites[1:]:
            if b[0] - mots[-1][2] > seuil:
                mots.append(list(b))
            else:
                mots[-1] = [mots[-1][0], min(mots[-1][1], b[1]), b[2], max(mots[-1][3], b[3])]
        infos.append(dict(
            nom=g["nom"], texte=g["texte"], lien=g.get("lien"), mots=mots, grand=grand,
            boite=[round(float(xs.min())), round(float(ys.min())), round(float(xs.max())), round(float(ys.max()))],
            cadre=dict(cx=round(cx, 1), cy=round(cy, 1), l=round(bw, 1), h=round(bh, 1), angle=round(angle, 2)),
        ))
    # Chaque pixel proche d'un fil appartient au groupe, à la lettre et au point de broderie les plus proches.
    _, proche = cv2.distanceTransformWithLabels((~squelettes).astype(np.uint8), cv2.DIST_L2, 5, labelType=cv2.DIST_LABEL_PIXEL)
    def etendre(valeurs):
        table = np.zeros(proche.max() + 1, valeurs.dtype)
        table[proche[squelettes]] = valeurs[squelettes]
        return table[proche]
    # Emprise : le fil et l'ombre qu'il creuse dans la bouclette, puis un fondu vers la serviette nue.
    au_fil = cv2.distanceTransform((1 - fil).astype(np.uint8), cv2.DIST_L2, 5)
    emprise = np.clip(1 - (au_fil - 6) / 11, 0, 1)
    emprise = emprise * emprise * (3 - 2 * emprise)
    dedans = emprise > 0
    groupe = np.where(dedans, etendre(groupe_sq), 0)
    lettre = np.where(dedans, etendre(lettre_sq), 0)

    # 1. Les lettres, sauf les A : une à une, jamais deux de suite dans le même mot.
    instant = np.zeros((h, w), np.float32)
    est_a = np.zeros((h, w), bool)
    simples = [n for n, (_, _, a) in enumerate(lettres, start=1) if not a]
    les_a = [n for n, (_, _, a) in enumerate(lettres, start=1) if a]
    ordre = ordre_eparpille([lettres[n - 1][1] for n in simples], rng)
    depart = np.zeros(len(lettres) + 1, np.float32)
    for place, k in enumerate(ordre):
        depart[simples[k]] = DUREE_LETTRES * (place + rng.uniform(-0.35, 0.35)) / max(1, len(simples) - 1)
    depart = np.clip(depart, 0, None)
    instant[dedans] = depart[lettre[dedans]]
    # 2. Les A : à la fin, dans le désordre eux aussi, chacun dévoilé par ses lanières.
    debut_a = float(depart.max()) + PAUSE_AVANT_A
    for place, n in enumerate(rng.permutation(les_a)):
        composante, rang, _ = lettres[n - 1]
        ys, xs = np.nonzero(lettre == n)
        cadre = infos[rang - 1]["cadre"]
        instant[ys, xs], _ = lanieres(xs.astype(np.float32), ys.astype(np.float32), centres[composante],
                                      np.radians(cadre["angle"]), cadre["h"],
                                      debut_a + place * ECART_A + rng.uniform(0, 0.06), DUREE_A, rng)
        est_a[ys, xs] = True
    # les bords des lanières sont adoucis : d'une lanière à sa voisine, l'instant change sur quelques pixels
    poids = cv2.GaussianBlur(est_a.astype(np.float32), (0, 0), 1.6)
    instant = np.where(est_a, cv2.GaussianBlur(instant * est_a, (0, 0), 1.6) / np.maximum(poids, 1e-3), instant)
    print(f"  {len(simples)} lettres en {float(depart.max()):.1f} s, puis {len(les_a)} A jusqu'à {float(instant.max()):.1f} s")
    fin = float(instant.max()) + max(DOUCEUR, FONDU_LETTRE)
    # 10 bits suffisent (7 ms) : la carte se compresse bien mieux que sur 16
    code = (np.round(np.clip(instant / fin, 0, 1) * 1023).astype(np.uint32) * 64)
    carte = np.dstack([(code >> 8).astype(np.uint8), (code & 255).astype(np.uint8), np.round(emprise * 255).astype(np.uint8)])
    phase = etendre(phase_sq)
    points = np.dstack([
        np.where(dedans, np.round(np.cos(phase) * 127 + 128), 128),
        np.where(dedans, np.round(np.sin(phase) * 127 + 128), 128),
        groupe * 20 + est_a * 8,                  # + 8 : cette lettre est un A (lanières)
    ]).astype(np.uint8)
    return carte, points, infos, fin, squelettes


def lisere_haut(nue, groupes):
    """La droite du liseré qui borde la bande tissée par le haut : y = a + b·x.
    Les lignes brodées d'une autre disposition ne descendent jamais en dessous."""
    gris = nue.mean(2)
    detail = gris - cv2.GaussianBlur(gris, (0, 0), 9)
    grandes = next(g for g in groupes if g["grand"])["mots"]
    # le haut des grandes lettres du logo, par colonne
    xs = np.array([(m[0] + m[2]) / 2 for m in grandes])
    ys = np.array([m[1] for m in grandes], float)
    pente, origine = np.polyfit(xs, ys, 1) if len(xs) > 1 else (0.0, ys[0])
    points = []
    for x in range(int(xs.min()), int(xs.max()), 40):
        haut = int(origine + pente * x)
        colonne = detail[max(0, haut - 95):haut - 8, x - 6:x + 6].mean(1)
        points.append((x, max(0, haut - 95) + int(np.argmax(colonne))))
    px, py = np.array(points).T
    b_, a_ = np.polyfit(px, py, 1)
    garde = np.abs(py - (a_ + b_ * px)) < 12            # on écarte les colonnes où un pli a trompé la mesure
    b_, a_ = np.polyfit(px[garde], py[garde], 1)
    return [round(float(a_), 1), round(float(b_), 4)]


# ── 4. Prolongement sur les côtés ────────────────────────────────────────────
def glissement(gris, x_ici, x_source, bande=56):
    """De combien décaler verticalement la matière prise en x_source pour qu'elle prolonge
    celle de x_ici : les liserés de la bande tissée doivent se rejoindre. Retourne (a, b)
    tels que la ligne y de la suite se lit à la ligne a·y + b de la source."""
    h = gris.shape[0]
    detail = gris - cv2.GaussianBlur(gris, (0, 0), 12)
    ici = detail[:, x_ici:x_ici + bande].mean(1)
    source = detail[:, x_source:x_source + bande].mean(1)
    fen, pas, portee = 90, 30, 70
    ys, ds, ps = [], [], []
    for y0 in range(portee, h - fen - portee, pas):
        ref = ici[y0:y0 + fen] - ici[y0:y0 + fen].mean()
        meilleur, score = 0, -1
        for d in range(-portee, portee + 1):
            cand = source[y0 + d:y0 + d + fen]
            cand = cand - cand.mean()
            c = float((ref * cand).sum() / (np.linalg.norm(ref) * np.linalg.norm(cand) + 1e-6))
            if c > score:
                meilleur, score = d, c
        ys.append(y0 + fen / 2)
        ds.append(meilleur)
        ps.append(max(score, 0) ** 4 * float(np.abs(ref).mean()))
    ys, ds, ps = np.array(ys), np.array(ds, float), np.array(ps)
    garde = ps >= np.percentile(ps, 70)          # seuls les liserés donnent un repère fiable
    pente, origine = np.polyfit(ys[garde], ds[garde], 1, w=ps[garde])
    return 1.0 + pente, origine


def fondre(a, b, masque, niveaux=8):
    """Fondu par bandes de fréquences : le grain change d'un coup (il ne se délave pas),
    la lumière passe lentement de l'une à l'autre."""
    ga, gb, gm = [a], [b], [masque]
    for _ in range(niveaux):
        ga.append(cv2.pyrDown(ga[-1]))
        gb.append(cv2.pyrDown(gb[-1]))
        gm.append(cv2.pyrDown(gm[-1]))
    out = ga[-1] * gm[-1][..., None] + gb[-1] * (1 - gm[-1][..., None])
    for i in range(niveaux - 1, -1, -1):
        taille = (ga[i].shape[1], ga[i].shape[0])
        la = ga[i] - cv2.pyrUp(ga[i + 1], dstsize=taille)
        lb = gb[i] - cv2.pyrUp(gb[i + 1], dstsize=taille)
        out = cv2.pyrUp(out, dstsize=taille) + la * gm[i][..., None] + lb * (1 - gm[i][..., None])
    return out


def prolonger_cotes(nue):
    """Prolonge la serviette à gauche et à droite : la matière voisine glisse le long de la bande
    tissée, dont les liserés continuent ainsi en ligne droite, sans effet de miroir."""
    h, w = nue.shape[:2]
    e = MARGE_COTE
    gris = nue.mean(2)
    large = cv2.copyMakeBorder(nue, 0, 0, e, e, cv2.BORDER_REPLICATE)
    ys = np.arange(h, dtype=np.float32)
    for gauche in (True, False):
        a, b = glissement(gris, 4 if gauche else w - 60, e + 4 if gauche else w - e - 60)
        print(f"  côté {'gauche' if gauche else 'droit'} : glissement de {b + (a - 1) * h / 2:+.1f} px au milieu")
        # la suite : l'image décalée de e, lue le long de la bande
        carte_y = np.repeat((a * ys + b)[:, None], w + 2 * e, axis=1).astype(np.float32)
        carte_x = np.repeat(np.arange(w + 2 * e, dtype=np.float32)[None, :], h, axis=0) - e + (e if gauche else -e)
        suite = cv2.remap(nue, carte_x, carte_y, cv2.INTER_CUBIC, borderMode=cv2.BORDER_REFLECT)
        couture = e + 20 if gauche else e + w - 20
        masque = np.zeros((h, w + 2 * e), np.float32)
        if gauche:
            masque[:, couture:] = 1
        else:
            masque[:, :couture] = 1
        zone = slice(0, e + 512) if gauche else slice(w + e - 512, w + 2 * e)
        large[:, zone] = fondre(large[:, zone].copy(), suite[:, zone], masque[:, zone])
    return np.clip(large, 0, 255)


# ── 5. Lumière des plis, prolongée ───────────────────────────────────────────
def direction_des_plis(lum, bande):
    """Direction moyenne des plis dans une bande de l'image (tenseur de structure)."""
    gx = cv2.Sobel(lum[bande], cv2.CV_32F, 1, 0, ksize=5)
    gy = cv2.Sobel(lum[bande], cv2.CV_32F, 0, 1, ksize=5)
    jxx, jyy, jxy = (gx * gx).mean(), (gy * gy).mean(), (gx * gy).mean()
    angle = 0.5 * np.arctan2(2 * jxy, jxx - jyy)          # direction du gradient dominant
    dx, dy = -np.sin(angle), np.cos(angle)                # le pli lui est perpendiculaire
    return (dx, dy) if dx >= 0 else (-dx, -dy)


def miroir(x, n):
    x = np.mod(x, 2 * n)
    return np.where(x >= n, 2 * n - 1 - x, x)


def champ_de_plis(rapport, hauteur, periode, rng):
    """Un grand champ de plis, assemblé à partir des plis réels de la partie haute (éponge seule)."""
    h, w = rapport.shape[:2]
    recouvre = h // 3
    lignes = []
    y = 0
    while y < hauteur:
        lignes.append(np.roll(rapport[:, :periode], int(rng.integers(periode)), axis=1)[:, np.arange(w) % periode])
        y += h - recouvre
    champ = np.ones((y + recouvre, w, 3), np.float32)
    poids = np.zeros((y + recouvre, w, 1), np.float32)
    rampe = np.ones(h, np.float32)
    rampe[:recouvre] = np.linspace(0, 1, recouvre)
    rampe[-recouvre:] = np.linspace(1, 0, recouvre)
    for k, bloc in enumerate(lignes):
        y0 = k * (h - recouvre)
        r = rampe.copy()
        if k == 0:
            r[:recouvre] = 1
        champ[y0:y0 + h] = champ[y0:y0 + h] * (poids[y0:y0 + h] > 0) + bloc * r[:, None, None]
        poids[y0:y0 + h] += r[:, None, None]
    return (champ / np.maximum(poids, 1e-3))[:hauteur]


def lumiere_des_plis(nue):
    h, w = nue.shape[:2]
    e = ECHELLE_PLIS
    petit = cv2.resize(nue, (w // e, h // e), interpolation=cv2.INTER_AREA)
    plis = cv2.GaussianBlur(petit, (0, 0), SIGMA_PLIS / e)
    ph, pw = plis.shape[:2]
    moyenne = plis.reshape(-1, 3).mean(0)
    lum = plis.mean(2)
    rng = np.random.default_rng(11)

    # Matière première du prolongement : les plis de la partie haute, là où il n'y a que de l'éponge,
    # ramenés autour de 1 et rendus raccordables de gauche à droite.
    haut = plis[: int(0.48 * ph)] / cv2.GaussianBlur(plis, (0, 0), 60)[: int(0.48 * ph)]
    fondu = pw // 4
    a = np.linspace(0, 1, fondu)[None, :, None]
    haut = haut.copy()
    haut[:, :fondu] = haut[:, :fondu] * a + haut[:, pw - fondu:] * (1 - a)
    haut = haut[:, np.arange(pw) % (pw - fondu)]      # période : pw − fondu

    def prolonger(vers_le_haut, marge):
        m = marge // e
        champ = champ_de_plis(haut, m, pw - fondu, rng) * moyenne
        if vers_le_haut:
            champ = champ[::-1]        # la ligne 0 est la plus proche de l'image ; le champ reste à l'endroit
        bande = slice(0, ph // 6) if vers_le_haut else slice(ph - ph // 8, ph)
        dx, dy = direction_des_plis(lum, bande)
        if abs(dy) < 0.12:
            dy = 0.12 * (1 if dy >= 0 else -1)
        d = np.arange(1, m + 1, dtype=np.float32)[:, None]            # distance au bord
        xs = np.arange(pw, dtype=np.float32)[None, :]
        # chaque pli sort du cadre en ligne droite, dans sa direction
        pas = d / abs(dy)
        sens = -1.0 if (dy < 0) == vers_le_haut else 1.0
        src_x = miroir(np.round(xs + sens * dx * pas).astype(int), pw)
        ligne = plis[1] if vers_le_haut else plis[ph - 2]
        continu = ligne[src_x]
        w_ = np.clip((d - 8) / (95 - 8), 0, 1)
        w_ = (w_ * w_ * (3 - 2 * w_))[..., None]
        calme = 1 - 0.4 * np.clip((d - 300 / e) / (1100 / e), 0, 1)[..., None]
        champ = moyenne + (champ - moyenne) * calme
        ext = continu * (1 - w_) + champ * w_
        return ext[::-1] if vers_le_haut else ext

    tout = np.vstack([prolonger(True, MARGE_HAUT), plis, prolonger(False, MARGE_BAS)])
    return np.clip(tout, 0, 255), moyenne


# ── 6. Grain de bouclette raccordable ────────────────────────────────────────
def couture_minimale(cout):
    """Chemin de moindre écart à travers un recouvrement (h × r) : vrai à droite du chemin."""
    h, r = cout.shape
    cumul = cout.copy()
    for i in range(1, h):
        gauche = np.r_[np.inf, cumul[i - 1, :-1]]
        droite = np.r_[cumul[i - 1, 1:], np.inf]
        cumul[i] += np.minimum(np.minimum(gauche, cumul[i - 1]), droite)
    masque = np.zeros((h, r), bool)
    j = int(np.argmin(cumul[-1]))
    for i in range(h - 1, -1, -1):
        masque[i, j:] = True
        if i:
            a, b = max(0, j - 1), min(r, j + 2)
            j = a + int(np.argmin(cumul[i - 1, a:b]))
    return masque


def grain_eponge(nue, fil):
    """Un carré de bouclette qui se répète sans raccord visible, assemblé à partir de l'éponge réelle.

    Les morceaux sont cousus bord à bord le long du chemin où ils se ressemblent le plus
    (les boucles restent entières), puis le carré est refermé sur lui-même de la même façon.
    """
    h, w = nue.shape[:2]
    lum = nue.mean(2)
    detail = lum / cv2.GaussianBlur(lum, (0, 0), 7.0) - 1.0
    # sources : l'éponge du haut de l'image, loin des lettres, là où elle est la plus régulière
    libre = cv2.dilate(fil, disque(14)) == 0
    libre[int(0.47 * h):] = False
    cote, bord = 96, 24
    pas = cote - bord
    relief = cv2.boxFilter(np.abs(cv2.GaussianBlur(detail, (0, 0), 5.0)), -1, (cote, cote), anchor=(0, 0))
    ok = cv2.erode(libre.astype(np.uint8), np.ones((cote, cote), np.uint8), anchor=(0, 0), borderValue=0).astype(bool)
    ok[h - cote:, :] = False
    ok[:, w - cote:] = False
    piquant = cv2.boxFilter(detail * detail, -1, (cote, cote), anchor=(0, 0))
    ok &= (relief <= np.percentile(relief[ok], 60)) & (piquant >= np.percentile(piquant[ok], 55))
    choix = np.column_stack(np.nonzero(ok))
    rng = np.random.default_rng(3)

    n = -(-(TUILE + bord - cote) // pas) + 1
    grand = np.zeros((cote + (n - 1) * pas,) * 2, np.float32)
    for gy in range(n):
        for gx in range(n):
            y0, x0 = gy * pas, gx * pas
            place = grand[y0:y0 + cote, x0:x0 + cote]
            meilleur, meilleur_cout = None, np.inf
            for sy, sx in choix[rng.integers(len(choix), size=60)]:
                m = detail[sy:sy + cote, sx:sx + cote]
                c = 0.0
                if gx:
                    c += ((m[:, :bord] - place[:, :bord]) ** 2).sum()
                if gy:
                    c += ((m[:bord] - place[:bord]) ** 2).sum()
                if c < meilleur_cout:
                    meilleur, meilleur_cout = m, c
            garde = np.ones((cote, cote), bool)
            if gx:
                garde[:, :bord] &= couture_minimale((meilleur[:, :bord] - place[:, :bord]) ** 2)
            if gy:
                garde[:bord] &= couture_minimale(((meilleur[:bord] - place[:bord]) ** 2).T).T
            place[garde] = meilleur[garde]
    # refermer le carré : le bord droit se recoud sur le bord gauche, le bas sur le haut
    t = grand[:, :TUILE + bord].copy()
    droite = couture_minimale((t[:, :bord] - t[:, TUILE:]) ** 2)
    t[:, :bord] = np.where(droite, t[:, :bord], t[:, TUILE:])
    t = t[:TUILE + bord, :TUILE]
    bas = couture_minimale(((t[:bord] - t[TUILE:]) ** 2).T).T
    t[:bord] = np.where(bas, t[:bord], t[TUILE:])
    tuile = t[:TUILE] - t[:TUILE].mean()
    cible = float(detail[libre].std())
    return np.clip(tuile * 320 + 128, 0, 255).astype(np.uint8), cible


# ── Exports ──────────────────────────────────────────────────────────────────
def webp(bgr, chemin, qualite=88):
    Image.fromarray(cv2.cvtColor(np.clip(bgr, 0, 255).astype(np.uint8), cv2.COLOR_BGR2RGB)).save(
        chemin, "WEBP", quality=qualite, method=6)


def main():
    controle = "--controle" in sys.argv
    OUT.mkdir(parents=True, exist_ok=True)
    img8 = cv2.imread(str(SOURCE))
    h, w = img8.shape[:2]
    print(f"source {w}×{h}")

    fil = masque_fil(img8)
    if SOURCE_NUE.exists():
        print(f"serviette nue : {SOURCE_NUE.name}")
        nue = caler(cv2.imread(str(SOURCE_NUE)), img8, fil)
    else:
        print("serviette nue : reconstituée (aucune image fournie)")
        nue = serviette_nue(img8, fil)
    print("ordre d'apparition…")
    carte, points, groupes, fin, squelettes = carte_couture(fil)
    print("prolongements, plis et grain…")
    large = prolonger_cotes(nue)
    plis, moyenne = lumiere_des_plis(large)
    tuile, contraste = grain_eponge(nue, fil)

    webp(img8, OUT / "serviette-brodee.webp")
    webp(large, OUT / "serviette-nue.webp")
    Image.fromarray(carte).save(OUT / "couture.png", optimize=True)
    Image.fromarray(points).save(OUT / "points.png", optimize=True)
    webp(plis, OUT / "plis.webp", 92)
    Image.fromarray(tuile).save(OUT / "eponge.png", optimize=True)

    ys, xs = np.nonzero(fil)
    donnees = dict(
        largeur=w, hauteur=h,
        margeHaut=MARGE_HAUT, margeBas=MARGE_BAS, margeCote=MARGE_COTE,
        duree=round(fin, 3), fondu=FONDU_LETTRE, douceur=DOUCEUR,
        moyenne=[round(float(c) / 255, 4) for c in moyenne[::-1]],
        grain=round(contraste, 4),
        # la boîte de tout ce qui est brodé : le cadrage ne la coupe jamais
        broderie=[int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())],
        lisere=lisere_haut(nue, groupes),
        groupes=groupes,
    )
    DONNEES.write_text(
        "// Écrit par tools/serviette.py : ne pas modifier à la main.\n"
        f"export const serviette = {json.dumps(donnees, ensure_ascii=False, separators=(',', ':'))};\n",
        encoding="utf-8",
    )
    for f in sorted(OUT.iterdir()):
        print(f"  {f.name:<24} {f.stat().st_size / 1024:7.0f} Ko")

    if controle:
        SHOTS.mkdir(exist_ok=True)
        cv2.imwrite(str(SHOTS / "serviette-nue.png"), np.clip(large, 0, 255).astype(np.uint8))
        cv2.imwrite(str(SHOTS / "serviette-plis.png"), np.clip(plis, 0, 255).astype(np.uint8))
        cv2.imwrite(str(SHOTS / "serviette-eponge.png"), np.tile(tuile, (2, 2)))
        t = (carte[..., 0].astype(np.float32) * 256 + carte[..., 1]) / 65535
        vue = cv2.applyColorMap((t * 255).astype(np.uint8), cv2.COLORMAP_TURBO)
        vue = (vue * (carte[..., 2:3] / 255.0)).astype(np.uint8)
        vue[squelettes] = 255
        cv2.imwrite(str(SHOTS / "serviette-couture.png"), vue)


if __name__ == "__main__":
    main()
