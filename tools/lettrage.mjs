#!/usr/bin/env node
/**
 * Peachy — le lettrage, dessiné à la plume large.
 *
 * Chaque lettre est un squelette (quelques traits), parcouru par une plume plate tenue à
 * angle constant : les pleins et les déliés viennent du geste, pas d'une police. Le A est
 * sans barre, comme sur la maquette cuir de Peachy. Le sous-titre est tracé de la même
 * main, avec une plume plus ronde pour rester lisible en petit.
 *
 *   cd tools && npm install && cd .. && node tools/lettrage.mjs
 *
 * Écrit dans assets/img/logo :
 *   peachy-mot.svg       le nom et son sous-titre (première page, image de partage)
 *   peachy-marque.svg    version pour petites tailles : plume plus large, sous-titre agrandi
 *   titre-*.svg          les noms des prestations, une ligne par fichier
 *   peachy-p.svg         l'initiale seule (icône)
 * ainsi que favicon.svg (le P) et tools/sources/masque-mot.png, le masque noir sur blanc
 * dont tools/couverture.py tire la gravure dans le cuir.
 */
import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const potrace = require("potrace");
const Jimp = require("jimp");

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..");
const LOGO = join(RACINE, "assets", "img", "logo");

/* ── Les squelettes ──────────────────────────────────────────────────────────
   Hauteur de capitale : 700. L'origine est en haut à gauche de la lettre, y vers le bas.
   Un trait est une suite de segments : droite [x0,y0, x1,y1] ou cubique [x0,y0, x1,y1, x2,y2, x3,y3]. */

