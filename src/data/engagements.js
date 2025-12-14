/**
 * Mock data temporaire.
 * Remplacer plus tard par le résultat du scraping (même shape).
 */

/**
 * @typedef {Object} Engagement
 * @property {string} id
 * @property {"session"|"race"|"break"} kind
 * @property {string} label
 * @property {string=} meta
 */

/** @type {Engagement[]} */
export const mockEngagements = [
  {
    id: "t-001",
    kind: "session",
    label: "Samedi matin",
    meta: "Ouverture bassin • Échauffement",
  },
  {
    id: "t-002",
    kind: "race",
    label: "200 NL",
    meta: "Série 3 • Couloir 5",
  },
  {
    id: "t-003",
    kind: "race",
    label: "50 DOS",
    meta: "Série 2 • Couloir 2",
  },
  {
    id: "t-004",
    kind: "break",
    label: "Pause midi",
    meta: "Restauration • Récupération",
  },
  {
    id: "t-005",
    kind: "session",
    label: "Samedi après-midi",
    meta: "Finales • Remise des prix",
  },
  {
    id: "t-006",
    kind: "race",
    label: "400 4N",
    meta: "Série 1 • Couloir 4",
  },
];
