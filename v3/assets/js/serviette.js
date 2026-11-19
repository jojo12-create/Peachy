/**
 * Peachy — la serviette brodée (couverture de la page).
 *
 * 1. La serviette se dépose : elle arrive floue et lisse, ses plis se forment, puis tout s'arrête.
 * 2. La caméra s'approche et la broderie apparaît : de longues lanières douces, éparses, glissent
 *    le long de chaque ligne et la dévoilent par endroits, puis en entier. Une lueur les accompagne.
 *    La caméra va d'un ouvrage à l'autre.
 * 3. La caméra recule : la serviette entière, la bande tissée en bas de l'écran.
 *
 * Le fil brodé est celui de la photographie. Chaque mot est une pièce : sur un écran large elle
 * reste à sa place ; sur un écran en hauteur, les mots s'empilent sur toute la hauteur, et chaque
 * pièce prend la lumière et l'ondulation des plis où elle se pose. Seul l'instant où chaque
 * lanière passe est calculé (tools/serviette.py).
 * Sans WebGL 2 ou sans script, l'image brodée s'affiche telle quelle.
 */
import { serviette as D } from "./serviette-donnees.js";

const IMAGES = "assets/img/serviette/";
const POSE = 2.4; // secondes : la serviette se dépose
const SILENCE = 0.4; // la serviette est immobile ; la caméra commence à s'approcher
const RECUL = 1.7; // retour au plan d'ensemble après le dernier point
const HATE = 7; // vitesse de la suite quand la personne commence à défiler
const PIECES = 14; // nombre maximal de pièces brodées

const VERTEX = `#version 300 es
in vec2 aCoin;
uniform vec2 uCentre, uDemi;
uniform float uAngle;
out vec2 vP;
void main() {
  float c = cos(uAngle), s = sin(uAngle);
  vec2 q = vec2(aCoin.x, -aCoin.y) * uDemi;
  vP = uCentre + vec2(c * q.x - s * q.y, s * q.x + c * q.y);
  gl_Position = vec4(aCoin, 0.0, 1.0);
}`;

