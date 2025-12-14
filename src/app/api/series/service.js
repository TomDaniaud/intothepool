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
 * @property {number} seriesNumber
 * @property {boolean} isSwimmerSeries - True si le nageur sélectionné est dans cette série
 * @property {SeriesSwimmer[]} swimmers
 */

/**
 * @typedef {Object} AllSeriesResponse
 * @property {string} race
 * @property {number} totalSeries
 * @property {number} swimmerSeriesIndex - Index de la série où se trouve le nageur (0-based)
 * @property {"simple"|"relay"} type
 * @property {Series[]} series
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

/**
 * Récupère toutes les séries pour une épreuve.
 * @param {Object} params
 * @param {string} [params.competId]
 * @param {string} [params.race]
 * @param {string} [params.engagementId]
 * @param {string} [params.meta]
 * @returns {Promise<AllSeriesResponse>}
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
    0
  );

  // Nombre total de séries (entre 3 et 6)
  const totalSeries = 3 + (seed % 4);
  const swimmerSeriesNumber = seriesNumber || (seed % totalSeries) + 1;
  const swimmerSeriesIndex = swimmerSeriesNumber - 1;

  const series = Array.from({ length: totalSeries }, (_, seriesIdx) => {
    const currentSeriesNumber = seriesIdx + 1;
    const isSwimmerSeries = currentSeriesNumber === swimmerSeriesNumber;
    const maxLanes = 8;

    const swimmers = Array.from({ length: maxLanes }, (_, laneIdx) => {
      const laneNumber = laneIdx + 1;
      // Variation basée sur la série et le couloir
      const base = 28 + ((seed + seriesIdx * 11 + laneNumber * 7) % 40) / 10;
      const jitter = ((seed + seriesIdx * 5 + laneNumber * 13) % 15) / 100;
      const timeSeconds = base + jitter;

      // Le nageur sélectionné est dans sa série et son couloir
      const isSelected =
        isSwimmerSeries &&
        (lane != null ? laneNumber === lane : laneNumber === 5);

      return {
        lane: laneNumber,
        name: isSelected
          ? "Vous"
          : `Nageur ${pad2(seriesIdx * 8 + laneNumber)}`,
        club: `Club ${String.fromCharCode(
          65 + ((seed + seriesIdx + laneNumber) % 6)
        )}`,
        entryTime: formatTime(timeSeconds),
        isSelected,
      };
    });

    return {
      seriesNumber: currentSeriesNumber,
      isSwimmerSeries,
      swimmers,
    };
  });

  return {
    race: race || "Épreuve",
    totalSeries,
    swimmerSeriesIndex,
    type: "simple",
    series,
  };
}
