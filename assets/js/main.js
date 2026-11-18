/**
 * Peachy — comportements de la page.
 * Aucun framework, aucune dépendance : observateurs natifs et événements passifs.
 * La page reste entièrement lisible et navigable sans ce script.
 */
import { site } from "./config.js";

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const racine = document.documentElement;

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
    setTimeout(() => poser(el), 3200);
  };
  const cibles = $$("[data-reveal]");
  if (!("IntersectionObserver" in window)) {
    cibles.forEach(voir);
    return;
  }
  // Un lettrage qui s'écrit est masqué par son propre clip-path : l'observateur ne le verrait
  // jamais. C'est donc son titre que l'on observe, et toutes ses lignes s'écrivent ensemble.
  const groupes = new Map();
  for (const el of cibles) {
    const temoin = el.dataset.reveal === "ecrit" ? el.parentElement : el;
    groupes.set(temoin, [...(groupes.get(temoin) ?? []), el]);
  }
  const observateur = new IntersectionObserver(
    (entrees) => {
      for (const entree of entrees) {
        if (!entree.isIntersecting) continue;
        groupes.get(entree.target).forEach(voir);
        observateur.unobserve(entree.target);
      }
    },
    { rootMargin: "0px 0px -12% 0px", threshold: 0.12 },
  );
  groupes.forEach((_, temoin) => observateur.observe(temoin));
}

/* ── Couverture ──────────────────────────────────────────────────────────── */

function couverture() {
  const page = $("#accueil");
  if (!page || !("IntersectionObserver" in window)) {
    racine.removeAttribute("data-couverture");
    return;
  }
  // Tant que la couverture occupe l'écran, la barre et les repères restent en retrait.
  new IntersectionObserver(([e]) => racine.toggleAttribute("data-couverture", e.isIntersecting), {
    threshold: 0.55,
  }).observe(page);
}

/* ── Défilement : barre, ton, chapitre courant, passage d'un chapitre à l'autre ── */

function defilement() {
  const barre = $(".entete");
  const rail = $(".chapitres");
  const scenes = $$(".scene");
  if (!scenes.length) return;

  const liensRail = new Map($$(".chapitres__lien").map((a) => [a.hash.slice(1), a]));
  const liensBarre = new Map($$(".nav__lien").map((a) => [a.hash.slice(1), a]));
  // Sans animation-timeline (Firefox, Safari avant la version 26), le script pilote lui-même
  // le recul du chapitre recouvert. Mêmes valeurs que les images clés de motion.css.
  const calme = window.matchMedia("(prefers-reduced-motion: reduce)");
  const natif = window.CSS?.supports?.("animation-timeline: view()");

  // Positions naturelles des chapitres : offsetTop ignore les transformations en cours.
  let reperes = [];
  let hauteur = window.innerHeight;
  const mesurer = () => {
    hauteur = window.innerHeight;
    reperes = scenes.map((el) => ({ el, haut: el.offsetTop, bas: el.offsetTop + el.offsetHeight }));
  };

  let dernierY = window.scrollY;
  let chapitre = null;
  let enAttente = false;

  const maj = () => {
    enAttente = false;
    const y = window.scrollY;

    if (barre) {
      barre.toggleAttribute("data-scrolled", y > 24);
      // La barre s'efface en descendant, revient en remontant.
      if (Math.abs(y - dernierY) > 6) {
        barre.toggleAttribute("data-hidden", y > dernierY && y > hauteur * 1.2 && !racine.hasAttribute("data-menu"));
        dernierY = y;
      }
      // Son ton (clair / sombre) suit le chapitre qui passe dessous.
      const ligne = y + (barre.offsetHeight || 72) / 2;
      const dessous = reperes.findLast((r) => r.haut <= ligne) ?? reperes[0];
      if (dessous && barre.dataset.tone !== dessous.el.dataset.tone) barre.dataset.tone = dessous.el.dataset.tone;
    }

    // Chapitre courant : celui qui tient le milieu de l'écran.
    const milieu = y + hauteur / 2;
    const courant = reperes.findLast((r) => r.haut <= milieu) ?? reperes[0];
    if (courant && courant.el !== chapitre) {
      chapitre = courant.el;
      const id = chapitre.id;
      for (const liens of [liensRail, liensBarre]) {
        liens.forEach((a, cle) => (cle === id ? a.setAttribute("aria-current", "true") : a.removeAttribute("aria-current")));
      }
      if (rail) rail.dataset.tone = chapitre.dataset.tone;
    }

    if (!natif && !calme.matches) {
      for (const { el, haut, bas } of reperes) {
        if (el.classList.contains("pied")) continue;
        // La sortie commence quand le bas du chapitre atteint le bas de l'écran
        // (ou son sommet le haut de l'écran, s'il est plus court que l'écran).
        const debut = Math.max(haut, bas - hauteur);
        const p = Math.min(1, Math.max(0, (y - debut) / (bas - debut)));
        if (el._recul === p) continue;
        el._recul = p;
        el.style.transform = p ? `translate3d(0, ${(p * hauteur * 0.28).toFixed(1)}px, 0)` : "";
        el.style.setProperty("--recul", p.toFixed(3));
      }
    }
  };

  const demander = () => {
    if (!enAttente) {
      enAttente = true;
      requestAnimationFrame(maj);
    }
  };
  window.addEventListener("scroll", demander, { passive: true });
  window.addEventListener("resize", () => (mesurer(), demander()), { passive: true });
  // Les hauteurs changent quand les images et les polices arrivent.
  if ("ResizeObserver" in window) new ResizeObserver(() => (mesurer(), demander())).observe(document.body);
  // Au clavier, la barre revient dès qu'un de ses liens reçoit le focus.
  barre?.addEventListener("focusin", () => barre.removeAttribute("data-hidden"));
  mesurer();
  maj();
}

/* ── Menu plein écran ────────────────────────────────────────────────────── */

function menu() {
  const bouton = $(".bouton-menu");
  const panneau = $("#menu");
  if (!bouton || !panneau) return;
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

appliquerConfiguration();
couverture();
revelations();
defilement();
menu();