const FRAGMENT = `#version 300 es
precision highp float;
in vec2 vP;
out vec4 couleur;

uniform sampler2D uBrodee, uNue, uCarte, uPoints, uPlis, uEponge;
uniform vec2 uTaille;        // image, en pixels
uniform vec3 uMarges;        // prolongement haut, bas, côtés
uniform vec3 uMoyenne;       // teinte moyenne de la serviette
uniform float uPose;         // 0 → 1 : la serviette se dépose
uniform float uFil;          // 0 → 1 : avancée de la couture
uniform float uDuree;        // durée de l'apparition, en secondes
uniform float uDouceur;      // fondu de la pointe d'une lanière, en secondes
uniform vec4 uSurvol;        // centre et demi-côtés du groupe survolé
uniform vec2 uSurvolAngle;   // cos, sin de son inclinaison
uniform float uSurvolForce;

// Les pièces brodées : où chacune se lit dans l'image, où elle se pose sur la serviette.
uniform int uPieces;
uniform vec4 uBoite[${PIECES}];   // boîte de la pièce dans l'image (avec marge)
uniform vec4 uAncre[${PIECES}];   // xy : ancre dans l'image ; zw : ancre sur la serviette
uniform vec4 uMat[${PIECES}];     // de la serviette vers l'image
uniform vec2 uInfo[${PIECES}];    // numéro du groupe ; 1 si la pièce est déplacée

vec2 versPlis(vec2 p) {
  return vec2((p.x + uMarges.z) / (uTaille.x + 2.0 * uMarges.z), (p.y + uMarges.x) / (uTaille.y + uMarges.x + uMarges.y));
}
float clair(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

void main() {
  vec2 p = vP;
  float grain_ecran = length(dFdx(vP));   // pixels d'image par pixel d'écran

  // ── La pose : la serviette touche d'abord en bas à gauche, le reste suit ──
  float rang = clamp(dot(p / uTaille, vec2(0.38, -0.62)) + 0.62, 0.0, 1.0);
  float l = clamp(uPose * 1.5 - 0.5 * rang, 0.0, 1.0);
  float pose = 1.0 - pow(1.0 - l, 3.0);
  float air = 1.0 - pose;
  // les plis dépassent un peu leur forme, puis se détendent
  float x = l - 1.0;
  float plisForce = 1.0 + 2.4 * x * x * x + 1.4 * x * x;

  // relief : la pente de la lumière des plis fait glisser la matière pendant qu'ils se forment
  float e = 10.0;
  float gx = clair(texture(uPlis, versPlis(p + vec2(e, 0.0))).rgb) - clair(texture(uPlis, versPlis(p - vec2(e, 0.0))).rgb);
  float gy = clair(texture(uPlis, versPlis(p + vec2(0.0, e))).rgb) - clair(texture(uPlis, versPlis(p - vec2(0.0, e))).rgb);
  vec2 pente = vec2(gx, gy) / (2.0 * e);
  float frisson = sin(l * 9.4) * exp(-4.0 * l) * step(0.001, l);
  p += pente * (air * 3000.0 + frisson * 1400.0);

  float flou = 4.2 * pow(1.0 - uPose, 1.6);
  vec3 plis = texture(uPlis, versPlis(p)).rgb;
  vec2 uv = p / uTaille;

  // ── La serviette : l'image, prolongée au-dessus et en dessous par de l'éponge ──
  vec3 nue = texture(uNue, vec2((p.x + uMarges.z) / (uTaille.x + 2.0 * uMarges.z), uv.y), flou).rgb;
  float grain = (texture(uEponge, p / 512.0, flou).r * 255.0 - 128.0) / 320.0;
  vec3 suite = plis * (1.0 + grain);
  float bord = min(p.y, uTaille.y - p.y);
  float dansImage = smoothstep(-1.0, 9.0, bord);
  vec3 c = mix(suite, nue, dansImage);

  // ── La couture : la carte dit à quel instant chaque point de broderie est posé ──
  if (uFil > 0.0) {
    ivec2 limite = ivec2(uTaille) - 1;
    float net = uDouceur / uDuree;
    float cousu = 0.0, frais = 0.0, alea = 0.0, deplace = 0.0, grossi = 1.0, lueur = 0.0;
    vec2 ou = vec2(0.0);
    // une pièce déplacée épouse les plis où elle se pose
    vec2 ondule = p + pente * 650.0;
    for (int n = 0; n < uPieces; n++) {
      float bouge = uInfo[n].y;
      vec2 r = (bouge > 0.5 ? ondule : p) - uAncre[n].zw;
      vec2 q = uAncre[n].xy + vec2(dot(uMat[n].xy, r), dot(uMat[n].zw, r));
      if (q.x < uBoite[n].x || q.y < uBoite[n].y || q.x > uBoite[n].z || q.y > uBoite[n].w) continue;
      vec2 t = q - 0.5;
      vec2 f = fract(t);
      ivec2 i = ivec2(floor(t));
      float c1 = 0.0, f1 = 0.0, a1 = 0.0, l1 = 0.0;
      for (int k = 0; k < 4; k++) {
        ivec2 o = ivec2(k & 1, k >> 1);
        ivec2 xy = clamp(i + o, ivec2(0), limite);
        float groupe = texelFetch(uPoints, xy, 0).b * 255.0 / 20.0;
        if (abs(groupe - uInfo[n].x) > 0.5) continue;
        vec4 m = texelFetch(uCarte, xy, 0);
        float instant = (m.r * 255.0 * 256.0 + m.g * 255.0) / 65535.0;
        float poids = (o.x == 1 ? f.x : 1.0 - f.x) * (o.y == 1 ? f.y : 1.0 - f.y);
        // en place, le fil garde l'ombre large de la photo ; déplacé, seulement son ombre proche
        float emprise = mix(m.b, smoothstep(0.3, 0.92, m.b), bouge);
        float pose_ = smoothstep(instant, instant + net, uFil) * emprise;
        c1 += poids * pose_;
        // le fil reste un instant plus clair après le passage de la lanière
        f1 += poids * pose_ * exp(-max(0.0, uFil - instant - net) * uDuree / 0.9);
        // la lueur de la lanière : elle précède à peine le fil, puis s'éteint
        float passe = (uFil - instant) * uDuree;
        l1 += poids * m.b * exp(-passe * passe / (passe < 0.0 ? 0.012 : 0.09)) * step(0.0005, instant);
        a1 += poids * fract(sin(float(xy.x) * 12.9898 + float(xy.y) * 78.233) * 43758.5);
      }
      // fondu sur les bords de la boîte : une pièce coupée court ne laisse pas d'arête
      vec2 dBord = min(q - uBoite[n].xy, uBoite[n].zw - q);
      float doux = smoothstep(0.0, 4.0, min(dBord.x, dBord.y));
      c1 *= doux; f1 *= doux;
      lueur = max(lueur, l1 * doux);
      if (c1 > cousu) {
        cousu = c1; frais = f1; alea = a1 - 0.5; ou = q; deplace = bouge;
        grossi = length(uMat[n].xy);
      }
    }
    if (cousu > 0.0) {
      vec2 uq = ou / uTaille;
      // netteté choisie d'après la taille réelle de la pièce à l'écran
      vec3 brodee = textureLod(uBrodee, uq, max(0.0, log2(grain_ecran * grossi))).rgb;
      float fil = smoothstep(0.07, 0.19, brodee.r - brodee.b) * cousu;
      // la pièce déplacée prend la lumière des plis où elle se pose
      brodee *= mix(vec3(1.0), plis / max(texture(uPlis, versPlis(ou)).rgb, vec3(0.05)), deplace);
      c = mix(c, brodee, cousu);

      // Les points de broderie : de petites barres de fil bombées, un creux entre deux.
      float bombe = texture(uPoints, uq).r * 2.0 - 1.0;   // +1 au milieu du point, −1 dans le creux
      c *= 1.0 + fil * (bombe * 0.11 + alea * 0.06);
      // le fil qui vient d'apparaître est un peu plus clair, puis prend sa teinte
      c += vec3(0.10, 0.07, 0.045) * fil * frais;

      // survol d'une catégorie : son fil fonce légèrement
      vec2 r = p - uSurvol.xy;
      r = vec2(uSurvolAngle.x * r.x + uSurvolAngle.y * r.y, -uSurvolAngle.y * r.x + uSurvolAngle.x * r.y);
      float dedans = step(abs(r.x), uSurvol.z) * step(abs(r.y), uSurvol.w);
      c = mix(c, c * vec3(0.78, 0.72, 0.68), fil * dedans * uSurvolForce);
    }
    // La lanière elle-même : une lumière douce qui effleure l'éponge là où elle passe.
    c += vec3(0.062, 0.051, 0.041) * lueur;
  }

  // ── Lumière : lisse et claire en l'air, les plis se creusent en se posant ──
  vec3 rapport = uMoyenne / max(plis, vec3(0.02));
  c *= pow(rapport, vec3(0.92 * (1.0 - plisForce)));
  float loin = pow(1.0 - uPose, 1.4);
  c = mix(c, uMoyenne * 1.07, 0.5 * loin);

  couleur = vec4(c, 1.0);
}`;

