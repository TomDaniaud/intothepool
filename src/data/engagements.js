/**
 * Mock data temporaire.
 * Remplacer plus tard par le résultat du scraping (même shape).
 */

/**
 * @typedef {Object} Engagement
 * @property {string} id
 * @property {"session"|"race"|"break"} kind
 * @property {string=} time
 * @property {string} label
 * @property {string=} meta
 */

/** @type {Engagement[]} */
export const mockEngagements = [
  {
    id: "t-001",
    kind: "session",
    time: "08:30",
    label: "Samedi matin",
    meta: "Ouverture bassin • Échauffement",
  },
  {
    id: "t-002",
    kind: "race",
    time: "09:10",
    label: "200 NL",
    meta: "Série 3 • Couloir 5",
  },
  {
    id: "t-003",
    kind: "race",
    time: "09:45",
    label: "50 DOS",
    meta: "Série 2 • Couloir 2",
  },
  {
    id: "t-005",
    kind: "session",
    time: "14:00",
    label: "Samedi après-midi",
    meta: "Finales • Remise des prix",
  },
  {
    id: "t-006",
    kind: "race",
    time: "15:25",
    label: "400 4N",
    meta: "Série 1 • Couloir 4",
  },
];
