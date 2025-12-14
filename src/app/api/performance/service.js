/**
 * Service pour les performances (évolution des temps).
 * Pour l'instant retourne des mock data.
 * Plus tard: scraping depuis la FFN ou autre source.
 */

/**
 * @typedef {Object} PerformancePoint
 * @property {string} dateLabel
 * @property {number} timeSeconds
 */

/**
 * @typedef {Object} PerformanceSeries
 * @property {string} eventLabel
 * @property {PerformancePoint[]} points
 */

/** @type {Record<string, PerformanceSeries>} */
const mockPerformances = {
  "200NL": {
    eventLabel: "200 NL",
    points: [
      { dateLabel: "Sep", timeSeconds: 128.4 },
      { dateLabel: "Oct", timeSeconds: 127.2 },
      { dateLabel: "Nov", timeSeconds: 126.8 },
      { dateLabel: "Déc", timeSeconds: 125.9 },
      { dateLabel: "Jan", timeSeconds: 125.1 },
    ],
  },
  "50DOS": {
    eventLabel: "50 DOS",
    points: [
      { dateLabel: "Sep", timeSeconds: 32.5 },
      { dateLabel: "Oct", timeSeconds: 32.1 },
      { dateLabel: "Nov", timeSeconds: 31.8 },
      { dateLabel: "Déc", timeSeconds: 31.4 },
    ],
  },
};

/**
 * Récupère les performances pour une épreuve.
 * @param {string} [eventId] - ID de l'épreuve (ex: "200NL")
 * @param {string} [_license] - Licence du nageur (ignoré pour l'instant)
 * @returns {Promise<PerformanceSeries | null>}
 */
export async function getPerformance(eventId, _license) {
  // TODO: scraping basé sur eventId et _license
  if (eventId && mockPerformances[eventId]) {
    return mockPerformances[eventId];
  }
  // Par défaut, retourne 200NL
  return mockPerformances["200NL"];
}
