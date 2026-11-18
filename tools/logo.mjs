#!/usr/bin/env node
/**
 * Peachy — logo, étape 2 : la vectorisation.
 *
 * Lit le masque produit par tools/logo.py, le vectorise (potrace) et écrit les
 * fichiers du logo dans assets/img/logo, ainsi que le favicon :
 *
 *   peachy-logo-{creme,chocolat,mono}.svg   logo complet (symbole, nom, sous-titre)
 *   peachy-symbole.svg                      la pêche seule
 *   peachy-mot.svg                          nom et sous-titre, proportions du logo
 *   peachy-marque.svg                       nom et sous-titre agrandi, pour les petites tailles
 *
 *   cd tools && npm install && cd .. && python3 tools/logo.py && node tools/logo.mjs
 *
 * Le symbole et le nom PEACHY sont tracés d'après la maquette : leur dessin n'existe
 * dans aucune police. Le sous-titre, trop petit sur la maquette pour être tracé
 * proprement, est composé en Montserrat (OFL) et posé lettre à lettre aux positions
 * relevées sur la maquette.
 */
import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const potrace = require("potrace");
const opentype = require("opentype.js");

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCES = join(RACINE, "tools", "sources");
const SORTIE = join(RACINE, "assets", "img", "logo");

const E = 8;                                   // échelle du masque (tools/logo.py)
// Bandes du masque (px) : feuille + trait, nom, sous-titre.
const SYMBOLE = { x0: 1298, x1: 2917, y0: 28, y1: 1919 };
const NOM = { x0: 316, x1: 3908, y0: 2197, y1: 2557 };
const SOUS = { y0: 2865, y1: 2976 };
// Position de chaque lettre du sous-titre sur la maquette (bords gauche et droit, px du masque).
const LETTRES = [
  ["L", 709, 774], ["Y", 849, 936], ["M", 1027, 1136], ["P", 1237, 1320], ["H", 1414, 1505],
  ["A", 1599, 1697], ["T", 1775, 1856], ["I", 1947, 1961], ["C", 2054, 2146],
  ["T", 2352, 2431], ["H", 2523, 2615], ["E", 2715, 2793], ["R", 2886, 2969],
  ["A", 3056, 3160], ["P", 3250, 3330], ["Y", 3414, 3501],
];

const n = (v) => String(Math.round(v * 100) / 100);

/** Vectorise le masque et renvoie ses contours, un par sous-chemin, en unités du logo. */
function tracer() {
  return new Promise((resolve, reject) => {
    const trace = new potrace.Potrace({ threshold: 128, turdSize: 60, optTolerance: 0.8, alphaMax: 1.0 });
    trace.loadImage(join(SOURCES, "logo-masque.png"), (err) => {
      if (err) return reject(err);
      const d = /\sd="([^"]+)"/.exec(trace.getPathTag())[1];
      // Chaque sous-chemin (contour extérieur ou contre-forme) est ramené aux unités du logo ;
      // son ordonnée moyenne dit à quelle bande il appartient.
      const contours = d.split(/(?=M)/).map((sous) => {
        const ys = [];
        let rang = 0;
        const chemin = sous.replace(/-?\d+(?:\.\d+)?/g, (v) => {
          const valeur = Number(v) / E;
          if (rang++ % 2) ys.push(valeur);
          return String(Math.round(valeur * 10) / 10);
        });
        return {
          chemin: chemin.replace(/\s*,\s*/g, " ").replace(/\s+/g, " ").trim(),
          y: (Math.min(...ys) + Math.max(...ys)) / 2,
        };
      });
      resolve(contours);
    });
  });
}

const contours = await tracer();
const bande = (b) => contours.filter((c) => c.y > b.y0 / E - 2 && c.y < b.y1 / E + 2).map((c) => c.chemin).join("");
const symbole = bande(SYMBOLE);
const nom = bande(NOM);

/* ── Sous-titre en Montserrat ────────────────────────────────────────────── */

const police = opentype.loadSync(join(SOURCES, "Montserrat-Regular.ttf"));
const HAUTEUR_CAP = police.tables.os2.sCapHeight / police.unitsPerEm;

/** Sous-titre du logo : chaque lettre centrée sur sa position relevée. */
function sousTitreMaquette() {
  const corps = (SOUS.y1 - SOUS.y0 - 4) / E / HAUTEUR_CAP;
  const base = SOUS.y1 / E - 0.2;
  return LETTRES.map(([lettre, g, d]) => {
    const glyphe = police.charToGlyph(lettre);
    const boite = glyphe.getPath(0, 0, corps).getBoundingBox();
    const x = (g + d) / 2 / E - (boite.x1 + boite.x2) / 2;
    return glyphe.getPath(x, base, corps).toPathData(2);
  }).join("");
}

