/**
 * Service pour l'analyse des performances.
 * Pour l'instant retourne des mock data.
 * Plus tard: calculs basés sur les données scrappées.
 */

/**
 * @typedef {Object} PerformancePoint
 * @property {string} dateLabel
 * @property {number} timeSeconds
 */

/**
 * @typedef {Object} AnalysisData
 * @property {string} eventLabel
 * @property {PerformancePoint[]} progressionPoints
 * @property {Object} stats
 * @property {string} stats.bestTime
 * @property {string} stats.averageTime
 * @property {string} stats.progression
 * @property {number} stats.totalRaces
 * @property {number} stats.podiums
 * @property {number} stats.personalBests
 * @property {Object} comparison
 * @property {string} comparison.regionalAvg
 * @property {string} comparison.nationalAvg
 * @property {string} comparison.vsRegional
 * @property {string} comparison.vsNational
 * @property {Object[]} splits
 */

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds - minutes * 60;
  return `${minutes}:${rest.toFixed(2).padStart(5, "0")}`;
}

function formatDelta(deltaSeconds) {
  const sign = deltaSeconds >= 0 ? "+" : "-";
  const abs = Math.abs(deltaSeconds);
  return `${sign}${abs.toFixed(2)}`;
}

/**
 * Récupère les données d'analyse pour un nageur et une épreuve.
 * @param {Object} params
 * @param {string} [params.eventId]
 * @param {string} [params.license]
 * @returns {Promise<AnalysisData>}
 */
export async function getAnalysis({ eventId, license }) {
  // Seed basé sur eventId pour des données déterministes
  const seed = Array.from(eventId || "200NL").reduce(
    (acc, char) => acc + char.charCodeAt(0),
    0
  );

  // Progression sur les derniers mois
  const baseTime = 120 + (seed % 30);
  const progressionPoints = [
    { dateLabel: "Sep", timeSeconds: baseTime + 3.5 },
    { dateLabel: "Oct", timeSeconds: baseTime + 2.2 },
    { dateLabel: "Nov", timeSeconds: baseTime + 1.4 },
    { dateLabel: "Déc", timeSeconds: baseTime + 0.8 },
    { dateLabel: "Jan", timeSeconds: baseTime },
  ];

  const bestTime = baseTime;
  const times = progressionPoints.map((p) => p.timeSeconds);
  const averageTime = times.reduce((a, b) => a + b, 0) / times.length;
  const progression = progressionPoints[0].timeSeconds - bestTime;

  // Comparaisons régionales/nationales (fictives)
  const regionalAvg = baseTime + 2.5;
  const nationalAvg = baseTime - 1.5;

  // Splits pour 200m (4x50m)
  const splitBase = baseTime / 4;
  const splits = [
    {
      distance: "50m",
      time: formatTime(splitBase - 0.5),
      cumulative: formatTime(splitBase - 0.5),
    },
    {
      distance: "100m",
      time: formatTime(splitBase + 0.2),
      cumulative: formatTime(splitBase - 0.5 + (splitBase + 0.2)),
    },
    {
      distance: "150m",
      time: formatTime(splitBase + 0.8),
      cumulative: formatTime(
        splitBase - 0.5 + (splitBase + 0.2) + (splitBase + 0.8)
      ),
    },
    {
      distance: "200m",
      time: formatTime(splitBase + 1.2),
      cumulative: formatTime(baseTime),
    },
  ];

  return {
    eventLabel: eventId?.replace(/(\d+)/, "$1 ") || "200 NL",
    progressionPoints,
    stats: {
      bestTime: formatTime(bestTime),
      averageTime: formatTime(averageTime),
      progression: formatDelta(-progression),
      totalRaces: 12 + (seed % 8),
      podiums: 3 + (seed % 5),
      personalBests: 4 + (seed % 4),
    },
    comparison: {
      regionalAvg: formatTime(regionalAvg),
      nationalAvg: formatTime(nationalAvg),
      vsRegional: formatDelta(bestTime - regionalAvg),
      vsNational: formatDelta(bestTime - nationalAvg),
    },
    splits,
  };
}
