/**
 * Peachy — banc d'essai des logos : affichage d'une série de pistes derrière un sélecteur.
 * Une piste à la fois, en grand, puis dans les situations réelles du site.
 * Le sélecteur (balises, styles, câblage) vient du skill « prototype » (PICKER.md).
 */

/**
 * @param pistes  [{ cle, nom, idee, lecture }] ; la pièce `symbole-<cle>` doit exister
 * @param pieces  dimensions des pièces de la série (pieces.js)
 * @param note    phrase affichée en bas de chaque piste
 */
export function monter({ pistes, pieces, note }) {
  // Une pièce du logo, en masque : la couleur vient du parent.
  const piece = (nom, classe) => {
    const { l, h } = pieces[nom];
    // Adresse complète : une url() relative dans une variable se résoudrait depuis banc.css.
    const adresse = new URL(`svg/${nom}.svg`, location.href).href;
    return `<span class="encre ${classe}" style="--f: url('${adresse}'); --l: ${l}; --h: ${h}" aria-hidden="true"></span>`;
  };

  const logo = (cle) => `
    <div class="logo" role="img" aria-label="Peachy — Lymphatic Therapy">
      ${piece(`symbole-${cle}`, "symbole")}
      ${piece("nom", "nom")}
      ${piece("sous-titre", "sous")}
    </div>`;

  const couche = (cle, taille) => `
    <div class="couche" style="--t: ${taille}" role="img" aria-label="Peachy — Lymphatic Therapy">
      ${piece(`symbole-${cle}`, "symbole")}
      <div class="couche__mots">${piece("nom", "nom")}${piece("sous-titre", "sous")}</div>
    </div>`;

  const pastilles = (cle) =>
    [96, 64, 32, 16].map((c) => `<span class="pastille" style="--c: ${c}px">${piece(`symbole-${cle}`, "")}</span>`).join("");

  const variants = pistes.map(({ cle, nom, idee, lecture }) => () => `
    <section class="planche">${logo(cle)}</section>

    <section class="usages">
      <header>
        <h1>${nom}</h1>
        <p>${idee} ${lecture}</p>
      </header>

      <div class="cas">
        <h2>De la lettre au signe</h2>
        <div class="cas__zone zone--cuir filiation">
          ${piece("initiale", "initiale")}
          <span class="fleche" aria-hidden="true"></span>
          ${piece(`symbole-${cle}`, "")}
        </div>
      </div>

      <div class="cas">
        <h2>Dans la barre du site</h2>
        <div class="cas__zone zone--creme">${couche(cle, "1.125rem")}${couche(cle, "0.8125rem")}</div>
        <div class="cas__zone zone--nuit">${couche(cle, "1.125rem")}${couche(cle, "0.8125rem")}</div>
      </div>

      <div class="cas">
        <h2>En icône : 96, 64, 32 et 16 pixels</h2>
        <div class="cas__zone zone--creme"><div class="pastilles">${pastilles(cle)}</div></div>
      </div>

      <p class="note">${note}</p>
    </section>`);

  // Le sélecteur : une entrée par piste.
  const picker = document.querySelector(".proto-picker");
  picker.innerHTML =
    `<span class="proto-picker-highlight" aria-hidden="true"></span>` +
    pistes.map(({ nom }) => `<button class="proto-picker-item">${nom}</button>`).join("");

  /* Câblage : repris de PICKER.md (sans bouton « rejouer » : rien ne s'anime ici). */
  const stage = document.getElementById("stage");
  const highlight = picker.querySelector(".proto-picker-highlight");
  const items = [...picker.querySelectorAll(".proto-picker-item:not(.proto-picker-replay)")];
  let current = 0;

  function moveHighlight() {
    const el = items[current];
    highlight.style.width = el.offsetWidth + "px";
    highlight.style.transform = `translateX(${el.offsetLeft}px)`;
  }

  function mount(i) {
    stage.innerHTML = "";
    requestAnimationFrame(() => { stage.innerHTML = variants[i](); });
  }

  function setActive(i) {
    if (i < 0 || i >= variants.length) return;
    current = i;
    items.forEach((el, j) => {
      el.toggleAttribute("data-active", j === i);
      if (j === i) el.setAttribute("aria-current", "true");
      else el.removeAttribute("aria-current");
    });
    moveHighlight();
    const url = new URL(location);
    url.searchParams.set("v", i + 1);
    history.replaceState(null, "", url);
    mount(i);
  }

  items.forEach((el, i) => el.addEventListener("click", () => setActive(i)));
  window.addEventListener("resize", moveHighlight);

  document.addEventListener("keydown", (e) => {
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const num = parseInt(e.key, 10);
    if (num >= 1 && num <= variants.length) setActive(num - 1);
    else if (e.key === "ArrowRight") setActive((current + 1) % variants.length);
    else if (e.key === "ArrowLeft") setActive((current - 1 + variants.length) % variants.length);
  });

  const requested = parseInt(new URLSearchParams(location.search).get("v"), 10);
  setActive(requested >= 1 && requested <= variants.length ? requested - 1 : 0);
  // La glissade du repère n'est activée qu'après le premier affichage.
  requestAnimationFrame(() => requestAnimationFrame(() => picker.setAttribute("data-ready", "")));
}
