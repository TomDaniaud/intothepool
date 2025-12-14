/**
 * Service pour les clubs.
 * Pour l'instant retourne des mock data.
 * Plus tard: scraping depuis la FFN ou autre source.
 */

/**
 * @typedef {Object} Club
 * @property {string} name
 * @property {string} city
 * @property {string} code
 */

/** @type {Record<string, Club>} */
const mockClubs = {
  "074001": {
    name: "Cercle des Nageurs",
    city: "Annecy",
    code: "074001",
  },
  "075001": {
    name: "Racing Club de France",
    city: "Paris",
    code: "075001",
  },
};

/**
 * Récupère un club par code.
 * @param {string} code
 * @returns {Promise<Club | null>}
 */
export async function getClubByCode(code) {
  // TODO: scraping basé sur le code
  return mockClubs[code] || null;
}

/**
 * Récupère le club par défaut (mock).
 * @returns {Promise<Club>}
 */
export async function getDefaultClub() {
  return mockClubs["074001"];
}