const HAUT = 700;
const LAMBDA = [[[285, 0, 22, 700]], [[285, 0, 548, 700]]];
const LETTRES = {
  P: { l: 440, traits: [
    [[62, 0, 62, 700]],
    [[62, 16, 300, -8, 438, 60, 438, 196], [438, 196, 438, 322, 322, 384, 150, 384]],   // boucle ouverte
  ] },
  E: { l: 384, traits: [
    [[62, 0, 62, 700]],
    [[62, 16, 372, 16]],
    [[62, 340, 300, 340]],
    [[62, 684, 384, 684]],
  ] },
  A: { l: 570, traits: LAMBDA },                                                        // sans barre
  a: { l: 570, traits: [...LAMBDA, [[128, 470, 446, 470]]] },                           // sous-titre : avec barre
  C: { l: 560, traits: [
    [[528, 150, 470, 46, 388, 8, 300, 8], [300, 8, 132, 8, 34, 160, 34, 350],
     [34, 350, 34, 540, 132, 692, 300, 692], [300, 692, 392, 692, 474, 650, 536, 566]],
  ] },
  H: { l: 520, traits: [
    [[62, 0, 62, 700]],
    [[458, 0, 458, 700]],
    [[62, 340, 458, 340]],
  ] },
  Y: { l: 520, traits: [
    [[16, 0, 110, 120, 200, 260, 262, 392]],
    [[508, 0, 420, 130, 330, 268, 262, 392]],
    [[262, 380, 262, 700]],
  ] },
  L: { l: 370, traits: [[[62, 0, 62, 700]], [[62, 684, 366, 684]]] },
  T: { l: 470, traits: [[[14, 16, 456, 16]], [[235, 0, 235, 700]]] },
  I: { l: 124, traits: [[[62, 0, 62, 700]]] },
  M: { l: 690, traits: [
    [[96, 0, 62, 700]],
    [[96, 0, 345, 640]],
    [[594, 0, 345, 640]],
    [[594, 0, 628, 700]],
  ] },
  R: { l: 480, traits: [
    [[62, 0, 62, 700]],
    [[62, 16, 290, -6, 404, 56, 404, 186], [404, 186, 404, 308, 304, 364, 150, 364]],
    [[236, 364, 462, 700]],
  ] },
  B: { l: 440, traits: [
    [[62, 0, 62, 700]],
    [[62, 16, 250, 0, 362, 50, 362, 172], [362, 172, 362, 292, 262, 338, 62, 338]],
    [[62, 338, 300, 330, 414, 400, 414, 516], [414, 516, 414, 640, 292, 692, 62, 684]],
  ] },
  D: { l: 540, traits: [
    [[62, 0, 62, 700]],
    [[62, 16, 380, 0, 506, 150, 506, 350], [506, 350, 506, 550, 380, 700, 62, 684]],
  ] },
  G: { l: 590, traits: [
    [[528, 150, 470, 46, 388, 8, 300, 8], [300, 8, 132, 8, 34, 160, 34, 350],
     [34, 350, 34, 540, 132, 692, 300, 692], [300, 692, 396, 692, 478, 660, 528, 606]],
    [[528, 396, 528, 612]],
  ] },
  N: { l: 550, traits: [
    [[62, 0, 62, 700]],
    [[62, 0, 488, 700]],
    [[488, 0, 488, 700]],
  ] },
  O: { l: 630, traits: [
    [[315, 8, 150, 8, 34, 160, 34, 350], [34, 350, 34, 540, 150, 692, 315, 692],
     [315, 692, 480, 692, 596, 540, 596, 350], [596, 350, 596, 160, 480, 8, 315, 8]],
  ] },
  Q: { l: 630, traits: [
    [[315, 8, 150, 8, 34, 160, 34, 350], [34, 350, 34, 540, 150, 692, 315, 692],
     [315, 692, 480, 692, 596, 540, 596, 350], [596, 350, 596, 160, 480, 8, 315, 8]],
    [[350, 600, 430, 690, 520, 770, 640, 790]],
  ] },
  S: { l: 430, traits: [
    [[366, 132, 326, 44, 262, 8, 206, 8], [206, 8, 112, 8, 52, 72, 52, 170], [52, 170, 52, 286, 150, 318, 218, 348],
     [218, 348, 304, 386, 384, 430, 384, 530], [384, 530, 384, 630, 304, 692, 204, 692], [204, 692, 122, 692, 62, 648, 32, 560]],
  ] },
  U: { l: 520, traits: [
    [[62, 0, 62, 460], [62, 460, 62, 620, 150, 692, 260, 692], [260, 692, 370, 692, 458, 620, 458, 460], [458, 460, 458, 0]],
  ] },
  "É": { l: 384, traits: [
    [[62, 0, 62, 700]], [[62, 16, 372, 16]], [[62, 340, 300, 340]], [[62, 684, 384, 684]],
    [[170, -118, 282, -214]],
  ] },
  "À": { l: 570, traits: [...LAMBDA, [[232, -214, 318, -112]]] },
  " ": { l: 330, traits: [] },
};

/* ── La plume ────────────────────────────────────────────────────────────── */

const PLUMES = {
  nom: { largeur: 60, epaisseur: 13, angle: 24 },         // contraste marqué : le nom en grand
  nomPetit: { largeur: 74, epaisseur: 20, angle: 24 },    // le même geste, plus encré, pour la barre du site
  gravure: { largeur: 76, epaisseur: 24, angle: 24 },     // plus de corps encore : un creux doit se lire sans encre
  sousTitreGrave: { largeur: 104, epaisseur: 62, angle: 24 },
  sousTitre: { largeur: 82, epaisseur: 42, angle: 24 },   // plume ronde : lisible à 1/5 de la taille
};

function pointsDuSegment(s, pas = 1.5) {
  const pts = [];
  if (s.length === 4) {
    const n = Math.ceil(Math.hypot(s[2] - s[0], s[3] - s[1]) / pas);
    for (let i = 0; i <= n; i++) pts.push([s[0] + ((s[2] - s[0]) * i) / n, s[1] + ((s[3] - s[1]) * i) / n]);
    return pts;
  }
  const [x0, y0, x1, y1, x2, y2, x3, y3] = s;
  const n = Math.ceil((Math.hypot(x1 - x0, y1 - y0) + Math.hypot(x2 - x1, y2 - y1) + Math.hypot(x3 - x2, y3 - y2)) / pas);
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    pts.push([
      u ** 3 * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t ** 3 * x3,
      u ** 3 * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t ** 3 * y3,
    ]);
  }
  return pts;
}

