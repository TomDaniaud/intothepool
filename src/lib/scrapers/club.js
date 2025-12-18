/**
 * Scraper pour les clubs FFN
 */
import { z } from "zod";
import {
  BaseScraper,
  NotFoundError,
  ValidationError,
} from "./base";

// ============================================================================
// SCHEMAS ZOD
// ============================================================================

export const ClubSchema = z.object({
  id: z.string().min(1, "L'ID du club est requis"),
  name: z.string().min(1, "Le nom du club est requis"),
});

export const GetClubsParamsSchema = z.object({
  competId: z.string().min(1, "L'ID de la compétition est requis"),
});

// ============================================================================
// TYPES
// ============================================================================

/**
 * @typedef {z.infer<typeof ClubSchema>} Club
 */

// ============================================================================
// URLs
// ============================================================================

const URL_FFN_CLUB = (competId) =>
  `https://www.liveffn.com/cgi-bin/startlist.php?competition=${competId}&langue=fra&go=detail&action=structure`;

// ============================================================================
// CLUB SCRAPER
// ============================================================================

export class ClubScraper extends BaseScraper {
  constructor(options = {}) {
    super(options);
  }

  /**
   * Récupère tous les clubs d'une compétition
   * @param {string} competId
   * @returns {Promise<Club[]>}
   */
  async getAll(competId) {
    // Validation
    this.validate(GetClubsParamsSchema, { competId }, "CompetId invalide");

    const cacheKey = this.getCacheKey("clubs", competId);

    return this.getOrFetch(cacheKey, async () => {
      const $ = await this.fetchCheerio(URL_FFN_CLUB(competId));
      this.checkCompetitionOpen($);

      /** @type {Map<string, Club>} */
      const clubMap = new Map();

      $(".resStructure").each((_, element) => {
        const a = $(element).find("a").first();
        const name = a.text().trim().toLowerCase();
        const link = a.attr("href") || "";

        try {
          const id = new URL(link, "https://www.liveffn.com").searchParams.get(
            "structure"
          );

          if (id && name) {
            const club = this.safeValidate(ClubSchema, { id, name });
            if (club) {
              clubMap.set(id, club);
            }
          }
        } catch {
          // Ignorer les URLs malformées
        }
      });

      return Array.from(clubMap.values());
    });
  }

  /**
   * Récupère un club par son ID
   * @param {string} competId
   * @param {string} clubId
   * @returns {Promise<Club>}
   */
  async getById(competId, clubId) {
    const clubs = await this.getAll(competId);
    const club = clubs.find((c) => c.id === clubId);

    if (!club) {
      throw new NotFoundError("Club");
    }

    return club;
  }

  /**
   * Recherche un club par nom
   * @param {string} competId
   * @param {string} name
   * @returns {Promise<Club | null>}
   */
  async findByName(competId, name) {
    const clubs = await this.getAll(competId);
    const normalizedName = name.toLowerCase().trim();

    return (
      clubs.find(
        (c) =>
          c.name.toLowerCase() === normalizedName ||
          c.name.toLowerCase().includes(normalizedName)
      ) || null
    );
  }

  /**
   * Récupère le premier club (fallback)
   * @param {string} competId
   * @returns {Promise<Club | null>}
   */
  async getFirst(competId) {
    try {
      const clubs = await this.getAll(competId);
      return clubs[0] || null;
    } catch {
      return null;
    }
  }
}

// Instance singleton
export const clubScraper = new ClubScraper();