/** Sous-titre agrandi, justifié sur la largeur du nom : pour les petites tailles. */
function sousTitreJustifie(x0, x1, base, hauteurCap) {
  const corps = hauteurCap / HAUTEUR_CAP;
  const texte = "LYMPHATIC THERAPY";
  const glyphes = [...texte].map((c) => police.charToGlyph(c));
  const avance = (g) => (g.advanceWidth / police.unitsPerEm) * corps;
  const premiere = glyphes[0].getPath(0, 0, corps).getBoundingBox();
  const derniere = glyphes.at(-1).getPath(0, 0, corps).getBoundingBox();
  // largeur encrée = somme des avances, moins les approches extérieures
  const naturel = glyphes.slice(0, -1).reduce((s, g) => s + avance(g), 0) + derniere.x2 - premiere.x1;
  const approche = (x1 - x0 - naturel) / (glyphes.length - 1);
  let x = x0 - premiere.x1;
  return glyphes.map((g) => {
    const d = g.getPath(x, base, corps).toPathData(2);
    x += avance(g) + approche;
    return d;
  }).join("");
}

/* ── Fichiers ────────────────────────────────────────────────────────────── */

const MARGE = 5;
function svg({ boite, corps, couleur, nomFichier, titre }) {
  const [x0, y0, x1, y1] = boite;
  const largeur = n(x1 - x0 + MARGE * 2);
  const hauteur = n(y1 - y0 + MARGE * 2);
  const contenu =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${largeur} ${hauteur}" role="img" aria-label="${titre}">` +
    `<path fill="${couleur}" fill-rule="evenodd" transform="translate(${n(MARGE - x0)} ${n(MARGE - y0)})" d="${corps}"/></svg>\n`;
  writeFileSync(join(SORTIE, nomFichier), contenu);
  console.log(nomFichier.padEnd(28), `${largeur} × ${hauteur}`, `${(contenu.length / 1024).toFixed(1)} Ko`);
  return { largeur: Number(largeur), hauteur: Number(hauteur) };
}

const TITRE = "Peachy — Lymphatic Therapy";
const complet = symbole + nom + sousTitreMaquette();
const boiteComplete = [NOM.x0 / E, SYMBOLE.y0 / E, NOM.x1 / E, SOUS.y1 / E];
for (const [suffixe, couleur] of [["creme", "#EAD9C6"], ["chocolat", "#28170F"], ["mono", "#000"]]) {
  svg({ boite: boiteComplete, corps: complet, couleur, nomFichier: `peachy-logo-${suffixe}.svg`, titre: TITRE });
}
svg({
  boite: [SYMBOLE.x0 / E, SYMBOLE.y0 / E, SYMBOLE.x1 / E, SYMBOLE.y1 / E],
  corps: symbole, couleur: "#000", nomFichier: "peachy-symbole.svg", titre: "Peachy",
});
svg({
  boite: [NOM.x0 / E, NOM.y0 / E, NOM.x1 / E, SOUS.y1 / E],
  corps: nom + sousTitreMaquette(), couleur: "#000", nomFichier: "peachy-mot.svg", titre: TITRE,
});
const capMarque = 23;
const baseMarque = NOM.y1 / E + 30 + capMarque;
svg({
  boite: [NOM.x0 / E, NOM.y0 / E, NOM.x1 / E, baseMarque],
  corps: nom + sousTitreJustifie(NOM.x0 / E + 1, NOM.x1 / E - 1, baseMarque, capMarque),
  couleur: "#000", nomFichier: "peachy-marque.svg", titre: TITRE,
});

/* ── Favicon : le symbole crème sur le terracotta du papier ──────────────── */

const cote = 64;
const hSymbole = (SYMBOLE.y1 - SYMBOLE.y0) / E;
const lSymbole = (SYMBOLE.x1 - SYMBOLE.x0) / E;
const k = 46 / hSymbole;
const favicon =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${cote} ${cote}"><rect width="${cote}" height="${cote}" rx="14" fill="#74412A"/>` +
  `<path fill="#F0DCC0" fill-rule="evenodd" transform="translate(${n((cote - lSymbole * k) / 2 - (SYMBOLE.x0 / E) * k)} ${n((cote - hSymbole * k) / 2 - (SYMBOLE.y0 / E) * k)}) scale(${n(k)})" d="${symbole}"/></svg>\n`;
writeFileSync(join(RACINE, "favicon.svg"), favicon);
console.log("favicon.svg");
