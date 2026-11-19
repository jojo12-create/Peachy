/**
 * Peachy — comportements de la page.
 * Aucun framework, aucune dépendance : observateurs natifs et événements passifs.
 * La page reste entièrement lisible et navigable sans ce script.
 */
import { site } from "./config.js";
import { serviette } from "./serviette.js";

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/* ── Configuration : réservation, coordonnées, témoignages ───────────────── */

function appliquerConfiguration() {
  const lienReservation = site.reservation?.url;
  if (lienReservation) {
    $$("[data-reservation]").forEach((a) => {
      a.href = lienReservation;
      a.target = "_blank";
      a.rel = "noopener";
    });
    $$("[data-reservation-attente]").forEach((el) => el.remove());
  }

  const c = site.coordonnees ?? {};
  const champs = {
    adresse: c.adresse && { texte: c.adresse },
    itineraire: c.itineraire && { texte: "Itinéraire", href: c.itineraire, externe: true },
    telephone: c.telephone && { texte: c.telephone, href: `tel:${c.telephone.replace(/[^+\d]/g, "")}` },
    email: c.email && { texte: c.email, href: `mailto:${c.email}` },
  };
  for (const [nom, valeur] of Object.entries(champs)) {
    const li = $(`[data-coordonnee="${nom}"]`);
    if (!li || !valeur) continue;
    const el = document.createElement(valeur.href ? "a" : "span");
    el.textContent = valeur.texte;
    if (valeur.href) el.href = valeur.href;
    if (valeur.externe) Object.assign(el, { target: "_blank", rel: "noopener" });
    li.replaceChildren(el);
    li.hidden = false;
  }

  const liste = $("[data-temoignages]");
  if (liste && site.temoignages?.length) {
    liste.replaceChildren(
      ...site.temoignages.map(({ texte, auteur, contexte }) => {
        const figure = document.createElement("figure");
        figure.className = "temoignage";
        const quote = document.createElement("blockquote");
        quote.textContent = `« ${texte} »`;
        const legende = document.createElement("figcaption");
        legende.textContent = [auteur, contexte].filter(Boolean).join(" · ");
        figure.append(quote, legende);
        return figure;
      }),
    );
    liste.hidden = false;
    $$("[data-temoignages-attente]").forEach((el) => el.remove());
  }
}

/* ── Révélations au défilement ───────────────────────────────────────────── */

function revelations() {
  // Une fois l'entrée terminée, data-pose retire les transitions de révélation :
  // survols et pressions retrouvent leurs durées courtes.
  const poser = (el) => el.setAttribute("data-pose", "");
  const voir = (el) => {
    el.setAttribute("data-vu", "");
    const fin = (e) => {
      if (e.target !== el && e.target.parentElement !== el) return;
      el.removeEventListener("transitionend", fin);
      poser(el);
    };
    el.addEventListener("transitionend", fin);
    setTimeout(() => poser(el), 2400);
  };
  // Un groupe (data-groupe) se révèle d'un seul geste : ses éléments entrent ensemble,
  // décalés par --i, même hors champ (cartes du défilement horizontal sur mobile).
  const groupes = $$("[data-groupe]");
  const seuls = $$("[data-reveal]").filter((el) => !el.closest("[data-groupe]"));
  if (!("IntersectionObserver" in window)) {
    $$("[data-reveal]").forEach(voir);
    return;
  }
  const observateur = new IntersectionObserver(
    (entrees) => {
      for (const entree of entrees) {
        if (!entree.isIntersecting) continue;
        const cible = entree.target;
        if (cible.hasAttribute("data-groupe")) $$("[data-reveal]", cible).forEach(voir);
        else voir(cible);
        observateur.unobserve(cible);
      }
    },
    { rootMargin: "0px 0px -12% 0px", threshold: 0.12 },
  );
  [...groupes, ...seuls].forEach((el) => observateur.observe(el));
}

/* ── Couverture ──────────────────────────────────────────────────────────── */

function couverture() {
  const racine = document.documentElement;
  const page = $("#accueil");
  if (!page || !("IntersectionObserver" in window)) {
    racine.removeAttribute("data-couverture");
    return;
  }
  // Tant que la serviette occupe l'écran, la barre et les chapitres restent en retrait.
  new IntersectionObserver(([e]) => racine.toggleAttribute("data-couverture", e.isIntersecting), {
    threshold: 0.55,
  }).observe(page);
}

/* ── Barre de navigation : ton, état compact, masquage au défilement ─────── */

