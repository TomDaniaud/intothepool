/**
 * Service pour les nageurs.
 * Pour l'instant retourne des mock data.
 * Plus tard: scraping depuis la FFN ou autre source.
 */

/**
 * @typedef {Object} Swimmer
 * @property {string} firstName
 * @property {string} lastName
 * @property {string} license
 * @property {string} category
 */

/** @type {Record<string, Swimmer>} */
const mockSwimmers = {
  A123456: {
    firstName: "Camille",
    lastName: "Dupont",
    license: "A123456",
    category: "Senior",
  },
  B789012: {
    firstName: "Lucas",
    lastName: "Martin",
    license: "B789012",
    category: "Junior",
  },
};

/**
 * Récupère un nageur par licence.
 * @param {string} license
 * @returns {Promise<Swimmer | null>}
 */
export async function getSwimmerByLicense(license) {
  // TODO: scraping basé sur la licence
  return mockSwimmers[license] || null;
}

/**
 * Récupère le nageur par défaut (mock).
 * @returns {Promise<Swimmer>}
 */
export async function getDefaultSwimmer() {
  return mockSwimmers.A123456;
}
