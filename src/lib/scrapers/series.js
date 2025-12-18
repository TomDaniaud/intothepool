/**
 * Scraper pour les séries FFN
 */
import { z } from "zod";
import {
  BaseScraper,
  NotFoundError,
  ScrapingError,
  isAfter,
} from "./base";

// ============================================================================
// SCHEMAS ZOD
// ============================================================================

export const SeriesParamsSchema = z.object({
  cat_id: z.string(),
  epr_id: z.string(),
  typ_id: z.string(),
  num_epreuve: z.string(),
  alea: z.string().optional(),
  langue: z.string().optional(),
});

export const SwimmerInSeriesSchema = z.object({
  name: z.string(),
  year: z.string(),
  nationality: z.string(),
  club: z.string(),
  lastChrono: z.string(),
});

export const SeriesSchema = z.object({
  type: z.enum(["simple", "relay"]),
  nb: z.string(),
  maxNb: z.string(),
  race: z.string(),
  time: z.string(),
  swimmers: z.array(SwimmerInSeriesSchema),
});

export const GetProgramParamsSchema = z.object({
  competId: z.string().min(1, "L'ID de la compétition est requis"),
  date: z.string().min(1, "La date est requise"),
  time: z.string().min(1, "L'heure est requise"),
});

// ============================================================================
// TYPES
// ============================================================================

/**
 * @typedef {z.infer<typeof SeriesParamsSchema>} SeriesParams
 * @typedef {z.infer<typeof SeriesSchema>} Series
 * @typedef {z.infer<typeof SwimmerInSeriesSchema>} SwimmerInSeries
 */

/**
 * @typedef {Object} SeriesSwimmerFormatted
 * @property {number} lane
 * @property {string} name
 * @property {string} club
 * @property {string} entryTime
 * @property {boolean} isSelected
 */

/**
 * @typedef {Object} FormattedSeries
 * @property {number} seriesNumber
 * @property {boolean} isSwimmerSeries
 * @property {SeriesSwimmerFormatted[]} swimmers
 */

/**
 * @typedef {Object} AllSeriesResponse
 * @property {string} race
 * @property {number} totalSeries
 * @property {number} swimmerSeriesIndex
 * @property {"simple"|"relay"} type
 * @property {FormattedSeries[]} series
 */

// ============================================================================
// URLs
// ============================================================================

const URL_FFN_PROGRAM = (competId) =>
  `https://www.liveffn.com/cgi-bin/programme.php?competition=${competId}&langue=fra`;

const URL_FFN_SERIES = (competId, params) => {
  const { cat_id, epr_id, typ_id, num_epreuve, langue = "fra", alea = "" } = params;
  return `https://www.liveffn.com/cgi-bin/programme.php?competition=${competId}&langue=${langue}&alea=${alea}&cat_id=${cat_id}&epr_id=${epr_id}&typ_id=${typ_id}&num_epreuve=${num_epreuve}`;
};

// ============================================================================
// SERIES SCRAPER
// ============================================================================

export class SeriesScraper extends BaseScraper {
  constructor(options = {}) {
    super(options);
  }

  /**
   * Parse les métadonnées d'une course (série/couloir)
   * @param {string} [meta]
   * @returns {{seriesNumber: number | null, lane: number | null}}
   */
  parseRaceMeta(meta) {
    if (!meta) return { seriesNumber: null, lane: null };

    const seriesMatch = meta.match(/s[ée]rie\s*(\d+)/i);
    const laneMatch = meta.match(/couloir\s*(\d+)/i);

    return {
      seriesNumber: seriesMatch ? Number.parseInt(seriesMatch[1], 10) : null,
      lane: laneMatch ? Number.parseInt(laneMatch[1], 10) : null,
    };
  }

