/**
 * Scraper pour les nageurs FFN
 */
import { z } from "zod";
import {
  BaseScraper,
  NotFoundError,
  ValidationError,
  splitName,
} from "./base";
import { clubScraper } from "./club";

// ============================================================================
// SCHEMAS ZOD
// ============================================================================

export const SwimmerSchema = z.object({
  id: z.string().min(1, "L'ID du nageur est requis"),
  firstName: z.string().min(1, "Le prénom est requis"),
  lastName: z.string().min(1, "Le nom est requis"),
  gender: z.enum(["Male", "Female"]),
  clubId: z.string().optional(),
  clubName: z.string().optional(),
});

export const GetSwimmersParamsSchema = z.object({
  competId: z.string().min(1, "L'ID de la compétition est requis"),
});

export const SearchSwimmerParamsSchema = z
  .object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
  })
  .refine(
    (data) => data.firstName || data.lastName,
    "Au moins le prénom ou le nom est requis"
  );

// ============================================================================
// TYPES
// ============================================================================

/**
 * @typedef {z.infer<typeof SwimmerSchema>} Swimmer
 * @typedef {{link: string, id: string}} SwimmerLink
 */

// ============================================================================
// URLs
// ============================================================================

const URL_FFN_COMPET = (competId) =>
  `https://www.liveffn.com/cgi-bin/startlist.php?competition=${competId}&langue=fra&go=detail&action=participant`;

// ============================================================================
// SWIMMER SCRAPER
// ============================================================================

export class SwimmerScraper extends BaseScraper {
  constructor(options = {}) {
    super(options);
    // Enregistrer la dépendance au ClubScraper
    this.registerDependency("club", clubScraper);
  }

  /**
   * Extrait l'ID d'un lien de nageur
   * @param {string} href
   * @returns {string | null}
   */
  extractSwimmerId(href) {
    try {
      const url = new URL(href, "https://www.liveffn.com");
      return url.searchParams.get("iuf");
    } catch {
      return null;
    }
  }

  /**
   * Récupère les liens des nageurs d'une compétition
   * @param {string} competId
   * @returns {Promise<SwimmerLink[]>}
   */
  async getSwimmerLinks(competId) {
    const cacheKey = this.getCacheKey("swimmer-links", competId);

    return this.getOrFetch(cacheKey, async () => {
      const $ = await this.fetchCheerio(URL_FFN_COMPET(competId));
      this.checkCompetitionOpen($);

      /** @type {SwimmerLink[]} */
      const links = [];

      $(".nageur").each((_, element) => {
        const a = $(element).find("a").first();
        const href = a.attr("href") || "";
        const id = this.extractSwimmerId(href);

        if (href && id) {
          links.push({ link: href, id });
        }
      });

      return links;
    });
  }

  /**
   * Scrape les détails d'un nageur depuis sa page
   * @param {string} competId - Pour résoudre le club si nécessaire
   * @param {SwimmerLink} swimmerLink
   * @returns {Promise<Swimmer | null>}
   */
  async scrapeSwimmerDetails(competId, swimmerLink) {
    const cacheKey = this.getCacheKey("swimmer-detail", swimmerLink.id);

    try {
      return await this.getOrFetch(cacheKey, async () => {
        const $ = await this.fetchCheerio(swimmerLink.link);
        const tableau = $(".tableau");

        let td = tableau.find(".resStructureIndividu1");
        let gender = "Male";

        if (td.length === 0) {
          td = tableau.find(".resStructureIndividu2");
          gender = "Female";
        }

        if (td.length === 0) {
          return null;
        }

        const rawText = td.text().trim();
        const info = rawText.split("(");

        if (info.length < 2) {
          return null;
        }

        const fullName = splitName(info[0].trim());
        const clubPart = info[1].split(" - ");
        const clubName = clubPart[1]
          ? clubPart[1].split(":")[0].trim().toLowerCase()
          : "";

        // Essayer de résoudre le club ID via le ClubScraper
        let clubId;
        if (clubName) {
          try {
            const clubScraper = /** @type {import('./club').ClubScraper} */ (
              this.getDependency("club")
            );
            const club = await clubScraper.findByName(competId, clubName);
            clubId = club?.id;
          } catch {
            // Ignorer si on ne peut pas résoudre le club
          }
        }

        const swimmer = {
          id: swimmerLink.id,
          firstName: fullName.firstName,
          lastName: fullName.lastName,
          gender,
          clubId,
          clubName,
        };

        return this.safeValidate(SwimmerSchema, swimmer);
      });
    } catch (error) {
      console.warn(`Erreur en traitant le nageur ${swimmerLink.id}:`, error);
      return null;
    }
  }

  /**
   * Récupère tous les nageurs d'une compétition
   * @param {string} competId
   * @returns {Promise<Swimmer[]>}
   */
  async getAll(competId) {
    this.validate(GetSwimmersParamsSchema, { competId }, "CompetId invalide");

    const cacheKey = this.getCacheKey("swimmers", competId);

    return this.getOrFetch(cacheKey, async () => {
      const links = await this.getSwimmerLinks(competId);

      // Scraper par batch pour éviter de surcharger le serveur
      const BATCH_SIZE = 10;
      /** @type {Swimmer[]} */
      const swimmers = [];

      for (let i = 0; i < links.length; i += BATCH_SIZE) {
        const batch = links.slice(i, i + BATCH_SIZE);
        const results = await Promise.all(
          batch.map((link) => this.scrapeSwimmerDetails(competId, link))
        );
        swimmers.push(...results.filter((s) => s !== null));
      }

      return swimmers;
    });
  }

  /**
   * Récupère un nageur par son ID (licence)
   * @param {string} competId
   * @param {string} swimmerId
   * @returns {Promise<Swimmer>}
   */
  async getById(competId, swimmerId) {
    // D'abord essayer de le trouver dans le cache des nageurs
    const swimmers = await this.getAll(competId);
    const swimmer = swimmers.find((s) => s.id === swimmerId);

    if (!swimmer) {
      throw new NotFoundError("Nageur");
    }

    return swimmer;
  }

  /**
   * Recherche des nageurs par nom/prénom
   * @param {string} competId
   * @param {string} [firstName]
   * @param {string} [lastName]
   * @returns {Promise<Swimmer[]>}
   */
  async search(competId, firstName, lastName) {
    this.validate(
      SearchSwimmerParamsSchema,
      { firstName, lastName },
      "Critères de recherche invalides"
    );

    const swimmers = await this.getAll(competId);

    return swimmers.filter((s) => {
      const matchFirstName =
        !firstName ||
        s.firstName.toLowerCase().includes(firstName.toLowerCase());
      const matchLastName =
        !lastName || s.lastName.toLowerCase().includes(lastName.toLowerCase());
      return matchFirstName && matchLastName;
    });
  }

  /**
   * Récupère les nageurs d'un club
   * @param {string} competId
   * @param {string} clubId
   * @returns {Promise<Swimmer[]>}
   */
  async getByClub(competId, clubId) {
    const swimmers = await this.getAll(competId);
    return swimmers.filter((s) => s.clubId === clubId);
  }

  /**
   * Récupère le premier nageur (fallback)
   * @param {string} competId
   * @returns {Promise<Swimmer | null>}
   */
  async getFirst(competId) {
    try {
      const swimmers = await this.getAll(competId);
      return swimmers[0] || null;
    } catch {
      return null;
    }
  }
}

// Instance singleton
export const swimmerScraper = new SwimmerScraper();