/** Écrit un mot : renvoie les empreintes de plume (en unités de lettre) et la largeur encrée. */
function ecrire(texte, plume, approche) {
  const empreintes = [];
  let x = 0;
  for (const c of texte) {
    const { l, traits } = LETTRES[c];
    for (const trait of traits) for (const seg of trait) for (const [px, py] of pointsDuSegment(seg)) empreintes.push([x + px, py]);
    x += l + approche;
  }
  return { empreintes, largeur: x - approche, plume };
}

/** Une planche : un calque en noir et blanc où l'on pose des mots à une échelle donnée. */
class Planche {
  constructor(largeur, hauteur) {
    this.l = Math.ceil(largeur);
    this.h = Math.ceil(hauteur);
    this.encre = new Uint8Array(this.l * this.h);
  }

  poser({ empreintes, plume }, x0, y0, echelle) {
    const a = (-plume.angle * Math.PI) / 180;
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    const rx = (plume.largeur / 2) * echelle;
    const ry = (plume.epaisseur / 2) * echelle;
    const r = Math.ceil(Math.max(rx, ry)) + 1;
    for (const [ex, ey] of empreintes) {
      const cx = x0 + ex * echelle;
      const cy = y0 + ey * echelle;
      for (let y = Math.max(0, Math.floor(cy - r)); y <= Math.min(this.h - 1, Math.ceil(cy + r)); y++) {
        for (let x = Math.max(0, Math.floor(cx - r)); x <= Math.min(this.l - 1, Math.ceil(cx + r)); x++) {
          const dx = x - cx;
          const dy = y - cy;
          const u = (dx * cos - dy * sin) / rx;
          const v = (dx * sin + dy * cos) / ry;
          if (u * u + v * v <= 1) this.encre[y * this.l + x] = 1;
        }
      }
    }
  }

  image() {
    const img = new Jimp(this.l, this.h, 0xffffffff);
    const d = img.bitmap.data;
    for (let i = 0; i < this.encre.length; i++) if (this.encre[i]) d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = 0;
    return img;
  }

  /** Vectorise la planche ; les coordonnées sont divisées par `division`. */
  chemin(division) {
    return new Promise((resolve, reject) => {
      const trace = new potrace.Potrace({ threshold: 128, turdSize: 12, optTolerance: 0.5, alphaMax: 1.0 });
      trace.loadImage(this.image(), (err) => {
        if (err) return reject(err);
        const d = /\sd="([^"]+)"/.exec(trace.getPathTag())[1];
        resolve(
          d
            .replace(/-?\d+(?:\.\d+)?/g, (v) => String(Math.round((Number(v) / division) * 100) / 100))
            .replace(/\s*,\s*/g, " ")
            .replace(/\s+/g, " ")
            .trim(),
        );
      });
    });
  }
}

/* ── Composition ─────────────────────────────────────────────────────────── */

const MARGE = 60;      // en pixels de planche
const DIVISION = 10;   // 10 px de planche = 1 unité du SVG

/** Nom et sous-titre centrés l'un sous l'autre. `sous` : hauteur du sous-titre, intervalle, largeur visée. */
function composer({ plumeNom, approcheNom, sous, plumeSous = PLUMES.sousTitre }) {
  const nom = ecrire("PEACHY", plumeNom, approcheNom);
  const echelleSous = sous.hauteur / HAUT;
  // l'approche du sous-titre est réglée pour qu'il occupe la part voulue de la largeur du nom
  const lettres = "LYMPHaTIC THERaPY";
  const naturel = ecrire(lettres, plumeSous, 0).largeur;
  const approcheSous = (nom.largeur * sous.part / echelleSous - naturel) / (lettres.length - 1);
  const sousTitre = ecrire(lettres, plumeSous, approcheSous);
  const largeur = nom.largeur + MARGE * 2;
  const hauteur = HAUT + sous.intervalle + sous.hauteur + MARGE * 2;
  const planche = new Planche(largeur, hauteur);
  planche.poser(nom, MARGE, MARGE, 1);
  planche.poser(sousTitre, MARGE + (nom.largeur - sousTitre.largeur * echelleSous) / 2, MARGE + HAUT + sous.intervalle, echelleSous);
  return planche;
}

