/**
 * Scraper pour les résultats des épreuves FFN
 * Source: https://www.liveffn.com/cgi-bin/resultats.php
 */
import { z } from "zod";
import { BaseScraper, NotFoundError } from "./base";

// ============================================================================
// SCHEMAS ZOD
// ============================================================================

export const SplitSchema = z.object({
  distance: z.string(),
  split: z.string().nullable(),
  cumulative: z.string().nullable(),
});

export const RaceResultEntrySchema = z.object({
  rank: z.number().int().nullable(),
  swimmerId: z.string().min(1),
  name: z.string().min(1),
  birthYear: z.string().nullable(),
  nationality: z.string().nullable(),
  club: z.string().nullable(),
  time: z.string().nullable(),
  points: z.number().int().nullable(),
  reaction: z.string().nullable(),
  qualification: z.string().nullable(),
  remark: z.string().nullable(),
  splits: z.array(SplitSchema).optional(),
});

export const RaceResultsSchema = z.object({
  raceId: z.string().min(1),
  competId: z.string().min(1),
  raceName: z.string().nullable(),
  raceDate: z.string().nullable(),
  results: z.array(RaceResultEntrySchema),
});

export const GetRaceResultsParamsSchema = z.object({
  competId: z.string().min(1, "L'ID de la compétition est requis"),
  raceId: z.string().min(1, "L'ID de l'épreuve est requis"),
});

export const GetSwimmerResultParamsSchema = z.object({
  competId: z.string().min(1, "L'ID de la compétition est requis"),
  raceId: z.string().min(1, "L'ID de l'épreuve est requis"),
  swimmerId: z.string().min(1, "L'ID du nageur est requis"),
});

// ============================================================================
// TYPES
// ============================================================================

/** @typedef {z.infer<typeof RaceResultEntrySchema>} RaceResultEntry */
/** @typedef {z.infer<typeof RaceResultsSchema>} RaceResults */

// ============================================================================
// URLs
// ============================================================================

const URL_FFN_RESULTS = (competId, raceId) =>
  `https://www.liveffn.com/cgi-bin/resultats.php?competition=${competId}&langue=fra&go=epreuve&epreuve=${raceId}`;

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Extrait l'ID du nageur depuis un href
 * @param {string} href
 * @returns {string | null}
 */
function extractSwimmerId(href) {
  try {
    const url = new URL(href, "https://www.liveffn.com");
    return url.searchParams.get("iuf");
  } catch {
    return null;
  }
}

/**
 * Parse le rang (ex: "1." → 1, "DSQ" → null)
 * @param {string} text
 * @returns {number | null}
 */
function parseRank(text) {
  const cleaned = (text || "").replace(/\.$/, "").trim();
  const num = Number.parseInt(cleaned, 10);
  return Number.isFinite(num) ? num : null;
}

/**
 * Parse les points (ex: "937 pts" → 937)
 * @param {string} text
 * @returns {number | null}
 */
function parsePoints(text) {
  const match = (text || "").match(/(\d+)\s*pts/i);
  if (!match) return null;
  const num = Number.parseInt(match[1], 10);
  return Number.isFinite(num) ? num : null;
}

/**
 * Parse les temps de passage depuis la table .split
 * @param {import('cheerio').Cheerio} $cell - La cellule contenant le temps et les splits
 * @param {import('cheerio').CheerioAPI} $ - Instance Cheerio
 * @returns {Array<{distance: string, split: string | null, cumulative: string | null}>}
 */
function parseSplits($cell, $) {
  const splits = [];
  const splitTable = $cell.find("table.split");
  
  if (!splitTable.length) return splits;

  splitTable.find("tr").each((_, tr) => {
    const $tr = $(tr);
    const distanceText = $tr.find("td.distance").text().trim();
    // Nettoyer "50 m :" → "50m"
    const distance = distanceText.replace(/\s+/g, "").replace(":", "").replace("m", " m").trim();
    
    if (!distance) return;

    // Le temps cumulé est dans td.split (format "00:28.34")
    const cumulative = $tr.find("td.split").text().trim() || null;
    
    // Le temps au tour (split) est dans td.relay (format "[00:28.34]")
    const relayText = $tr.find("td.relay").text().trim();
    const split = relayText ? relayText.replace(/[\[\]]/g, "").trim() || null : null;

    splits.push({ distance, split, cumulative });
  });

  return splits;
}

