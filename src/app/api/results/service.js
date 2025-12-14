/**
 * Service pour les résultats des courses.
 * Pour l'instant retourne des mock data avec indication des records battus.
 * Plus tard: scraping depuis la FFN ou autre source.
 */

/**
 * @typedef {Object} ResultSwimmer
 * @property {number} rank
 * @property {number} lane
 * @property {string} name
 * @property {string} club
 * @property {string} time - Temps réalisé
 * @property {string} entryTime - Temps d'engagement
 * @property {boolean} isPersonalBest - Record personnel battu
 * @property {boolean} isSelected - C'est le nageur sélectionné
 * @property {string} [delta] - Différence avec le temps d'engagement
 */

/**
 * @typedef {Object} RaceResult
 * @property {string} race
 * @property {number} seriesNumber
 * @property {number} totalSeries
 * @property {ResultSwimmer[]} swimmers
 */

function parseRaceMeta(meta) {
  if (!meta) return { seriesNumber: null, lane: null };

  const seriesMatch = meta.match(/s[ée]rie\s*(\d+)/i);
  const laneMatch = meta.match(/couloir\s*(\d+)/i);

  return {
    seriesNumber: seriesMatch ? Number.parseInt(seriesMatch[1], 10) : null,
    lane: laneMatch ? Number.parseInt(laneMatch[1], 10) : null,
  };
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

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
 * Récupère les résultats d'une course.
 * @param {Object} params
 * @param {string} [params.race]
 * @param {string} [params.engagementId]
 * @param {string} [params.meta]
 * @returns {Promise<RaceResult>}
 */
export async function getResults({ race, engagementId, meta }) {
  const { seriesNumber, lane } = parseRaceMeta(meta);

  // Deterministic pseudo-randomness based on engagementId
  const seed = Array.from(engagementId || "unknown").reduce(
    (acc, char) => acc + char.charCodeAt(0),
    0
  );

  const maxNb = 8;
  const totalSeries = 4 + (seed % 3);

  // Générer les nageurs avec temps d'engagement et temps réalisé
  const swimmers = Array.from({ length: maxNb }, (_, index) => {
    const laneNumber = index + 1;

    // Temps d'engagement (base)
    const entryBase = 28 + ((seed + laneNumber * 7) % 40) / 10;
    const entryJitter = ((seed + laneNumber * 13) % 15) / 100;
    const entryTimeSeconds = entryBase + entryJitter;

    // Temps réalisé (légèrement différent)
    const performanceVariation = (((seed + laneNumber * 17) % 30) - 15) / 100;
    const resultTimeSeconds = entryTimeSeconds + performanceVariation;

    // Record battu si le temps réalisé est meilleur que le temps d'engagement
    const isPersonalBest = resultTimeSeconds < entryTimeSeconds;
    const deltaSeconds = resultTimeSeconds - entryTimeSeconds;

    return {
      lane: laneNumber,
      name: `Nageur ${pad2(laneNumber)}`,
      club: `Club ${String.fromCharCode(65 + ((seed + laneNumber) % 6))}`,
      entryTime: formatTime(entryTimeSeconds),
      time: formatTime(resultTimeSeconds),
      isPersonalBest,
      delta: formatDelta(deltaSeconds),
      isSelected: lane != null ? laneNumber === lane : false,
      resultTimeSeconds, // Pour le tri
    };
  });

  // Trier par temps réalisé (classement)
  swimmers.sort((a, b) => a.resultTimeSeconds - b.resultTimeSeconds);

  // Ajouter le rang
  const rankedSwimmers = swimmers.map((swimmer, index) => ({
    rank: index + 1,
    lane: swimmer.lane,
    name: swimmer.name,
    club: swimmer.club,
    entryTime: swimmer.entryTime,
    time: swimmer.time,
    isPersonalBest: swimmer.isPersonalBest,
    delta: swimmer.delta,
    isSelected: swimmer.isSelected,
  }));

  return {
    race: race || "Épreuve",
    seriesNumber: seriesNumber || 1,
    totalSeries,
    swimmers: rankedSwimmers,
  };
}