  /**
   * Récupère les paramètres d'une série depuis le programme
   * @param {string} competId
   * @param {string} date
   * @param {string} time
   * @returns {Promise<SeriesParams>}
   */
  async getProgram(competId, date, time) {
    this.validate(GetProgramParamsSchema, { competId, date, time });

    const cacheKey = this.getCacheKey("program", competId, date, time);

    return this.getOrFetch(cacheKey, async () => {
      const $ = await this.fetchCheerio(URL_FFN_PROGRAM(competId));

      let onclick;

      const div = $(`h6:contains("${date}")`).next("div");
      const reunion = div.find("ul.reunion");

      $(reunion)
        .find("li.survol")
        .each((_, el) => {
          const raceTime = $(el).find(".time").text().trim();
          if (isAfter(time, raceTime) < 0) {
            return false;
          }
          const span = $(el).find(".tooltip");
          onclick = span.attr("onclick");
          return true;
        });

      if (!onclick) {
        throw new NotFoundError("Course dans le programme");
      }

      // Parser l'attribut onclick
      onclick = onclick.split(",")[2];
      const cleanedOnclick = onclick.replaceAll("'", "").replaceAll("+", "");
      const result = {};
      const regex = /&(\w+)=\+?(\d+)/g;

      let match;
      while ((match = regex.exec(cleanedOnclick)) !== null) {
        result[match[1]] = match[2];
      }

      // Valider les paramètres extraits
      const expectedKeys = ["cat_id", "epr_id", "typ_id", "num_epreuve"];
      for (const key of expectedKeys) {
        if (!(key in result)) {
          throw new ScrapingError(
            `Paramètre "${key}" manquant`,
            "PARSING_ERROR",
            500
          );
        }
      }

      return this.validate(SeriesParamsSchema, result);
    });
  }

  /**
   * Récupère les détails d'une série depuis la FFN
   * @param {string} competId
   * @param {SeriesParams} params
   * @param {string} startTime
   * @returns {Promise<Series | null>}
   */
  async getSeriesFromFFN(competId, params, startTime) {
    const cacheKey = this.getCacheKey(
      "series-ffn",
      competId,
      params,
      startTime
    );

    return this.getOrFetch(cacheKey, async () => {
      const url = URL_FFN_SERIES(competId, params);
      const $ = await this.fetchCheerio(url);

      /** @type {Series | null} */
      let selectedSeries = null;
      let inRange = false;

      $("tr").each((_, el) => {
        const row = $(el);

        if (row.find("td.prgTitre").length) {
          const title = row.find("td.prgTitre").text().trim();
          const courseTime = row.find("td.prgTime").text().trim();
          const [courseName, _, nbAndMax] = title.split("-");
          const nbMatch = nbAndMax?.match(/\d+/g) || ["", ""];
          const [nb, maxNb] = nbMatch;

          if (courseTime === startTime) {
            inRange = true;
            selectedSeries = {
              type: "simple",
              nb: nb || "",
              maxNb: maxNb || "",
              race: courseName?.trim() || "",
              time: courseTime,
              swimmers: [],
            };
          } else if (inRange) {
            return false;
          }
        }

        if (row.hasClass("survol") && selectedSeries) {
          const tds = row.find("td");
          if (tds.length >= 6) {
            const chrono = $(tds[5]).text().trim();
            const swimmer = {
              name: $(tds[1]).text().trim(),
              year: $(tds[2]).text().trim(),
              nationality: $(tds[3]).text().trim(),
              club: $(tds[4])
                .find(".tooltip")
                .text()
                .trim()
                .replace(/\s+/g, " "),
              lastChrono: chrono.includes("AT") ? "AT" : chrono,
            };

            const validSwimmer = this.safeValidate(
              SwimmerInSeriesSchema,
              swimmer
            );
            if (validSwimmer) {
              selectedSeries.swimmers.push(validSwimmer);
            }
          }
        }
      });

      // Détecter si c'est un relais
      if (
        selectedSeries?.swimmers[1] &&
        selectedSeries.swimmers[1].lastChrono === ""
      ) {
        selectedSeries.type = "relay";
      }

      if (selectedSeries) {
        return this.safeValidate(SeriesSchema, selectedSeries);
      }

      return null;
    });
  }