async function ecrireSvg(planche, fichier) {
  const d = await planche.chemin(DIVISION);
  const l = planche.l / DIVISION;
  const h = planche.h / DIVISION;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${l} ${h}" role="img" aria-label="Peachy — Lymphatic Therapy">` +
    `<path fill="#000" fill-rule="evenodd" d="${d}"/></svg>\n`;
  writeFileSync(join(LOGO, fichier), svg);
  console.log(fichier.padEnd(20), `${l} × ${h}`, `${(svg.length / 1024).toFixed(1)} Ko`);
}

// Le nom en grand : sous-titre fin et très espacé, comme sur les maquettes.
const mot = composer({ plumeNom: PLUMES.nom, approcheNom: 250, sous: { hauteur: 112, intervalle: 300, part: 0.66 } });
await ecrireSvg(mot, "peachy-mot.svg");

// Le masque de la gravure : la même composition, tracée d'une plume plus large, en 2400 px.
const grave = composer({
  plumeNom: PLUMES.gravure, approcheNom: 250, plumeSous: PLUMES.sousTitreGrave,
  sous: { hauteur: 112, intervalle: 300, part: 0.66 },
});
const masque = grave.image().resize(2400, Jimp.AUTO, Jimp.RESIZE_BICUBIC);
await masque.writeAsync(join(RACINE, "tools", "sources", "masque-mot.png"));
console.log("masque-mot.png".padEnd(20), `${masque.bitmap.width} × ${masque.bitmap.height}`);

// La barre du site : plume plus encrée, sous-titre agrandi et justifié sur le nom.
const marque = composer({ plumeNom: PLUMES.nomPetit, approcheNom: 220, sous: { hauteur: 250, intervalle: 250, part: 1 } });
await ecrireSvg(marque, "peachy-marque.svg");

// Les noms des prestations, ligne par ligne, dans la même écriture. Une ligne réserve la
// place des accents au-dessus des capitales ; toutes ont donc la même hauteur.
const ACCENT = 260;
const LIGNES = {
  "titre-drainage": "DRAINAGE",
  "titre-lymphatique": "LYMPHATIQUE",
  "titre-luminotherapie": "LUMINOTHÉRAPIE",
  "titre-brossage": "BROSSAGE",
  "titre-a-sec": "À SEC",
};
for (const [fichier, texte] of Object.entries(LIGNES)) {
  const ligne = ecrire(texte, PLUMES.nom, 170);
  const planche = new Planche(ligne.largeur + MARGE * 2, HAUT + ACCENT + MARGE + 110);
  planche.poser(ligne, MARGE, ACCENT, 1);
  await ecrireSvg(planche, `${fichier}.svg`);
}

// Favicon : le P, crème sur le cuir.
const p = new Planche(LETTRES.P.l + MARGE * 2, HAUT + MARGE * 2);
p.poser(ecrire("P", { largeur: 96, epaisseur: 34, angle: 24 }, 0), MARGE, MARGE, 1);
const dP = await p.chemin(DIVISION);
writeFileSync(
  join(LOGO, "peachy-p.svg"),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${p.l / DIVISION} ${p.h / DIVISION}"><path fill-rule="evenodd" d="${dP}"/></svg>\n`,
);
const k = 40 / (p.h / DIVISION);
const favicon =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#7A4C33"/>` +
  `<path fill="#F0DCC0" fill-rule="evenodd" transform="translate(${(32 - (p.l / DIVISION) * k / 2 + 1).toFixed(2)} 12) scale(${k.toFixed(4)})" d="${dP}"/></svg>\n`;
writeFileSync(join(RACINE, "favicon.svg"), favicon);
console.log("favicon.svg");
