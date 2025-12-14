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

/** @type {Swimmer[]} */
const mockSwimmers = [
  {
    firstName: "Camille",
    lastName: "Dupont",
    license: "A123456",
    category: "Senior",
  },
  {
    firstName: "Lucas",
    lastName: "Martin",
    license: "B789012",
    category: "Junior",
  },
];

/**
 * Récupère un nageur par licence.
 * @param {string} license
 * @returns {Promise<Swimmer | null>}
 */
export async function getSwimmerByLicense(license) {
  // TODO: scraping basé sur la licence
  return mockSwimmers.find((s) => s.license === license) || null;
}

/**
 * Récupère un nageur par nom/prénom.
 * @param {string} firstName
 * @param {string} lastName
 * @returns {Promise<Swimmer | null>}
 */
export async function getSwimmerByName(firstName, lastName) {
  // TODO: scraping basé sur le nom
  // Pour l'instant, on retourne un mock basé sur les paramètres
  const found = mockSwimmers.find(
    (s) =>
      s.firstName.toLowerCase() === firstName?.toLowerCase() &&
      s.lastName.toLowerCase() === lastName?.toLowerCase()
  );

  if (found) return found;

  // Si pas trouvé, on crée un mock avec les paramètres fournis
  if (firstName || lastName) {
    return {
      firstName: firstName || "",
      lastName: lastName || "",
      license: "MOCK001",
      category: "Senior",
    };
  }

  return null;
}

/**
 * Récupère le nageur par défaut (mock).
 * @returns {Promise<Swimmer>}
 */
export async function getDefaultSwimmer() {
  return mockSwimmers[0];
}
