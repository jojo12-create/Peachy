/**
 * Peachy — banc d'essai des logos : le pinceau, commun à toutes les séries.
 *
 * Un trait = une suite de segments parcourue par un pinceau rond. Les formes obtenues sont
 * vectorisées (potrace, installé dans tools/) et écrites en SVG, une pièce par fichier.
 */
import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ICI = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(ICI, "..", "..", "tools", "package.json"));
const potrace = require("potrace");
const Jimp = require("jimp");

/* ── Le pinceau ──────────────────────────────────────────────────────────────
   Un trait = une suite de segments (droite [x0,y0,x1,y1] ou cubique à 8 nombres) parcourue
   par un pinceau rond. `r` est son rayon : un nombre, ou une liste de rayons répartis le
   long du trait (le pinceau se charge puis s'allège : c'est ce qui dessine une feuille).
   Un trait marqué `gomme` retire l'encre au lieu d'en poser (réserve dans une forme pleine). */

export function pointsDuTrait(segments, pas = 1.2) {
  const pts = [];
  for (const s of segments) {
    if (s.length === 4) {
      const n = Math.max(1, Math.ceil(Math.hypot(s[2] - s[0], s[3] - s[1]) / pas));
      for (let i = 0; i <= n; i++) pts.push([s[0] + ((s[2] - s[0]) * i) / n, s[1] + ((s[3] - s[1]) * i) / n]);
    } else {
      const [x0, y0, x1, y1, x2, y2, x3, y3] = s;
      const n = Math.max(1, Math.ceil((Math.hypot(x1 - x0, y1 - y0) + Math.hypot(x2 - x1, y2 - y1) + Math.hypot(x3 - x2, y3 - y2)) / pas));
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const u = 1 - t;
        pts.push([
          u ** 3 * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t ** 3 * x3,
          u ** 3 * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t ** 3 * y3,
        ]);
      }
    }
  }
  return pts;
}

/** Rayon du pinceau à la position t (0 → 1) : courbe lisse passant par les rayons donnés
    (Catmull-Rom), pour que le trait enfle et s'affine sans à-coup. */
function rayon(r, t) {
  if (typeof r === "number") return r;
  const x = t * (r.length - 1);
  const i = Math.min(r.length - 2, Math.floor(x));
  const f = x - i;
  const p0 = r[Math.max(0, i - 1)];
  const p1 = r[i];
  const p2 = r[i + 1];
  const p3 = r[Math.min(r.length - 1, i + 2)];
  const v = 0.5 * (2 * p1 + (p2 - p0) * f + (2 * p0 - 5 * p1 + 4 * p2 - p3) * f * f + (3 * p1 - p0 - 3 * p2 + p3) * f ** 3);
  return Math.max(1, v);
}

export class Planche {
  constructor(l, h) {
    this.l = Math.ceil(l);
    this.h = Math.ceil(h);
    this.encre = new Uint8Array(this.l * this.h);
  }

  /** Pose des traits à (x0, y0), à l'échelle donnée. `grossi` multiplie le rayon (graisse). */
  poser(traits, x0, y0, echelle = 1, grossi = 1) {
    for (const { seg, r, gomme } of traits) {
      const pts = pointsDuTrait(seg);
      const valeur = gomme ? 0 : 1;
      pts.forEach(([px, py], k) => {
        const cx = x0 + px * echelle;
        const cy = y0 + py * echelle;
        const ray = rayon(r, pts.length > 1 ? k / (pts.length - 1) : 0) * echelle * grossi;
        const r2 = ray * ray;
        for (let y = Math.max(0, Math.floor(cy - ray)); y <= Math.min(this.h - 1, Math.ceil(cy + ray)); y++) {
          for (let x = Math.max(0, Math.floor(cx - ray)); x <= Math.min(this.l - 1, Math.ceil(cx + ray)); x++) {
            if ((x - cx) ** 2 + (y - cy) ** 2 <= r2) this.encre[y * this.l + x] = valeur;
          }
        }
      });
    }
  }

  image() {
    const img = new Jimp(this.l, this.h, 0xffffffff);
    const d = img.bitmap.data;
    for (let i = 0; i < this.encre.length; i++) if (this.encre[i]) d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = 0;
    return img;
  }

  chemin(division) {
    return new Promise((resolve, reject) => {
      const trace = new potrace.Potrace({ threshold: 128, turdSize: 20, optTolerance: 0.6, alphaMax: 1.1 });
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

/** Écrit un mot : place les lettres bout à bout, séparées par `approche`. */
export function ecrire(lettres, texte, approche) {
  const traits = [];
  let x = 0;
  for (const c of texte) {
    const { l, traits: ts } = lettres[c];
    for (const tr of ts) traits.push({ ...tr, seg: tr.seg.map((sg) => sg.map((v, i) => (i % 2 ? v : v + x))) });
    x += l + approche;
  }
  return { traits, largeur: x - approche };
}

/** Un atelier écrit ses pièces dans <dossier>/svg et leurs dimensions dans <dossier>/pieces.js. */
export function atelier(dossier) {
  const MARGE = 70;
  const DIV = 10;
  const pieces = {};
  return {
    async sortir(nom, traits, largeur, hauteur, { grossi = 1 } = {}) {
      const planche = new Planche(largeur + MARGE * 2, hauteur + MARGE * 2);
      planche.poser(traits, MARGE, MARGE, 1, grossi);
      const d = await planche.chemin(DIV);
      const l = planche.l / DIV;
      const h = planche.h / DIV;
      writeFileSync(
        join(dossier, "svg", `${nom}.svg`),
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${l} ${h}"><path fill-rule="evenodd" d="${d}"/></svg>\n`,
      );
      pieces[nom] = { l, h };
      console.log(nom.padEnd(20), `${l} × ${h}`);
    },
    fin() {
      writeFileSync(join(dossier, "pieces.js"), `// Écrit par dessin.mjs : dimensions (unités SVG) de chaque pièce.\nexport const pieces = ${JSON.stringify(pieces, null, 2)};\n`);
    },
  };
}