const borner = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const melanger = (a, b, k) => a + (b - a) * k;
const adoucir = (x) => x * x * (3 - 2 * x);

// Courbe des mouvements de caméra : une entrée et une sortie douces (easeInOutSine,
// cubic-bezier(0.37, 0, 0.63, 1)). Tout l'écran bouge : la courbe des déplacements de
// l'interface (--ease-in-out) y donnerait un à-coup.
function courbe(x1, y1, x2, y2) {
  const bez = (a, b, s) => 3 * a * s * (1 - s) * (1 - s) + 3 * b * s * s * (1 - s) + s * s * s;
  return (x) => {
    if (x <= 0 || x >= 1) return borner(x);
    let a = 0, b = 1, s = x;
    for (let i = 0; i < 18; i++) {
      s = (a + b) / 2;
      if (bez(x1, x2, s) < x) a = s;
      else b = s;
    }
    return bez(y1, y2, s);
  };
}
const glisser = courbe(0.37, 0, 0.63, 1);

const reunir = (boites) => [
  Math.min(...boites.map((b) => b[0])), Math.min(...boites.map((b) => b[1])),
  Math.max(...boites.map((b) => b[2])), Math.max(...boites.map((b) => b[3])),
];

function charger(nom) {
  const img = new Image();
  img.decoding = "async";
  img.src = IMAGES + nom;
  return img.decode().then(() => img);
}