// ============================================================================
// RESULTS SCRAPER
// ============================================================================

export class ResultsScraper extends BaseScraper {
  constructor(options = {}) {
    super(options);
  }

  /**
   * Récupère tous les résultats d'une épreuve
   * @param {string} competId - ID de la compétition
   * @param {string} raceId - ID de l'épreuve
   * @returns {Promise<RaceResults>}
   */
  async getByRace(competId, raceId) {
    const cacheKey = this.getCacheKey("race-results", competId, raceId);

    return this.getOrFetch(cacheKey, async () => {
      const $ = await this.fetchCheerio(URL_FFN_RESULTS(competId, raceId));

      // Extraire le nom de l'épreuve et la date
      const epreuveCell = $("table.tableau td.epreuve").first();
      const epreuveText = epreuveCell.text().trim();
      
      // Parse "50 Dos Messieurs - Séries   (Lundi 22 Décembre 2025 - 10h52)"
      const dateMatch = epreuveText.match(/\(([^)]+)\)/);
      const raceDate = dateMatch ? dateMatch[1].trim() : null;
      const raceName = epreuveText.replace(/\([^)]+\)/, "").trim() || null;

      /** @type {RaceResultEntry[]} */
      const results = [];

      // Chaque ligne de résultat est un tr.survol
      $("table.tableau tr.survol").each((_, row) => {
        const $row = $(row);
        const cells = $row.find("td");

        // td.place pour le rang
        const rankText = $row.find("td.place").text();
        const rank = parseRank(rankText);

        // 2e td contient le lien nageur
        const swimmerLink = cells.eq(1).find("a").first();
        const swimmerHref = swimmerLink.attr("href") || "";
        const swimmerId = extractSwimmerId(swimmerHref);
        const name = swimmerLink.text().trim();

        if (!swimmerId || !name) return;

        // 3e td: année de naissance
        const birthYear = cells.eq(2).text().trim() || null;

        // 4e td: nationalité
        const nationality = cells.eq(3).text().trim() || null;

        // 5e td: club/structure
        const club = cells.eq(4).text().trim() || null;

        // td.temps_sans_tps_passage ou td.temps pour le temps
        const timeCell = $row.find("td.temps_sans_tps_passage, td.temps").first();
        // Le temps est le premier texte, avant le tooltip
        const timeLink = timeCell.find("a.tooltip").first();
        const time = timeLink.length 
          ? timeLink.contents().first().text().trim() || null
          : timeCell.text().trim() || null;

        // Parser les temps de passage depuis le tooltip
        const splits = parseSplits(timeCell, $);

        // td.reaction
        const reaction = $row.find("td.reaction").text().trim() || null;

        // td.points
        const pointsText = $row.find("td.points").text();
        const points = parsePoints(pointsText);

        // td.qualification
        const qualification = $row.find("td.qualification").text().trim() || null;

        // td.rem (remarques, DSQ, etc.)
        const remark = $row.find("td.rem").text().trim() || null;

        const entry = {
          rank,
          swimmerId,
          name,
          birthYear,
          nationality,
          club,
          time,
          points,
          reaction,
          qualification,
          remark,
          splits: splits.length > 0 ? splits : undefined,
        };

        const validated = this.safeValidate(RaceResultEntrySchema, entry);
        if (validated) {
          results.push(validated);
        }
      });

      return {
        raceId,
        competId,
        raceName,
        raceDate,
        results,
      };
    });
  }

  /**
   * Récupère le résultat d'un nageur spécifique dans une épreuve
   * @param {string} competId - ID de la compétition
   * @param {string} raceId - ID de l'épreuve
   * @param {string} swimmerId - ID du nageur
   * @returns {Promise<{race: RaceResults, swimmer: RaceResultEntry | null}>}
   */
  async getBySwimmer(competId, raceId, swimmerId) {
    const raceResults = await this.getByRace(competId, raceId);
    const swimmerResult = raceResults.results.find(
      (r) => r.swimmerId === swimmerId
    ) || null;

    return {
      race: raceResults,
      swimmer: swimmerResult,
    };
  }
}

// ============================================================================
// INSTANCE SINGLETON
// ============================================================================

export const resultsScraper = new ResultsScraper();