function entete() {
  const barre = $(".entete");
  if (!barre) return;
  let dernierY = window.scrollY;
  let enAttente = false;

  const maj = () => {
    enAttente = false;
    const y = window.scrollY;
    barre.toggleAttribute("data-scrolled", y > 24);
    // La barre ne s'efface en descendant qu'une fois la couverture passée.
    const hero = $("#accueil");
    const seuil = hero ? hero.offsetTop + hero.offsetHeight * 1.2 : 160;
    const descend = y > dernierY && y > seuil;
    if (Math.abs(y - dernierY) > 6) {
      barre.toggleAttribute("data-hidden", descend && !document.documentElement.hasAttribute("data-menu"));
      dernierY = y;
    }
  };
  window.addEventListener(
    "scroll",
    () => {
      if (!enAttente) {
        enAttente = true;
        requestAnimationFrame(maj);
      }
    },
    { passive: true },
  );
  // Au clavier, la barre revient dès qu'un de ses liens reçoit le focus.
  barre.addEventListener("focusin", () => barre.removeAttribute("data-hidden"));
  maj();

  // Le ton (clair / sombre) suit la section qui passe sous la barre.
  const sections = $$("[data-tone]").filter((el) => el.matches("section, footer"));
  if (!("IntersectionObserver" in window) || !sections.length) return;
  const hauteur = barre.offsetHeight || 72;
  const observateur = new IntersectionObserver(
    (entrees) => {
      for (const entree of entrees) {
        if (entree.isIntersecting) barre.dataset.tone = entree.target.dataset.tone;
      }
    },
    { rootMargin: `-${Math.round(hauteur / 2)}px 0px -${window.innerHeight - Math.round(hauteur / 2) - 1}px 0px` },
  );
  sections.forEach((s) => observateur.observe(s));
}

/* ── Chapitres : progression, accès direct, lien actif de la navigation ──── */

function chapitres() {
  const nav = $(".chapitres");
  const sections = $$("section[id]");
  if (!("IntersectionObserver" in window) || !sections.length) return;
  const liens = new Map($$(".chapitres__lien").map((a) => [a.hash.slice(1), a]));
  const liensNav = new Map($$(".nav__lien").map((a) => [a.hash.slice(1), a]));

  const observateur = new IntersectionObserver(
    (entrees) => {
      for (const entree of entrees) {
        if (!entree.isIntersecting) continue;
        const id = entree.target.id;
        liens.forEach((a, cle) => (cle === id ? a.setAttribute("aria-current", "true") : a.removeAttribute("aria-current")));
        liensNav.forEach((a, cle) => (cle === id ? a.setAttribute("aria-current", "true") : a.removeAttribute("aria-current")));
        if (nav) nav.dataset.tone = entree.target.dataset.tone;
      }
    },
    { rootMargin: "-50% 0px -50% 0px" },
  );
  sections.forEach((s) => observateur.observe(s));
}

/* ── Menu plein écran ────────────────────────────────────────────────────── */

function menu() {
  const bouton = $(".bouton-menu");
  const panneau = $("#menu");
  if (!bouton || !panneau) return;
  const racine = document.documentElement;
  const contenu = $$("main, footer");

  const basculer = (ouvrir) => {
    bouton.setAttribute("aria-expanded", String(ouvrir));
    bouton.setAttribute("aria-label", ouvrir ? "Fermer le menu" : "Ouvrir le menu");
    panneau.toggleAttribute("data-open", ouvrir);
    racine.toggleAttribute("data-menu", ouvrir);
    panneau.inert = !ouvrir;
    contenu.forEach((el) => (el.inert = ouvrir));
    if (ouvrir) $(".menu__lien", panneau)?.focus({ preventScroll: true });
  };

  panneau.inert = true;
  bouton.addEventListener("click", () => basculer(bouton.getAttribute("aria-expanded") !== "true"));
  panneau.addEventListener("click", (e) => {
    if (e.target.closest("a")) basculer(false);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && racine.hasAttribute("data-menu")) {
      basculer(false);
      bouton.focus();
    }
  });
  // Si l'écran passe en grand format, le menu se referme de lui-même.
  window.matchMedia("(min-width: 62rem)").addEventListener("change", (e) => e.matches && basculer(false));
}

/* ── Rituels : repères du défilement horizontal (mobile) ─────────────────── */

function rituels() {
  const liste = $(".rituels__liste");
  const points = $$(".rituels__points span");
  if (!liste || !points.length || !("IntersectionObserver" in window)) return;
  const cartes = $$(":scope > li", liste);
  const observateur = new IntersectionObserver(
    (entrees) => {
      for (const entree of entrees) {
        if (entree.intersectionRatio < 0.6) continue;
        const rang = cartes.indexOf(entree.target);
        points.forEach((p, i) => p.toggleAttribute("data-actif", i === rang));
      }
    },
    { root: liste, threshold: [0.6] },
  );
  cartes.forEach((c) => observateur.observe(c));
}

appliquerConfiguration();
couverture();
serviette();
revelations();
entete();
chapitres();
menu();
rituels();