export function serviette() {
  const section = document.querySelector(".serviette");
  const toile = section?.querySelector(".serviette__toile");
  if (!section || !toile) return;

  const gl = toile.getContext("webgl2", { alpha: false, antialias: false, powerPreference: "high-performance" });
  if (!gl) {
    section.dataset.etat = "image";
    return;
  }
  let actif = false;
  const repli = () => {
    section.dataset.etat = "image";
    actif = false;
  };

  const calme = matchMedia("(prefers-reduced-motion: reduce)");
  const navigation = performance.getEntriesByType?.("navigation")[0]?.type;
  const parametres = new URLSearchParams(location.search);
  const arret = parametres.has("instant") ? Number(parametres.get("instant")) : null;
  const liens = [...section.querySelectorAll("[data-groupe]")];
  const groupes = new Map(D.groupes.map((g, i) => [g.nom, { ...g, rang: i + 1 }]));
  const debut = (nom) => groupes.get(nom).debut;
  const fin = (nom) => groupes.get(nom).debut + groupes.get(nom).duree;

  // ── Programme ──
  const compiler = (type, source) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, source);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  let programme;
  try {
    programme = gl.createProgram();
    gl.attachShader(programme, compiler(gl.VERTEX_SHADER, VERTEX));
    gl.attachShader(programme, compiler(gl.FRAGMENT_SHADER, FRAGMENT));
    gl.linkProgram(programme);
    if (!gl.getProgramParameter(programme, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(programme));
  } catch (erreur) {
    console.warn("Serviette : rendu indisponible.", erreur);
    repli();
    return;
  }
  gl.useProgram(programme);
  const u = new Proxy({}, { get: (cache, nom) => (cache[nom] ??= gl.getUniformLocation(programme, nom)) });
  const coins = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, coins);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const aCoin = gl.getAttribLocation(programme, "aCoin");
  gl.enableVertexAttribArray(aCoin);
  gl.vertexAttribPointer(aCoin, 2, gl.FLOAT, false, 0, 0);

  const texture = (unite, nom, image, { lisse = true, mip = false, repete = gl.CLAMP_TO_EDGE, repeteY = repete } = {}) => {
    gl.activeTexture(gl.TEXTURE0 + unite);
    gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    if (mip) gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mip ? gl.LINEAR_MIPMAP_LINEAR : lisse ? gl.LINEAR : gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, lisse ? gl.LINEAR : gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, repete);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, repeteY);
    gl.uniform1i(u[nom], unite);
  };

  // ── Disposition et cadrage ──
  // Une pièce : un mot ou une ligne brodée, lue dans l'image (source) et posée sur la serviette.
  //   { g, source: [x0, y0, x1, y1], ancre: [x, y] (dans l'image), pose: [x, y], echelle, angle }
  // Un point (x, y) de l'image se pose en : pose + echelle · R(angle) · ((x, y) − ancre).
  let ecran = { l: 1, h: 1 };
  let ensemble = { cx: 0, cy: 0, largeur: 1 };
  let pieces = [];
  let plans = [];
  let passages = [];
  let cadres = new Map(); // où se trouve chaque groupe sur la serviette : { cx, cy, l, h, angle, boite }

  const poser = (pc, x, y) => {
    const c = Math.cos(pc.angle), s = Math.sin(pc.angle);
    const dx = x - pc.ancre[0], dy = y - pc.ancre[1];
    return [pc.pose[0] + pc.echelle * (c * dx - s * dy), pc.pose[1] + pc.echelle * (s * dx + c * dy)];
  };
  const emprise = (pc) => {
    const [x0, y0, x1, y1] = pc.source;
    const coins = [poser(pc, x0, y0), poser(pc, x1, y0), poser(pc, x0, y1), poser(pc, x1, y1)];
    return reunir(coins.map(([x, y]) => [x, y, x, y]));
  };

  function cadrer() {
    const boite = section.getBoundingClientRect();
    ecran = { l: Math.max(1, boite.width), h: Math.max(1, boite.height) };
    const format = ecran.l / ecran.h;
    const haut = ecran.h / ecran.l;
    const empile = format < 0.8;
    let echelle;

    if (!empile) {
      // Écran large : la broderie reste telle que sur la photographie. Toute la broderie tient à
      // l'écran, la bande tissée vers le bas ; si l'écran déborde de l'image, la serviette se prolonge.
      pieces = [...groupes.values()].map((g) => ({ g, source: g.boite, ancre: [g.boite[0], g.boite[1]], pose: [g.boite[0], g.boite[1]], echelle: 1, angle: 0 }));
      const [bx0, by0, bx1, by1] = D.broderie;
      const margeX = Math.max(30, (bx1 - bx0) * (format > 1 ? 0.055 : 0.022));
      const margeHaut = Math.max(40, (by1 - by0) * 0.065);
      const couvrir = Math.max(ecran.l / D.largeur, ecran.h / D.hauteur);
      const tenir = (bas) => Math.min(couvrir, ecran.l / (bx1 - bx0 + 2 * margeX), ecran.h / (by1 - by0 + margeHaut + bas));
      // sous la broderie, la place de l'invitation à descendre (en pixels d'écran)
      echelle = tenir(margeHaut);
      const margeBas = Math.max(margeHaut, 78 / echelle);
      echelle = tenir(margeBas);
      const demiX = ecran.l / echelle / 2, demiY = ecran.h / echelle / 2;
      let cx = 2 * demiX <= D.largeur ? borner((bx0 + bx1) / 2, demiX, D.largeur - demiX) : D.largeur / 2;
      cx = borner(cx, bx1 + margeX - demiX, bx0 - margeX + demiX);
      let cy = by1 + margeBas - demiY;
      if (2 * demiY <= D.hauteur) cy = borner(cy, demiY, D.hauteur - demiY);
      ensemble = { cx, cy, largeur: 2 * demiX };
    } else {
      // Téléphone : le logo reste dans la bande, en bas de l'écran. Au-dessus, la devise et les
      // catégories s'empilent sur toute la hauteur, agrandies jusqu'à occuper la largeur.
      const logo = reunir([groupes.get("peachy").boite, groupes.get("lymphatic").boite]);
      const largeur = (logo[2] - logo[0]) / 0.8;
      echelle = ecran.l / largeur;
      const cx = (logo[0] + logo[2]) / 2;
      const bas = logo[3] + 78 / echelle;
      const sommet = bas - largeur * haut;
      ensemble = { cx, cy: (bas + sommet) / 2, largeur };

      const gauche = cx - largeur / 2 + 0.07 * largeur, utile = 0.86 * largeur;
      const penche = 0.1; // les lignes se décalent un peu vers la droite en descendant, comme sur la photo
      const mots = (nom, a, b) => reunir(groupes.get(nom).mots.slice(a, b));
      // une ligne coupée en deux ne doit pas emporter le bord du mot voisin : marge d'un demi-espace
      const coupe = (nom, i) => (groupes.get(nom).mots[i][0] - groupes.get(nom).mots[i - 1][2]) / 2;
      const lignes = [
        { nom: "devise-1", source: groupes.get("devise-1").boite, famille: "devise" },
        { nom: "devise-2", source: groupes.get("devise-2").boite, famille: "devise" },
        { nom: "maison", source: groupes.get("maison").boite },
        { nom: "rituels", source: groupes.get("rituels").boite },
        { nom: "drainage", source: mots("drainage", 0, 2), marges: [22, 22, coupe("drainage", 2), 22] },
        { nom: "drainage", source: mots("drainage", 2, 3), marges: [coupe("drainage", 2), 22, 22, 22] },
        { nom: "philosophie", source: groupes.get("philosophie").boite },
        { nom: "univers", source: groupes.get("univers").boite },
      ];
      const large = (famille) => Math.max(...lignes.filter((l) => l.famille === famille).map((l) => l.source[2] - l.source[0]));
      const hauteurLettre = (famille) => groupes.get(famille === "devise" ? "devise-1" : "philosophie").cadre.h;
      // la pente des lignes : celle de la bande
      const pente = -D.lisere[1];
      const composer = (reduit) => {
        const course = penche * 1300 * reduit; // décalage cumulé du bas de la pile, à réserver en largeur
        const eDevise = Math.min(1.75, (utile - 0.25 * course) / large("devise")) * reduit;
        const eListe = Math.min(2.1, (utile - course) / large(undefined)) * reduit;
        const pasDevise = 2.05 * hauteurLettre("devise") * eDevise;
        const pasListe = 2.3 * hauteurLettre() * eListe;
        // hauteur de la pile, du haut de la première ligne au pied de la dernière, interlignes à 1
        const tete = (lignes[0].source[3] - lignes[0].source[1]) * eDevise;
        return { eDevise, eListe, pasDevise, pasListe, tete, corps: pasDevise + 1.7 * pasListe + 5 * pasListe };
      };
      // la dernière ligne s'arrête au-dessus du liseré de la bande ; la première sous le haut de l'écran
      const pied = D.lisere[0] + D.lisere[1] * (gauche + 100) - 150;
      const tetiere = sommet + 92 / echelle;
      let m = composer(1);
      let aere = (pied - tetiere - m.tete) / m.corps;
      if (aere < 0.9) {
        m = composer(Math.max(0.6, aere / 0.9));
        aere = (pied - tetiere - m.tete) / m.corps;
      }
      aere = borner(aere, 0.85, 1.5);
      // si la pile est plus étroite que la place disponible, elle se centre sous le regard
      const occupe = Math.max(large("devise") * m.eDevise, large(undefined) * m.eListe + penche * m.corps * aere);
      const retrait = Math.max(0, (utile - occupe) / 2);
      // la pile se cale sur la bande ; ce qui reste d'espace va au-dessus
      const pas = [0, m.pasDevise, m.pasDevise + 1.7 * m.pasListe, 0, 0, 0, 0, 0];
      for (let i = 3; i < 8; i++) pas[i] = pas[i - 1] + m.pasListe;
      const y0 = pied - pas[7] * aere;
      pieces = lignes.map((l, i) => {
        const e = l.famille === "devise" ? m.eDevise : m.eListe;
        const y = y0 + pas[i] * aere;
        // ancre : le pied gauche de la ligne
        return { g: groupes.get(l.nom), source: l.source, marges: l.marges, ancre: [l.source[0], l.source[3]], pose: [gauche + retrait + penche * (y - y0), y], echelle: e, angle: 0 };
      });
      // le trait : couché entre la devise et les catégories, parallèle aux lignes
      const t = groupes.get("trait");
      const [tx0, ty0, tx1, ty1] = t.boite;
      const direction = Math.atan2(ty1 - ty0, tx1 - tx0); // le trait descend de gauche à droite dans l'image
      const eTrait = Math.min(1.6, (0.62 * Math.min(utile, occupe)) / Math.hypot(tx1 - tx0, ty1 - ty0));
      const yTrait = y0 + (pas[1] + 0.62 * (pas[2] - pas[1])) * aere;
      pieces.splice(2, 0, {
        g: t, source: t.boite, ancre: [tx0, ty0],
        pose: [gauche + retrait + penche * (yTrait - y0) + 4, yTrait - hauteurLettre() * m.eListe * 0.45],
        echelle: eTrait, angle: Math.atan(-pente) - direction,
      });
      // le logo ne bouge pas
      for (const nom of ["peachy", "lymphatic"]) {
        const g = groupes.get(nom);
        pieces.push({ g, source: g.boite, ancre: [g.boite[0], g.boite[1]], pose: [g.boite[0], g.boite[1]], echelle: 1, angle: 0 });
      }
    }

    // Où se trouve chaque groupe sur la serviette (liens, survol, plans de caméra).
    cadres = new Map();
    for (const g of groupes.values()) {
      const miennes = pieces.filter((pc) => pc.g === g);
      const boiteG = reunir(miennes.map(emprise));
      const seule = miennes.length === 1 ? miennes[0] : null;
      const [cx, cy] = seule ? poser(seule, g.cadre.cx, g.cadre.cy) : [(boiteG[0] + boiteG[2]) / 2, (boiteG[1] + boiteG[3]) / 2];
      cadres.set(g.nom, {
        boite: boiteG, cx, cy,
        l: seule ? g.cadre.l * seule.echelle : boiteG[2] - boiteG[0],
        h: seule ? g.cadre.h * seule.echelle : boiteG[3] - boiteG[1],
        angle: seule ? g.cadre.angle + (seule.angle * 180) / Math.PI : 0,
      });
    }

    // ── Les plans de caméra ──
    // Jusqu'où s'approcher : assez pour lire le fil, sans trop agrandir l'image.
    const zoomMax = empile ? 1.32 : borner(1.55 / echelle, 1.3, 2.7);
    const largeurMin = ensemble.largeur / zoomMax;
    const plan = (noms, remplissage, derive, lignesDe) => {
      const b = reunir(lignesDe ?? noms.map((n) => cadres.get(n).boite));
      const lb = b[2] - b[0], hb = b[3] - b[1];
      const largeur = Math.min(ensemble.largeur, Math.max(largeurMin, lb / remplissage, hb / 0.6 / haut));
      // Chaque plan dérive lentement dans le sens de son ouvrage : la caméra ne s'arrête jamais net.
      // Si l'ouvrage est plus large que le cadre, elle le parcourt de gauche à droite.
      const course = Math.max(derive[0] * largeur, (lb - 0.86 * largeur) / 2);
      return { cx: (b[0] + b[2]) / 2, cy: (b[1] + b[3]) / 2, largeur, dx: course, dy: derive[1] * largeur * haut };
    };
    const categories = ["maison", "rituels", "drainage", "philosophie", "univers"];
    const large = { ...ensemble, dx: 0, dy: 0 };
    if (!empile) {
      plans = [
        large,
        plan(["devise-1", "devise-2"], 0.8, [0.03, 0]),
        plan(["trait", ...categories], 0.88, [0.012, 0.045]),
        plan(["peachy"], 0.8, [0.035, -0.01]),
        plan(["peachy", "lymphatic"], 0.74, [0.01, 0.02]),
        large,
      ];
      // Les passages d'un plan au suivant, en secondes de couture : [départ, arrivée].
      // La caméra part avant que l'ouvrage en cours soit fini et arrive quand le suivant commence.
      passages = [
        [-SILENCE - 0.05, 1.25],
        [debut("trait") - 0.45, debut("maison") + 0.75],
        [fin("univers") - 0.9, debut("peachy") + 0.5],
        [debut("lymphatic") - 0.35, debut("lymphatic") + 0.85],
        [D.duree + 0.1, D.duree + 0.1 + RECUL],
      ];
    } else {
      // Pile verticale : la caméra descend avec la couture, de la devise à la bande.
      const lignesListe = pieces.filter((pc) => categories.includes(pc.g.nom)).map(emprise);
      plans = [
        large,
        plan(["devise-1", "devise-2"], 1.3, [0.02, 0]),
        plan(null, 0.95, [0, 0.02], [cadres.get("trait").boite, ...lignesListe.slice(0, 3)]),
        plan(null, 0.95, [0, 0.03], lignesListe.slice(3)),
        plan(["peachy", "lymphatic"], 0.89, [0.01, 0]),
        large,
      ];
      passages = [
        [-SILENCE - 0.05, 1.2],
        [debut("trait") - 0.45, debut("maison") + 0.7],
        [debut("drainage") + 0.15, debut("philosophie") + 0.75],
        [fin("univers") - 0.75, debut("peachy") + 0.55],
        [D.duree + 0.1, D.duree + 0.1 + RECUL],
      ];
    }

    // Les pièces, pour le dessin.
    const boites = new Float32Array(PIECES * 4), ancres = new Float32Array(PIECES * 4);
    const mats = new Float32Array(PIECES * 4), infos = new Float32Array(PIECES * 2);
    pieces.forEach((pc, i) => {
      const c = Math.cos(pc.angle) / pc.echelle, s = Math.sin(pc.angle) / pc.echelle;
      const deplacee = pc.echelle !== 1 || pc.angle !== 0 || pc.pose[0] !== pc.ancre[0] || pc.pose[1] !== pc.ancre[1];
      const [mg, mh, md, mb] = pc.marges ?? [22, 22, 22, 22];
      boites.set([pc.source[0] - mg, pc.source[1] - mh, pc.source[2] + md, pc.source[3] + mb], i * 4);
      ancres.set([...pc.ancre, ...pc.pose], i * 4);
      mats.set([c, s, -s, c], i * 4); // inverse de echelle · R(angle)
      infos.set([pc.g.rang, deplacee ? 1 : 0], i * 2);
    });
    gl.uniform1i(u.uPieces, pieces.length);
    gl.uniform4fv(u["uBoite[0]"], boites);
    gl.uniform4fv(u["uAncre[0]"], ancres);
    gl.uniform4fv(u["uMat[0]"], mats);
    gl.uniform2fv(u["uInfo[0]"], infos);
    placerLiens();
  }

  // La vue à un instant de la couture. Fonction pure du temps : chaque image se recalcule seule.
  function camera(tau) {
    const vue = (i) => {
      // dérive du plan, du début du passage qui y mène à la fin de celui qui en repart
      const a = i ? passages[i - 1][0] : -Infinity, b = i < passages.length ? passages[i][1] : Infinity;
      const k = Number.isFinite(a) && Number.isFinite(b) ? adoucir(borner((tau - a) / (b - a))) * 2 - 1 : 0;
      const p = plans[i];
      return { cx: p.cx + p.dx * k, cy: p.cy + p.dy * k, largeur: p.largeur };
    };
    let v = vue(0);
    for (let i = 0; i < passages.length; i++) {
      const [a, b] = passages[i];
      if (tau <= a) break;
      const k = glisser((tau - a) / (b - a));
      const d = vue(i + 1);
      // sur un long trajet entre deux plans rapprochés, la caméra prend un peu de recul en chemin
      const trajet = Math.hypot(d.cx - v.cx, d.cy - v.cy) / ((v.largeur + d.largeur) / 2);
      const entreDeux = i > 0 && i < passages.length - 1 ? 1 : 0;
      const recul = 1 + 0.16 * Math.sin(Math.PI * k) * borner(trajet * 1.4 - 0.3) * entreDeux;
      v = {
        cx: melanger(v.cx, d.cx, k),
        cy: melanger(v.cy, d.cy, k),
        largeur: Math.exp(melanger(Math.log(v.largeur), Math.log(d.largeur), k)) * recul,
      };
    }
    return v;
  }

  // Les catégories brodées sont des liens : chacun est posé sur son mot, incliné comme lui.
  function placerLiens() {
    const echelle = ecran.l / ensemble.largeur;
    for (const a of liens) {
      const cadre = cadres.get(a.dataset.groupe);
      const l = cadre.l * echelle + 14, h = Math.max(cadre.h * echelle + 12, 20);
      const x = ecran.l / 2 + (cadre.cx - ensemble.cx) * echelle;
      const y = ecran.h / 2 + (cadre.cy - ensemble.cy) * echelle;
      a.style.width = `${l.toFixed(1)}px`;
      a.style.height = `${h.toFixed(1)}px`;
      a.style.transform = `translate(${(x - l / 2).toFixed(1)}px, ${(y - h / 2).toFixed(1)}px) rotate(${cadre.angle.toFixed(2)}deg)`;
    }
  }

  // ── Temps ──
  // t : secondes depuis le début de la pose. La broderie commence à apparaître après POSE + SILENCE.
  const total = () => POSE + SILENCE + D.duree + 0.1 + RECUL;
  let t = 0;
  let vitesse = 1;
  let pret = false;
  let dernier = 0;
  let survol = { nom: null, force: 0, cible: 0 };

  function dessiner() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const l = Math.round(ecran.l * dpr), h = Math.round(ecran.h * dpr);
    if (toile.width !== l || toile.height !== h) {
      toile.width = l;
      toile.height = h;
    }
    gl.viewport(0, 0, l, h);
    const pose = borner(t / POSE);
    const tau = t - POSE - SILENCE;
    const vue = t >= total() ? ensemble : camera(tau);
    // en l'air, la serviette est plus près de nous, légèrement tournée
    const chute = Math.pow(1 - pose, 2.2);
    const demiX = (vue.largeur / 2) / (1 + 0.16 * chute);
    gl.uniform2f(u.uCentre, vue.cx - 18 * chute, vue.cy + 26 * chute);
    gl.uniform2f(u.uDemi, demiX, demiX * (ecran.h / ecran.l));
    gl.uniform1f(u.uAngle, -0.035 * chute);
    gl.uniform1f(u.uPose, pose);
    gl.uniform1f(u.uFil, borner(tau / D.duree));
    if (survol.nom) {
      const cadre = cadres.get(survol.nom);
      const a = (cadre.angle * Math.PI) / 180;
      gl.uniform4f(u.uSurvol, cadre.cx, cadre.cy, cadre.l / 2 + 12, cadre.h / 2 + 10);
      gl.uniform2f(u.uSurvolAngle, Math.cos(a), Math.sin(a));
    }
    gl.uniform1f(u.uSurvolForce, survol.force);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  // L'état de la section ne s'écrit dans la page que lorsqu'il change.
  let affiche = null;
  function etat() {
    const nouvel = t >= total() ? "cousu" : t > POSE + SILENCE ? "couture" : "pose";
    if (nouvel === affiche) return;
    affiche = nouvel;
    section.dataset.etat = nouvel;
    // les liens sont posés sur le plan d'ensemble : ils ne s'activent qu'une fois la caméra revenue
    for (const a of liens) a.toggleAttribute("data-cousu", nouvel === "cousu");
  }

  function image(maintenant) {
    if (!actif) return;
    const dt = Math.min(0.1, (maintenant - dernier) / 1000);
    dernier = maintenant;
    if (t < total()) t = Math.min(total(), t + dt * vitesse);
    survol.force += (survol.cible - survol.force) * Math.min(1, dt * 14);
    if (Math.abs(survol.cible - survol.force) < 0.004) survol.force = survol.cible;
    dessiner();
    etat();
    if (t < total() || survol.force !== survol.cible) requestAnimationFrame(image);
    else actif = false;
  }

  function lancer() {
    if (actif || !pret) return;
    actif = true;
    dernier = performance.now();
    requestAnimationFrame(image);
  }

  const terminer = () => {
    t = total();
    if (pret) {
      dessiner();
      etat();
    }
  };

  // ── Chargement ──
  Promise.all(["serviette-nue.webp", "serviette-brodee.webp", "couture.png", "points.png", "plis.webp", "eponge.png"].map(charger))
    .then(([nue, brodee, carte, points, plis, eponge]) => {
      texture(0, "uNue", nue, { mip: true, repete: gl.MIRRORED_REPEAT, repeteY: gl.CLAMP_TO_EDGE });
      texture(1, "uBrodee", brodee, { mip: true });
      texture(2, "uCarte", carte, { lisse: false });
      texture(3, "uPlis", plis, { repete: gl.MIRRORED_REPEAT, repeteY: gl.CLAMP_TO_EDGE });
      texture(4, "uEponge", eponge, { mip: true, repete: gl.REPEAT });
      texture(5, "uPoints", points);
      gl.uniform2f(u.uTaille, D.largeur, D.hauteur);
      gl.uniform3f(u.uMarges, D.margeHaut, D.margeBas, D.margeCote);
      gl.uniform3f(u.uMoyenne, ...D.moyenne);
      gl.uniform1f(u.uDuree, D.duree);
      gl.uniform1f(u.uDouceur, D.douceur);
      gl.uniform4f(u.uSurvol, 0, 0, 0, 0);
      gl.uniform2f(u.uSurvolAngle, 1, 0);
      pret = true;
      cadrer();

      if (arret !== null) {
        // ?instant=6.5 : fige l'animation à cet instant (contrôle et captures)
        const aller = (instant) => {
          t = borner(instant, 0, total());
          dessiner();
          etat();
        };
        aller(arret);
        window.serviette = { aller, total, vue: (instant) => camera(instant - POSE - SILENCE) };
      } else if (calme.matches || navigation === "back_forward" || scrollY > innerHeight * 0.5) {
        // mouvement réduit, retour arrière, arrivée plus bas dans la page : la serviette est déjà brodée
        terminer();
      } else {
        dessiner();
        lancer();
      }
      section.setAttribute("data-prete", "");
    })
    .catch((erreur) => {
      console.warn("Serviette : images indisponibles.", erreur);
      repli();
    });

  // ── Interactions ──
  // Rien ne retient la personne : dès qu'elle défile, la couture se hâte.
  const hater = () => {
    if (t < total()) vitesse = HATE;
  };
  addEventListener("wheel", hater, { passive: true });
  addEventListener("touchmove", hater, { passive: true });
  addEventListener("keydown", (e) => {
    if (["ArrowDown", "PageDown", " ", "End", "Tab"].includes(e.key)) hater();
  });
  section.addEventListener("focusin", terminer);

  // Hors champ, la couture se termine : on ne dessine jamais ce qui ne se voit pas.
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([e]) => {
      if (!e.isIntersecting && pret && arret === null) terminer();
    }).observe(section);
  }

  const redessiner = () => {
    if (!pret) return;
    cadrer();
    if (!actif) dessiner();
  };
  if ("ResizeObserver" in window) new ResizeObserver(redessiner).observe(section);
  else addEventListener("resize", redessiner);

  for (const a of liens) {
    const viser = (oui) => {
      if (oui) survol.nom = a.dataset.groupe;
      survol.cible = oui ? 1 : 0;
      lancer();
    };
    a.addEventListener("pointerenter", (e) => e.pointerType === "mouse" && viser(true));
    a.addEventListener("pointerleave", () => viser(false));
    a.addEventListener("focus", () => viser(true));
    a.addEventListener("blur", () => viser(false));
  }

  toile.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    repli();
  });
}