  /**
   * Génère des données mock déterministes
   * @param {Object} params
   * @param {string} [params.race]
   * @param {string} [params.engagementId]
   * @param {number | null} [params.seriesNumber]
   * @param {number | null} [params.lane]
   * @returns {AllSeriesResponse}
   */
  generateMockData({ race, engagementId, seriesNumber, lane }) {
    const seed = Array.from(engagementId || "unknown").reduce(
      (acc, char) => acc + char.charCodeAt(0),
      0
    );

    const totalSeries = 3 + (seed % 4);
    const swimmerSeriesNumber = seriesNumber || (seed % totalSeries) + 1;
    const swimmerSeriesIndex = swimmerSeriesNumber - 1;

    const series = Array.from({ length: totalSeries }, (_, seriesIdx) => {
      const currentSeriesNumber = seriesIdx + 1;
      const isSwimmerSeries = currentSeriesNumber === swimmerSeriesNumber;
      const maxLanes = 8;

      const swimmers = Array.from({ length: maxLanes }, (_, laneIdx) => {
        const laneNumber = laneIdx + 1;
        const base = 28 + ((seed + seriesIdx * 11 + laneNumber * 7) % 40) / 10;
        const jitter = ((seed + seriesIdx * 5 + laneNumber * 13) % 15) / 100;
        const timeSeconds = base + jitter;

        const isSelected =
          isSwimmerSeries &&
          (lane != null ? laneNumber === lane : laneNumber === 5);

        const minutes = Math.floor(timeSeconds / 60);
        const rest = timeSeconds - minutes * 60;
        const formattedTime = `${minutes}:${rest.toFixed(2).padStart(5, "0")}`;

        return {
          lane: laneNumber,
          name: isSelected
            ? "Vous"
            : `Nageur ${String(seriesIdx * 8 + laneNumber).padStart(2, "0")}`,
          club: `Club ${String.fromCharCode(
            65 + ((seed + seriesIdx + laneNumber) % 6)
          )}`,
          entryTime: formattedTime,
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

  /**
   * Récupère toutes les séries pour une épreuve
   * @param {Object} params
   * @param {string} [params.competId]
   * @param {string} [params.race]
   * @param {string} [params.engagementId]
   * @param {string} [params.meta]
   * @param {string} [params.date]
   * @param {string} [params.time]
   * @returns {Promise<AllSeriesResponse>}
   */
  async getSeries({ competId, race, engagementId, meta, date, time }) {
    const { seriesNumber, lane } = this.parseRaceMeta(meta);

    // Si on a tous les paramètres nécessaires, essayer de scraper
    if (competId && date && time) {
      try {
        const params = await this.getProgram(competId, date, time);
        const series = await this.getSeriesFromFFN(competId, params, time);

        if (series) {
          return {
            race: series.race || race || "Épreuve",
            totalSeries: Number.parseInt(series.maxNb) || 1,
            swimmerSeriesIndex: (Number.parseInt(series.nb) || 1) - 1,
            type: series.type,
            series: [
              {
                seriesNumber: Number.parseInt(series.nb) || 1,
                isSwimmerSeries: true,
                swimmers: series.swimmers.map((s, idx) => ({
                  lane: idx + 1,
                  name: s.name,
                  club: s.club,
                  entryTime: s.lastChrono,
                  isSelected: idx === (lane ? lane - 1 : 4),
                })),
              },
            ],
          };
        }
      } catch (error) {
        console.warn(
          "Erreur lors du scraping des séries, utilisation du fallback:",
          error
        );
      }
    }

    // Fallback: générer des données mock
    return this.generateMockData({ race, engagementId, seriesNumber, lane });
  }
}

// Instance singleton
export const seriesScraper = new SeriesScraper();
