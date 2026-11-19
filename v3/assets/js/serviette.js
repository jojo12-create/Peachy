/**
 * Peachy — la serviette brodée (couverture de la page).
 *
 * 1. La serviette se dépose : elle arrive floue et lisse, ses plis se forment, puis tout s'arrête.
 * 2. La broderie se coud sous nos yeux, lettre après lettre, trait compris.
 *
 * Le fil affiché est celui de la photographie : il suit donc les plis et la perspective
 * de la serviette. Seul son ordre d'apparition est calculé (tools/serviette.py).
 * Sans WebGL 2 ou sans script, l'image brodée s'affiche telle quelle.
 */
import { serviette as D } from "./serviette-donnees.js";

const IMAGES = "assets/img/serviette/";
const POSE = 2.7; // secondes : la serviette se dépose
const SILENCE = 0.45; // la serviette est immobile, rien n'est encore cousu
const RECUL = 1.7; // petits écrans : retour au plan d'ensemble après la couture
const HATE = 7; // vitesse de la suite quand la personne commence à défiler

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

uniform sampler2D uBrodee, uNue, uCarte, uPlis, uEponge;
uniform vec2 uTaille;        // image, en pixels
uniform vec3 uMarges;        // prolongement haut, bas, côtés
uniform vec3 uMoyenne;       // teinte moyenne de la serviette
uniform float uPose;         // 0 → 1 : la serviette se dépose
uniform float uFil;          // 0 → 1 : avancée de la couture
uniform float uDuree;        // durée de la couture, en secondes
uniform vec4 uSurvol;        // centre et demi-côtés du groupe survolé
uniform vec2 uSurvolAngle;   // cos, sin de son inclinaison
uniform float uSurvolForce;

