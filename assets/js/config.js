/**
 * Peachy — configuration du site.
 * Tout ce qui dépend d'informations à fournir par Peachy se règle ici,
 * sans toucher au HTML. Voir CONTENU-A-COMPLETER.md pour la liste complète.
 */
export const site = {
  /**
   * Réservation.
   * `url` : lien du système de réservation réel (Planity, Calendly, Treatwell…).
   * Tant qu'il vaut `null`, le bouton « Réserver mon soin » ouvre le compte
   * Instagram officiel et la note d'attente reste affichée.
   */
  reservation: {
    url: null,
  },

  /** Compte Instagram officiel (vérifié sur les captures fournies). */
  instagram: {
    identifiant: "peachy_lymphatictherapy",
    url: "https://www.instagram.com/peachy_lymphatictherapy/",
  },

  /**
   * Coordonnées. Chaque champ laissé à `null` reste masqué dans le pied de page.
   * `itineraire` : lien Google Maps / Plans vers le centre.
   */
  coordonnees: {
    adresse: null,
    itineraire: null,
    telephone: null,
    email: null,
  },

  /**
   * Témoignages réels et validés uniquement, publiés avec l'accord de leur auteure.
   * Exemple : { texte: "…", auteur: "Prénom N.", contexte: "Drainage lymphatique" }
   * Tant que la liste est vide, la section affiche la phrase de la maison,
   * sans aucun avis.
   */
  temoignages: [],
};
