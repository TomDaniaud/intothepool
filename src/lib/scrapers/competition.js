/**
 * Scraper pour les compétitions FFN
 * Source: https://www.liveffn.com/cgi-bin/liste_live.php
 */
import { z } from "zod";
import { BaseScraper, NotFoundError } from "./base";

// ============================================================================
// SCHEMAS ZOD
// ============================================================================

export const LevelSchema = z.enum([
  "NATIONAL",
  "REGIONAL",
  "DEPARTEMENTAL",
  "INTERNATIONAL",
]);

export const CompetitionSchema = z.object({
  level: LevelSchema,
  // Identifiant FFN (stable)
  ffnId: z.string().min(1),
  name: z.string().min(1),
  poolsize: z.number().int(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().nullable(),
  location: z.string().nullable(),
  image: z.string().nullable(),
  nbEntries: z.number().int(),
  nbSwimmers: z.number().int(),
});

export const SearchCompetitionsParamsSchema = z.object({
  name: z.string().min(1, "Le nom de la compétition est requis"),
});

// ============================================================================
// TYPES
// ============================================================================

/** @typedef {z.infer<typeof CompetitionSchema>} Competition */

// ============================================================================
// URLs
// ============================================================================

const URL_FFN_COMPETITIONS = () => "https://www.liveffn.com/cgi-bin/liste_live.php";

// ============================================================================
// HELPERS
// ============================================================================

/**
 * @param {string} text
 */
function extractPoolSize(text) {
  const match = text.match(/(\d+)\s*m/i);
  if (!match) return null;
  const parsed = Number.parseInt(match[1], 10);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Extrait toutes les dates au format dd/mm/yyyy depuis un texte
 * @param {string} info
 * @returns {Date[]}
 */
function extractDates(info) {
  const dateRegex = /\b(\d{2})\/(\d{2})\/(\d{4})\b/g;
  /** @type {Date[]} */
  const dates = [];

  let match;
  while ((match = dateRegex.exec(info)) !== null) {
    const [, day, month, year] = match;
    const dateObj = new Date(Number.parseInt(year, 10), Number.parseInt(month, 10) - 1, Number.parseInt(day, 10));
    if (!Number.isNaN(dateObj.getTime())) {
      dates.push(dateObj);
    }
  }

  return dates;
}

/**
 * Extrait "x engagements / y nageurs" depuis un texte
 * @param {string} info
 * @returns {{ entries: number; swimmers: number } | null}
 */
function extractStats(info) {
  const statsRegex = /(\d+)\s*engagements\s*\/\s*(\d+)\s*nageurs/i;
  const match = info.match(statsRegex);
  if (!match) return null;

  return {
    entries: Number.parseInt(match[1], 10),
    swimmers: Number.parseInt(match[2], 10),
  };
}

/**
 * @param {string} href
 */
function extractCompetitionIdFromHref(href) {
  try {
    const url = new URL(href, "https://www.liveffn.com");
    return url.searchParams.get("competition");
  } catch {
    return null;
  }
}

// ============================================================================
// competition SCRAPER
// ============================================================================

export class CompetitionScraper extends BaseScraper {
  constructor(options = {}) {
    super(options);
  }

  /**
   * Récupère toutes les compétitions liveFFN (National/Régional/Départemental)
   * @returns {Promise<Competition[]>}
   */
  async getAll() {
    const cacheKey = this.getCacheKey("competitions");

    return this.getOrFetch(cacheKey, async () => {
      const $ = await this.fetchCheerio(URL_FFN_COMPETITIONS());

      /** @type {Competition[]} */
      const competitions = [];

      const levels = [
        { level: "NATIONAL", key: "N" },
        { level: "REGIONAL", key: "R" },
        { level: "DEPARTEMENTAL", key: "D" },
      ];

      for (const { level, key } of levels) {
        // Les pages liveffn utilisent généralement ces classes (cf. anciens scrapers)
        const containers = $(
          `.containeur_niveau${key}, .containeur_niveau${key.toLowerCase()}`
        );

        containers.each((_, element) => {
          const root = $(element);

          const locationText = root
            .find(`.competition_lieu${key}, .competition_lieu${key.toLowerCase()}`)
            .text()
            .trim();
          const location = locationText ? locationText.toLowerCase() : null;

          const name = root
            .find(`.competition_nom${key}, .competition_nom${key.toLowerCase()}`)
            .text()
            .trim();

          const info = root
            .find(`.date${key}, .date${key.toLowerCase()}`)
            .text()
            .trim();

          const poolsizeText = root
            .find(`.bassin${key}, .bassin${key.toLowerCase()}`)
            .text()
            .trim();

          const imageSrc = root.find(".visuel_img img").attr("src") || null;
          const href = root.find("a").attr("href") || "";

          const ffnId = extractCompetitionIdFromHref(href) || href.split("=").pop() || "";
          const dates = extractDates(info);
          const stats = extractStats(info);
          const poolsize = extractPoolSize(poolsizeText);

          // Si un élément clé manque, on ignore l'entrée (mais on reste robuste)
          if (!ffnId || !name || !poolsize || !dates[0]) {
            return;
          }

          const image = imageSrc
            ? imageSrc.startsWith("http")
              ? imageSrc
              : `https://www.liveffn.com${imageSrc}`
            : null;

          const candidate = {
            level,
            ffnId,
            name,
            poolsize,
            startDate: dates[0],
            endDate: dates[1] || null,
            location,
            image,
            nbEntries: stats?.entries || 0,
            nbSwimmers: stats?.swimmers || 0,
          };

          const validated = this.safeValidate(CompetitionSchema, candidate);
          if (validated) {
            competitions.push(validated);
          }
        });
      }

      // Fallback ultra-robuste si les classes spécifiques ne sont pas présentes
      if (competitions.length === 0) {
        const seen = new Set();

        $("a[href*='competition=']").each((_, a) => {
          const href = $(a).attr("href") || "";
          const ffnId = extractCompetitionIdFromHref(href);
          const name = $(a).text().trim();
          if (!ffnId || !name || seen.has(ffnId)) return;

          seen.add(ffnId);
          const surroundingText = $(a).parent().text();
          const poolsize = extractPoolSize(surroundingText) || 25;
          const dates = extractDates(surroundingText);
          const stats = extractStats(surroundingText);

          const candidate = {
            level: "NATIONAL",
            ffnId,
            name,
            poolsize,
            startDate: dates[0] || new Date(0),
            endDate: dates[1] || null,
            location: null,
            image: null,
            nbEntries: stats?.entries || 0,
            nbSwimmers: stats?.swimmers || 0,
          };

          const validated = this.safeValidate(CompetitionSchema, candidate);
          if (validated) {
            competitions.push(validated);
          }
        });
      }

      return competitions;
    });
  }

  /**
   * Récupère une compétition par son ffnId
   * @param {string} competitionId
   * @returns {Promise<Competition>}
   */
  async getById(competitionId) {
    const competitions = await this.getAll();
    const competition = competitions.find((c) => c.ffnId === competitionId);

    if (!competition) {
      throw new NotFoundError("Compétition");
    }

    return competition;
  }

  /**
   * Recherche des compétitions par nom
   * @param {string} name
   * @returns {Promise<Competition[]>}
   */
  async searchByName(name) {
    this.validate(SearchCompetitionsParamsSchema, { name });
    const competitions = await this.getAll();
    const normalizedName = name.toLowerCase().trim();

    return competitions.filter((c) =>
      c.name.toLowerCase().includes(normalizedName)
    );
  }

  /**
   * Récupère la première compétition (fallback)
   * @returns {Promise<Competition | null>}
   */
  async getFirst() {
    try {
      const competitions = await this.getAll();
      return competitions[0] || null;
    } catch {
      return null;
    }
  }
}

// Instance singleton
export const competitionScraper = new CompetitionScraper();
