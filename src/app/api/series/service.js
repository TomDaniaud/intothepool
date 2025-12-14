/**
 * Service pour les séries (liste des nageurs dans une série).
 * Pour l'instant génère des mock data déterministes.
 * Plus tard: scraping depuis la FFN ou autre source.
 */

/**
 * @typedef {Object} SeriesSwimmer
 * @property {number} lane
 * @property {string} name
 * @property {string} club
 * @property {string} entryTime
 * @property {boolean} isSelected
 */

/**
 * @typedef {Object} Series
 * @property {string} race
 * @property {number} nb
 * @property {number} maxNb
 * @property {"simple"|"relay"} type
 * @property {SeriesSwimmer[]} swimmers
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

function clampNumber(value, min, max) {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds - minutes * 60;
  return `${minutes}:${rest.toFixed(2).padStart(5, "0")}`;
}

/**
 * Récupère les informations de série pour une épreuve.
 * @param {Object} params
 * @param {string} [params.competId]
 * @param {string} [params.race]
 * @param {string} [params.engagementId]
 * @param {string} [params.meta]
 * @returns {Promise<Series>}
 */
export async function getSeries({
  competId: _competId,
  race,
  engagementId,
  meta,
}) {
  const { seriesNumber, lane } = parseRaceMeta(meta);

  // Deterministic pseudo-randomness based on engagementId
  const seed = Array.from(engagementId || "unknown").reduce(
    (acc, char) => acc + char.charCodeAt(0),
    0,
  );

  const maxNb = 8;
  const nb = clampNumber(seriesNumber ?? (seed % 4) + 1, 1, 12);

  const swimmers = Array.from({ length: maxNb }, (_, index) => {
    const laneNumber = index + 1;
    const base = 28 + ((seed + laneNumber * 7) % 40) / 10;
    const jitter = ((seed + laneNumber * 13) % 15) / 100;
    const timeSeconds = base + jitter;

    return {
      lane: laneNumber,
      name: `Nageur ${pad2(laneNumber)}`,
      club: `Club ${String.fromCharCode(65 + ((seed + laneNumber) % 6))}`,
      entryTime: formatTime(timeSeconds),
      isSelected: lane != null ? laneNumber === lane : false,
    };
  });

  return {
    race: race || "Épreuve",
    nb,
    maxNb,
    type: "simple",
    swimmers,
  };
}
