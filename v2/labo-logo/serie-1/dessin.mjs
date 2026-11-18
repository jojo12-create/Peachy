#!/usr/bin/env node
/**
 * Peachy — banc d'essai des logos, série 1 (copie v2). Rien ici ne touche à la démo.
 *
 * Principe repris de la référence TIERRA (Azuri Studio Solaire) :
 *   1. un lettrage au pinceau rond : traits presque égaux, bouts arrondis, horizontales
 *      légèrement cintrées ;
 *   2. un symbole né de l'initiale, dans le même tracé : chez TIERRA la barre du T est
 *      répétée trois fois sur un fût allongé ; ici c'est la panse du P qui est travaillée ;
 *   3. un sous-titre en petites capitales très espacées ;
 *   4. une encre crème, à plat, sur une matière terracotta.
 *
 *   node v2/labo-logo/serie-1/dessin.mjs
 *
 * Écrit serie-1/svg/*.svg et serie-1/pieces.js (dimensions de chaque pièce).
 */
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { atelier, ecrire } from "../pinceau.mjs";

const ICI = dirname(fileURLToPath(import.meta.url));

/* ── Le lettrage ─────────────────────────────────────────────────────────────
   Hauteur de capitale 700. R : rayon du pinceau. Les horizontales sont cintrées d'un
   rien, comme la barre du T de la référence. */

const R = 45;
const H = 700;
const haut = R;
const bas = H - R;
const t = (seg, r = R) => ({ seg, r });
// Un tracé ferme : fûts d'épaisseur constante, barres à peine allégées en bout.
const BARRE = [R, R, R * 0.9];
const TRAVERSE = [R * 0.9, R * 0.96, R * 0.9];
const fut = (x) => t([[x, haut, x, bas]]);
// Panse géométrique : une barre droite, un demi-cercle, une barre droite.
const panse = (x, y0, y1, large) => {
  const ray = (y1 - y0) / 2;
  const xc = x + large - ray;       // début de l'arrondi
  const k = ray * 0.5523;
  return t([
    [x, y0, xc, y0],
    [xc, y0, xc + k, y0, xc + ray, y0 + ray - k, xc + ray, y0 + ray],
    [xc + ray, y0 + ray, xc + ray, y1 - ray + k, xc + k, y1, xc, y1],
    [xc, y1, x, y1],
  ]);
};

const LETTRES = {
  P: { l: 486, traits: [fut(54), panse(54, haut, 392, 380)] },
  E: { l: 440, traits: [
    fut(54),
    t([[54, haut, 180, 41, 290, 41, 392, 47]], BARRE),
    t([[54, 350, 150, 347, 250, 347, 340, 352]], BARRE),
    t([[54, bas, 180, 659, 300, 659, 402, 652]], BARRE),
  ] },
  A: { l: 660, traits: [
    t([[330, haut + 4, 52, bas]]),
    t([[330, haut + 4, 608, bas]]),
    t([[158, 478, 260, 470, 400, 470, 502, 478]], TRAVERSE),
  ] },
  C: { l: 604, traits: [
    t([[538, 170, 480, 86, 400, haut, 326, haut], [326, haut, 158, haut, 50, 178, 50, 350],
       [50, 350, 50, 522, 158, bas, 326, bas], [326, bas, 404, bas, 486, 618, 544, 536]]),
  ] },
  H: { l: 552, traits: [fut(54), fut(498), t([[54, 350, 200, 344, 352, 344, 498, 350]], TRAVERSE)] },
  Y: { l: 600, traits: [
    t([[50, haut, 300, 388]]),
    t([[550, haut, 300, 388]]),
    t([[300, 384, 300, bas]]),
  ] },
  L: { l: 410, traits: [fut(54), t([[54, bas, 170, 659, 280, 659, 372, 652]], BARRE)] },
  T: { l: 520, traits: [t([[36, 54, 180, 38, 340, 38, 484, 54]], [R * 0.82, R, R * 0.82]), fut(260)] },
  I: { l: 108, traits: [fut(54)] },
  M: { l: 740, traits: [
    t([[92, haut, 54, bas]]),
    t([[92, haut, 370, 600]]),
    t([[648, haut, 370, 600]]),
    t([[648, haut, 686, bas]]),
  ] },
  R: { l: 508, traits: [fut(54), panse(54, haut, 372, 354), t([[236, 372, 462, bas]])] },
  " ": { l: 360, traits: [] },
};

/* ── Les symboles : trois façons de faire naître un signe du P ───────────────
   Boîte de 700 de large ; la hauteur dépend du dessin. Rayon de base : RS. */

const RS = 50;
const s = (seg, r = RS) => ({ seg, r });
const gomme = (seg, r) => ({ seg, r, gomme: true });
const CROISSANT = (m) => [RS * 0.72 * m, RS * 1.08 * m, RS * 1.16 * m, RS * 1.08 * m, RS * 0.72 * m];

const SYMBOLES = {
  // 1 · Onde : la panse du P se répète trois fois, emboîtée, comme la barre du T de la référence
  //     se répète sur son fût. Une demi-pêche et son noyau ; le passage de la main ; les niches du lieu.
  onde: { l: 650, h: 1000, traits: [
    s([[150, 50, 150, 950]]),
    s([[150, 74, 340, 44, 580, 154, 580, 384], [580, 384, 580, 614, 340, 724, 150, 694]], CROISSANT(1)),
    s([[150, 212, 280, 196, 410, 270, 410, 384], [410, 384, 410, 498, 280, 572, 150, 556]], CROISSANT(0.86)),
    s([[150, 384, 268, 384]], [RS * 0.92, RS, RS * 0.74]),
  ] },
  // 2 · Pêche : le P devient le fruit. La panse est ronde et pleine ; la feuille se pose au-dessus,
  //     détachée, comme sur le premier logo de Peachy.
  peche: { l: 700, h: 1000, traits: [
    s([[150, 330, 150, 950]]),
    s([[150, 330, 300, 300, 640, 330, 640, 560], [640, 560, 640, 790, 300, 820, 150, 790]]),
    s([[300, 196, 350, 96, 450, 50, 566, 48]], [8, RS * 1.25, RS * 1.3, 8]),
  ] },
  // 3 · Plein : la panse du P est une masse, comme les lobes pleins de la référence. Une demi-pêche,
  //     fendue par son sillon laissé en réserve. Le signe le plus lisible en très petit.
  plein: { l: 650, h: 1000, traits: [
    s([[330, 384, 334, 384]], 300),
    gomme([[-110, -60, -110, 1060]], 210),
    gomme([[250, 150, 400, 250, 440, 440, 330, 640]], [10, 20, 20, 8]),
    s([[150, 50, 150, 950]]),
  ] },
};

/* ── Sorties ─────────────────────────────────────────────────────────────── */

const { sortir, fin } = atelier(ICI);
const nom = ecrire(LETTRES, "PEACHY", 104);
await sortir("nom", nom.traits, nom.largeur, H);
// Sous-titre : même pinceau, plus chargé pour rester lisible en petit, très espacé.
const sous = ecrire(LETTRES, "LYMPHATIC THERAPY", 330);
await sortir("sous-titre", sous.traits, sous.largeur, H, { grossi: 1.3 });
for (const [cle, { l, h, traits }] of Object.entries(SYMBOLES)) await sortir(`symbole-${cle}`, traits, l, h);
// L'initiale seule, pour comparer le signe à la lettre dont il vient.
await sortir("initiale", LETTRES.P.traits, LETTRES.P.l, H);
fin();
