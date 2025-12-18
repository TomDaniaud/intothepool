/**
 * Service pour les séries - Scraping depuis la FFN
 */
import { z } from "zod";
import {
  getCheerioFromUrl,
  URL_FFN_PROGRAM,
  URL_FFN_SERIES,
  SeriesSchema,
  SeriesParamsSchema,
  SwimmerInSeriesSchema,
  ScrapingError,
  NotFoundError,
  ValidationError,
  isAfter,
} from "@/lib/scraping";

// ============================================================================
// SCHEMAS DE VALIDATION
// ============================================================================

export const GetProgramParamsSchema = z.object({
  competId: z.string().min(1, "L'ID de la compétition est requis"),
  date: z.string().min(1, "La date est requise"),
  time: z.string().min(1, "L'heure est requise"),
});

export const GetSeriesParamsSchema = z.object({
  competId: z.string().min(1, "L'ID de la compétition est requis"),
  params: SeriesParamsSchema,
  startTime: z.string().min(1, "L'heure de départ est requise"),
});

export const GetSeriesQuerySchema = z.object({
  competId: z.string().min(1, "L'ID de la compétition est requis"),
  race: z.string().optional(),
  engagementId: z.string().optional(),
  meta: z.string().optional(),
  date: z.string().optional(),
  time: z.string().optional(),
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
 * @typedef {Object} AllSeriesResponse
 * @property {string} race
 * @property {number} totalSeries
 * @property {number} swimmerSeriesIndex
 * @property {"simple"|"relay"} type
 * @property {Series[]} series
 */

// ============================================================================
// FONCTIONS UTILITAIRES
// ============================================================================

function parseRaceMeta(meta) {
  if (!meta) return { seriesNumber: null, lane: null };

  const seriesMatch = meta.match(/s[ée]rie\s*(\d+)/i);
  const laneMatch = meta.match(/couloir\s*(\d+)/i);

  return {
    seriesNumber: seriesMatch ? Number.parseInt(seriesMatch[1], 10) : null,
    lane: laneMatch ? Number.parseInt(laneMatch[1], 10) : null,
  };
}

// ============================================================================
// FONCTIONS DE SCRAPING
// ============================================================================

/**
 * Récupère les paramètres d'une série depuis le programme
 * @param {string} competId - ID de la compétition
 * @param {string} date - Date au format affiché sur le site
 * @param {string} time - Heure au format "HHhMM"
 * @returns {Promise<SeriesParams>}
 * @throws {NotFoundError} Si la course n'est pas trouvée
 * @throws {ScrapingError} Si le scraping échoue
 */
export async function getProgram(competId, date, time) {
  // Validation des paramètres
  const validation = GetProgramParamsSchema.safeParse({ competId, date, time });
  if (!validation.success) {
    throw new ValidationError("Paramètres invalides", validation.error);
  }

  const $ = await getCheerioFromUrl(URL_FFN_PROGRAM(competId));
  let onclick;

  const div = $(`h6:contains("${date}")`).next("div");
  const reunion = div.find("ul.reunion");

  $(reunion)
    .find("li.survol")
    .each((_, el) => {
      const raceTime = $(el).find(".time").text().trim();
      if (isAfter(time, raceTime) < 0) {
        return false; // break
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
        `Paramètre "${key}" manquant dans les données de la course`,
        "PARSING_ERROR",
        500
      );
    }
  }

  // Valider avec Zod
  const paramsValidation = SeriesParamsSchema.safeParse(result);
  if (!paramsValidation.success) {
    throw new ValidationError(
      "Paramètres de série invalides",
      paramsValidation.error
    );
  }

  return paramsValidation.data;
}

/**
 * Récupère les détails d'une série
 * @param {string} competId - ID de la compétition
 * @param {SeriesParams} params - Paramètres de la série
 * @param {string} startTime - Heure de départ
 * @returns {Promise<Series | null>}
 * @throws {ScrapingError} Si le scraping échoue
 */
export async function getSeriesFromFFN(competId, params, startTime) {
  // Validation des paramètres
  const validation = GetSeriesParamsSchema.safeParse({
    competId,
    params,
    startTime,
  });
  if (!validation.success) {
    throw new ValidationError("Paramètres invalides", validation.error);
  }

  const url = URL_FFN_SERIES(competId, params);
  const $ = await getCheerioFromUrl(url);

  /** @type {Series | null} */
  let selectedSeries = null;
  let inRange = false;

  $("tr").each((_, el) => {
    const row = $(el);

    // Ligne de titre de série
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
        return false; // break
      }
    }

    // Ligne de nageur
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

        // Valider le nageur
        const swimmerResult = SwimmerInSeriesSchema.safeParse(swimmer);
        if (swimmerResult.success) {
          selectedSeries.swimmers.push(swimmerResult.data);
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

  // Valider la série complète
  if (selectedSeries) {
    const seriesResult = SeriesSchema.safeParse(selectedSeries);
    if (!seriesResult.success) {
      console.warn("Série invalide:", seriesResult.error.flatten());
      return null;
    }
    return seriesResult.data;
  }

  return null;
}

/**
 * Récupère toutes les séries pour une épreuve (avec fallback mock si pas de données)
 * @param {Object} params
 * @param {string} [params.competId]
 * @param {string} [params.race]
 * @param {string} [params.engagementId]
 * @param {string} [params.meta]
 * @param {string} [params.date]
 * @param {string} [params.time]
 * @returns {Promise<AllSeriesResponse>}
 */
export async function getSeries({
  competId,
  race,
  engagementId,
  meta,
  date,
  time,
}) {
  const { seriesNumber, lane } = parseRaceMeta(meta);

  // Si on a tous les paramètres nécessaires, essayer de scraper
  if (competId && date && time) {
    try {
      const params = await getProgram(competId, date, time);
      const series = await getSeriesFromFFN(competId, params, time);

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
      console.warn("Erreur lors du scraping des séries, utilisation du fallback:", error);
    }
  }

  // Fallback: générer des données déterministes basées sur engagementId
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