vec2 versPlis(vec2 p) {
  return vec2((p.x + uMarges.z) / (uTaille.x + 2.0 * uMarges.z), (p.y + uMarges.x) / (uTaille.y + uMarges.x + uMarges.y));
}
float clair(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

void main() {
  vec2 p = vP;

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
  float dedansX = step(0.0, uv.x) * step(uv.x, 1.0);

  // ── La serviette : l'image, prolongée au-dessus et en dessous par de l'éponge ──
  vec3 nue = texture(uNue, vec2((p.x + uMarges.z) / (uTaille.x + 2.0 * uMarges.z), uv.y), flou).rgb;
  float grain = (texture(uEponge, p / 512.0, flou).r * 255.0 - 128.0) / 320.0;
  vec3 suite = plis * (1.0 + grain);
  float bord = min(p.y, uTaille.y - p.y);
  float dansImage = smoothstep(-1.0, 9.0, bord);
  vec3 c = mix(suite, nue, dansImage);

  // ── La couture : chaque point de la carte dit à quel instant le fil y arrive ──
  if (uFil > 0.0 && dedansX > 0.5 && bord > 0.0) {
    vec2 t = p - 0.5;
    vec2 f = fract(t);
    ivec2 i = ivec2(floor(t));
    ivec2 limite = ivec2(uTaille) - 1;
    float cousu = 0.0, frais = 0.0;
    float net = 0.05 / uDuree;
    for (int k = 0; k < 4; k++) {
      ivec2 o = ivec2(k & 1, k >> 1);
      vec4 m = texelFetch(uCarte, clamp(i + o, ivec2(0), limite), 0);
      float instant = (m.r * 255.0 * 256.0 + m.g * 255.0) / 65535.0;
      float poids = (o.x == 1 ? f.x : 1.0 - f.x) * (o.y == 1 ? f.y : 1.0 - f.y);
      float pose_ = smoothstep(instant, instant + net, uFil) * m.b;
      cousu += poids * pose_;
      frais += poids * pose_ * exp(-(uFil - instant) * uDuree / 0.55);
    }
    vec3 brodee = texture(uBrodee, uv).rgb;
    float fil = clamp((clair(nue) - clair(brodee)) * 5.0, 0.0, 1.0);
    c = mix(c, brodee, cousu);
    // le fil fraîchement posé accroche la lumière un instant
    c += vec3(0.16, 0.11, 0.07) * fil * frais;
    // survol d'une catégorie : son fil fonce légèrement
    vec2 r = p - uSurvol.xy;
    r = vec2(uSurvolAngle.x * r.x + uSurvolAngle.y * r.y, -uSurvolAngle.y * r.x + uSurvolAngle.x * r.y);
    float dedans = step(abs(r.x), uSurvol.z) * step(abs(r.y), uSurvol.w);
    c = mix(c, c * vec3(0.78, 0.72, 0.68), smoothstep(0.35, 0.9, fil) * cousu * dedans * uSurvolForce);
  }

  // ── Lumière : lisse et claire en l'air, les plis se creusent en se posant ──
  vec3 rapport = uMoyenne / max(plis, vec3(0.02));
  c *= pow(rapport, vec3(0.92 * (1.0 - plisForce)));
  float loin = pow(1.0 - uPose, 1.4);
  c = mix(c, uMoyenne * 1.07, 0.5 * loin);

  couleur = vec4(c, 1.0);
}`;

const adoucir = (x) => x * x * (3 - 2 * x);
const borner = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const melanger = (a, b, k) => a + (b - a) * k;

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
  const repli = () => {
    section.dataset.etat = "image";
    actif = false;
  };

  const calme = matchMedia("(prefers-reduced-motion: reduce)");
  const navigation = performance.getEntriesByType?.("navigation")[0]?.type;
  const parametres = new URLSearchParams(location.search);
  const arret = parametres.has("instant") ? Number(parametres.get("instant")) : null;
  const liens = [...section.querySelectorAll("[data-groupe]")];
  const groupes = new Map(D.groupes.map((g) => [g.nom, g]));

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

  // ── Cadrage ──
  // Plan d'ensemble : toute la broderie tient à l'écran, sans jamais être coupée.
  // Si l'écran est plus haut ou plus large que l'image, la serviette se prolonge.
  const [bx0, by0, bx1, by1] = D.broderie;
  let ecran = { l: 1, h: 1 };
  let ensemble = { cx: 0, cy: 0, largeur: 1 };
  let suivi = null; // petits écrans : la caméra suit la couture de près
  const reunir = (noms, marge) => {
    const b = noms.map((n) => groupes.get(n).boite);
    const x0 = Math.min(...b.map((v) => v[0])), y0 = Math.min(...b.map((v) => v[1]));
    const x1 = Math.max(...b.map((v) => v[2])), y1 = Math.max(...b.map((v) => v[3]));
    return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, largeur: (x1 - x0) / marge };
  };
  const fin = (nom) => groupes.get(nom).debut + groupes.get(nom).duree;

  function cadrer() {
    const boite = section.getBoundingClientRect();
    ecran = { l: Math.max(1, boite.width), h: Math.max(1, boite.height) };
    const format = ecran.l / ecran.h;
    const margeX = Math.max(34, (bx1 - bx0) * (format > 1 ? 0.055 : 0.03));
    const margeY = Math.max(40, (by1 - by0) * 0.065);
    const sx0 = bx0 - margeX, sx1 = bx1 + margeX, sy0 = by0 - margeY, sy1 = by1 + margeY;
    // au plus près : l'image couvre l'écran ; au plus loin : la broderie et ses marges tiennent
    const couvrir = Math.max(ecran.l / D.largeur, ecran.h / D.hauteur);
    const contenir = Math.min(ecran.l / (sx1 - sx0), ecran.h / (sy1 - sy0));
    const echelle = Math.min(couvrir, contenir);
    const demiX = ecran.l / echelle / 2, demiY = ecran.h / echelle / 2;
    const tenir = (centre, demi, a, b, taille) => {
      // rester dans l'image tant que c'est possible ; sinon répartir le débord des deux côtés
      const c = 2 * demi <= taille ? borner(centre, demi, taille - demi) : taille / 2;
      return borner(c, b - demi, a + demi); // sans jamais couper la broderie
    };
    ensemble = {
      cx: tenir((sx0 + sx1) / 2, demiX, sx0, sx1, D.largeur),
      cy: tenir((sy0 + sy1) / 2, demiY, sy0, sy1, D.hauteur),
      largeur: 2 * demiX,
    };
    // Sur un petit écran, les lettres seraient minuscules : la caméra reste près du fil
    // pendant la couture, puis recule pour montrer la serviette entière.
    const petit = echelle < 0.46 && !calme.matches;
    suivi = petit
      ? [
          { vue: reunir(["devise-1", "devise-2"], 0.86), jusque: fin("devise-2") - 0.35 },
          { vue: reunir(["trait", "maison", "rituels", "drainage", "philosophie", "univers"], 0.9), jusque: fin("univers") - 0.4 },
          { vue: reunir(["peachy", "lymphatic"], 0.84), jusque: D.duree + 0.25 },
        ]
      : null;
    placerLiens(echelle);
  }

  function camera(tFil) {
    if (!suivi) return ensemble;
    // d'un plan au suivant en 1,3 s, puis retour au plan d'ensemble
    let vue = suivi[0].vue;
    for (let i = 0; i < suivi.length; i++) {
      const suivante = i + 1 < suivi.length ? suivi[i + 1].vue : ensemble;
      const duree = i + 1 < suivi.length ? 1.3 : RECUL;
      const k = adoucir(borner((tFil - suivi[i].jusque) / duree));
      if (k <= 0) break;
      vue = {
        cx: melanger(suivi[i].vue.cx, suivante.cx, k),
        cy: melanger(suivi[i].vue.cy, suivante.cy, k),
        largeur: Math.exp(melanger(Math.log(suivi[i].vue.largeur), Math.log(suivante.largeur), k)),
      };
    }
    return vue;
  }

  // Les catégories brodées sont des liens : chacun est posé sur son mot, incliné comme lui.
  function placerLiens() {
    const echelle = ecran.l / ensemble.largeur;
    for (const a of liens) {
      const { cadre } = groupes.get(a.dataset.groupe);
      const l = cadre.l * echelle + 14, h = Math.max(cadre.h * echelle + 12, 20);
      const x = ecran.l / 2 + (cadre.cx - ensemble.cx) * echelle;
      const y = ecran.h / 2 + (cadre.cy - ensemble.cy) * echelle;
      a.style.width = `${l.toFixed(1)}px`;
      a.style.height = `${h.toFixed(1)}px`;
      a.style.transform = `translate(${(x - l / 2).toFixed(1)}px, ${(y - h / 2).toFixed(1)}px) rotate(${cadre.angle}deg)`;
    }
  }

  // ── Temps ──
  // t : secondes depuis le début de la pose. La couture commence après POSE + SILENCE.
  const total = () => POSE + SILENCE + D.duree + (suivi ? RECUL + 0.3 : 0);
  let t = 0;
  let vitesse = 1;
  let actif = false;
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
    const tFil = t - POSE - SILENCE;
    const vue = camera(tFil);
    // en l'air, la serviette est plus près de nous, légèrement tournée
    const chute = Math.pow(1 - pose, 2.2);
    const demiX = (vue.largeur / 2) / (1 + 0.16 * chute);
    gl.uniform2f(u.uCentre, vue.cx - 18 * chute, vue.cy + 26 * chute);
    gl.uniform2f(u.uDemi, demiX, demiX * (ecran.h / ecran.l));
    gl.uniform1f(u.uAngle, -0.035 * chute);
    gl.uniform1f(u.uPose, pose);
    gl.uniform1f(u.uFil, borner(tFil / D.duree));
    if (survol.nom) {
      const { cadre } = groupes.get(survol.nom);
      const a = (cadre.angle * Math.PI) / 180;
      gl.uniform4f(u.uSurvol, cadre.cx, cadre.cy, cadre.l / 2 + 12, cadre.h / 2 + 10);
      gl.uniform2f(u.uSurvolAngle, Math.cos(a), Math.sin(a));
    }
    gl.uniform1f(u.uSurvolForce, survol.force);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  function etat() {
    const tFil = t - POSE - SILENCE;
    section.dataset.etat = t >= total() ? "cousu" : tFil > 0 ? "couture" : "pose";
    for (const a of liens) {
      const g = groupes.get(a.dataset.groupe);
      a.toggleAttribute("data-cousu", tFil >= g.debut + g.duree);
    }
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
  Promise.all(["serviette-nue.webp", "serviette-brodee.webp", "couture.png", "plis.webp", "eponge.png"].map(charger))
    .then(([nue, brodee, carte, plis, eponge]) => {
      texture(0, "uNue", nue, { mip: true, repete: gl.MIRRORED_REPEAT, repeteY: gl.CLAMP_TO_EDGE });
      texture(1, "uBrodee", brodee, { mip: true });
      texture(2, "uCarte", carte, { lisse: false });
      texture(3, "uPlis", plis, { repete: gl.MIRRORED_REPEAT, repeteY: gl.CLAMP_TO_EDGE });
      texture(4, "uEponge", eponge, { mip: true, repete: gl.REPEAT });
      gl.uniform2f(u.uTaille, D.largeur, D.hauteur);
      gl.uniform3f(u.uMarges, D.margeHaut, D.margeBas, D.margeCote);
      gl.uniform3f(u.uMoyenne, ...D.moyenne);
      gl.uniform1f(u.uDuree, D.duree);
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
        window.serviette = { aller, total };
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
