#!/usr/bin/env node
/**
 * Peachy — banc d'essai des logos, série 2 (copie v2). Rien ici ne touche à la démo.
 *
 * Consigne : plus de pêche. Le lettrage est stylisé, le signe reprend le même P, et
 * quelque chose doit rappeler le drainage lymphatique.
 *
 * Le lettrage : le pinceau se charge en bout de trait. Chaque barre part fine du fût et
 * se termine en goutte ; chaque courbe s'épaissit là où elle tourne. C'est le dessin des
 * lobes du signe TIERRA (fins au fût, pleins au bout), appliqué à toutes les lettres :
 * un tracé qui a l'air liquide.
 *
 * Les signes : le P du nom, fût allongé, auquel s'ajoute une image du drainage.
 *
 *   node v2/labo-logo/serie-2/dessin.mjs
 */
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { atelier, ecrire, pointsDuTrait } from "../pinceau.mjs";

const ICI = dirname(fileURLToPath(import.meta.url));

/* ── Le tracé : des profils de pinceau, valables à toute taille (r = rayon de base) ── */

const profils = (r) => ({
  fut: r,                                                    // un fût droit, d'épaisseur constante
  bras: [r * 0.74, r * 0.86, r * 1.12],                      // part fin du fût, finit en goutte
  lien: [r * 0.74, r * 0.84, r * 0.74],                      // entre deux fûts : fin
  panse: [r * 0.74, r * 0.96, r * 1.1, r * 0.98, r * 0.74],  // se charge dans la courbe
  jambe: [r * 0.8, r * 0.96, r * 1.1],                       // diagonale qui descend et s'épaissit
  arc: [r * 1.14, r * 0.9, r, r, r * 0.9, r * 1.14],         // un C : deux gouttes aux extrémités
});

/** Panse d'un P ou d'un R : barre, demi-cercle, barre. `retour` : abscisse où elle s'arrête en bas. */
function panse(x, y0, y1, large, profil, retour = x) {
  const ray = (y1 - y0) / 2;
  const xc = x + large - ray;
  const k = ray * 0.5523;
  return {
    seg: [
      [x, y0, xc, y0],
      [xc, y0, xc + k, y0, xc + ray, y0 + ray - k, xc + ray, y0 + ray],
      [xc + ray, y0 + ray, xc + ray, y1 - ray + k, xc + k, y1, xc, y1],
      [xc, y1, retour, y1],
    ],
    r: profil,
  };
}

/* ── Le lettrage ─────────────────────────────────────────────────────────── */

const R = 43;
const H = 700;
const haut = 46;
const bas = H - 46;
const P = profils(R);
const t = (seg, r = R) => ({ seg, r });
const fut = (x) => t([[x, haut, x, bas]], P.fut);

const LETTRES = {
  P: { l: 486, traits: [fut(54), panse(54, haut, 392, 380, P.panse)] },
  E: { l: 446, traits: [
    fut(54),
    t([[54, haut, 180, 40, 290, 42, 396, 52]], P.bras),
    t([[54, 350, 150, 346, 250, 348, 344, 356]], P.bras),
    t([[54, bas, 180, 660, 300, 658, 406, 648]], P.bras),
  ] },
  A: { l: 664, traits: [
    t([[332, haut, 54, bas]], P.jambe),
    t([[332, haut, 610, bas]], P.jambe),
    t([[164, 484, 264, 474, 400, 474, 500, 484]], P.lien),
  ] },
  C: { l: 606, traits: [
    t([[540, 176, 484, 90, 402, haut, 326, haut], [326, haut, 158, haut, 50, 178, 50, 350],
       [50, 350, 50, 522, 158, bas, 326, bas], [326, bas, 404, bas, 488, 612, 546, 530]], P.arc),
  ] },
  H: { l: 552, traits: [fut(54), fut(498), t([[54, 350, 200, 342, 352, 342, 498, 350]], P.lien)] },
  Y: { l: 604, traits: [
    t([[52, haut, 302, 392]], [R * 1.12, R * 0.94, R * 0.8]),
    t([[552, haut, 302, 392]], [R * 1.12, R * 0.94, R * 0.8]),
    t([[302, 388, 302, bas]]),
  ] },
  L: { l: 414, traits: [fut(54), t([[54, bas, 170, 660, 280, 658, 376, 648]], P.bras)] },
  T: { l: 524, traits: [t([[40, 58, 180, 38, 344, 38, 484, 58]], [R * 1.12, R * 0.78, R * 1.12]), t([[262, haut, 262, bas]])] },
  I: { l: 108, traits: [fut(54)] },
  M: { l: 744, traits: [
    t([[94, haut, 56, bas]], P.jambe),
    t([[94, haut, 372, 596]], R * 0.78),
    t([[650, haut, 372, 596]], R * 0.78),
    t([[650, haut, 688, bas]], P.jambe),
  ] },
  R: { l: 512, traits: [fut(54), panse(54, haut, 372, 354, P.panse), t([[236, 372, 464, bas]], P.jambe)] },
  " ": { l: 360, traits: [] },
};

