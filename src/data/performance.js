/**
 * Mock data temporaire: évolution des temps.
 * Remplacer plus tard par le résultat du scraping.
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

/** @type {PerformanceSeries} */
export const mockPerformanceSeries = {
  eventLabel: "200 NL",
  points: [
    { dateLabel: "Sep", timeSeconds: 128.4 },
    { dateLabel: "Oct", timeSeconds: 127.2 },
    { dateLabel: "Nov", timeSeconds: 126.8 },
    { dateLabel: "Déc", timeSeconds: 125.9 },
    { dateLabel: "Jan", timeSeconds: 125.1 },
  ],
};