/* ── Les signes : le même P, fût allongé, et une image du drainage ───────────
   Boîte de 1000 de haut. Fût en x = 150, panse de y = 54 à y = 486. */

const RS = 50;
const S = profils(RS);
const s = (seg, r = RS) => ({ seg, r });
const X = 150;
const futLong = s([[X, 54, X, 946]], S.fut);
const pansePleine = panse(X, 54, 486, 440, S.panse);

/** Des perles le long d'un trait : de plus en plus pleines, à intervalles égaux. */
function perles(trait, rayons, depart, arrivee) {
  const pts = pointsDuTrait(trait.seg, 1);
  const longueur = pts.length - 1;
  const libre = longueur - depart - arrivee - rayons.reduce((a, r) => a + r * 2, 0);
  const intervalle = libre / (rayons.length - 1);
  let d = depart;
  return rayons.map((r) => {
    d += r;
    const [x, y] = pts[Math.round(d)];
    d += r + intervalle;
    return s([[x, y, x + 0.1, y]], r);
  });
}

const SYMBOLES = {
  // 1 · Goutte : la panse ne se referme pas. Son trait s'allège, et une goutte s'en détache.
  goutte: { l: 700, h: 1000, traits: [
    futLong,
    panse(X, 54, 486, 440, [RS * 0.74, RS * 0.96, RS * 1.1, RS * 1.0, RS * 0.8, RS * 0.34], 330),
    s([[306, 574, 306, 712]], [3, RS * 0.36, RS * 0.74, RS * 1.04, RS * 1.12]),
  ] },
  // 2 · Onde : la panse se répète, emboîtée. Le passage répété de la main, toujours dans le même sens.
  onde: { l: 700, h: 1000, traits: [
    futLong,
    pansePleine,
    panse(X, 162, 378, 258, [RS * 0.5, RS * 0.74, RS * 0.9, RS * 0.74, RS * 0.5]),
    s([[X, 270, 262, 270]], [RS * 0.5, RS * 0.62, RS * 0.84]),
  ] },
  // 3 · Perles : la panse est faite de gouttes qui grossissent en cheminant vers le fût.
  perles: { l: 700, h: 1000, traits: [
    futLong,
    ...perles(pansePleine, [22, 26, 31, 36, 42, 48, 54, 60], 84, 88),
  ] },
};

/* ── Sorties ─────────────────────────────────────────────────────────────── */

const { sortir, fin } = atelier(ICI);
const nom = ecrire(LETTRES, "PEACHY", 104);
await sortir("nom", nom.traits, nom.largeur, H);
const sous = ecrire(LETTRES, "LYMPHATIC THERAPY", 330);
await sortir("sous-titre", sous.traits, sous.largeur, H, { grossi: 1.28 });
for (const [cle, { l, h, traits }] of Object.entries(SYMBOLES)) await sortir(`symbole-${cle}`, traits, l, h);
await sortir("initiale", LETTRES.P.traits, LETTRES.P.l, H);
fin();
