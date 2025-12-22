/**
 * Scraper pour les nageurs FFN
 */
import { z } from "zod";
import { BaseScraper, NotFoundError } from "./base";

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
  birthYear: z.string().min(1, "L'année de naissance est requise"),
});

export const SwimmerIndexEntrySchema = z.object({
  id: z.string().min(1, "L'ID du nageur est requis"),
  firstName: z.string().min(1, "Le prénom est requis"),
  lastName: z.string().min(1, "Le nom est requis"),
  link: z.string().min(1, "Le lien du nageur est requis"),
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
    "Au moins le prénom ou le nom est requis",
  );

// ============================================================================
// TYPES
// ============================================================================

/**
 * @typedef {z.infer<typeof SwimmerSchema>} Swimmer
 * @typedef {{link: string, id: string}} SwimmerLink
 * @typedef {z.infer<typeof SwimmerIndexEntrySchema>} SwimmerIndexEntry
 */

// ============================================================================
// URLs
// ============================================================================

const URL_FFN_COMPET = (competId) =>
  `https://www.liveffn.com/cgi-bin/startlist.php?competition=${competId}&langue=fra&go=detail&action=participant`;

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Normalise une chaîne pour comparaison (accents/espaces/casse)
 * @param {string} value
 */
function normalizeForCompare(value) {
  return (value || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Parse les noms affichés sur liveffn (souvent "NOM PRENOM")
 * @param {string} raw
 * @returns {{firstName: string, lastName: string}}
 */
function splitLiveFfnDisplayedName(raw) {
  const cleaned = (raw || "").replace(/\s+/g, " ").trim();
  if (!cleaned) return { firstName: "", lastName: "" };

  // Format fréquent: "NOM, Prenom"
  if (cleaned.includes(",")) {
    const [last, first] = cleaned.split(",").map((s) => s.trim());
    return { firstName: first || "", lastName: last || "" };
  }

  const parts = cleaned.split(" ").filter(Boolean);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "" };
  }

  // Heuristique: les premiers tokens en MAJUSCULES sont le nom.
  let lastNameEndIndex = 0;
  for (let i = 0; i < parts.length; i += 1) {
    const token = parts[i];
    if (token === token.toUpperCase()) {
      lastNameEndIndex = i + 1;
    } else {
      break;
    }
  }

  // Si on n'a détecté aucune majuscule au début, fallback: dernier mot = nom (ancienne logique)
  if (lastNameEndIndex === 0) {
    const lastName = parts.pop() || "";
    const firstName = parts.join(" ");
    return { firstName, lastName };
  }

  const lastName = parts.slice(0, lastNameEndIndex).join(" ");
  const firstName = parts.slice(lastNameEndIndex).join(" ");
  return { firstName, lastName };
}

// ============================================================================
// SWIMMER SCRAPER
// ============================================================================

export class SwimmerScraper extends BaseScraper {
  constructor(options = {}) {
    super(options);
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
   * Récupère l'index des nageurs d'une compétition (1 seule requête)
   * @param {string} competId
   * @returns {Promise<SwimmerIndexEntry[]>}
   */
  async getSwimmerIndex(competId) {
    const cacheKey = this.getCacheKey("swimmer-index", competId);

    return this.getOrFetch(cacheKey, async () => {
      const $ = await this.fetchCheerio(URL_FFN_COMPET(competId));
      this.checkCompetitionOpen($);

      /** @type {SwimmerIndexEntry[]} */
      const entries = [];

      $(".nageur").each((_, element) => {
        const a = $(element).find("a").first();
        const href = a.attr("href") || "";
        const label = a.text().trim();
        const id = this.extractSwimmerId(href);

        if (href && id) {
          const name = splitLiveFfnDisplayedName(label);
          const candidate = {
            id,
            firstName: name.firstName,
            lastName: name.lastName,
            link: href,
          };

          const validated = this.safeValidate(
            SwimmerIndexEntrySchema,
            candidate,
          );
          if (validated) {
            entries.push(validated);
          }
        }
      });

      return entries;
    });
  }

  /**
   * Scrape les détails d'un nageur depuis sa page
   * @param {string} competId - Pour résoudre le club si nécessaire
   * @param {SwimmerLink} swimmerLink
   * @returns {Promise<Swimmer | null>}
   */
  async scrapeSwimmerDetails(_competId, swimmerLink) {
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

        const fullName = splitLiveFfnDisplayedName(info[0].trim());
        const clubPart = info[1].split(" - ");
        const birthYear = clubPart[0].split(")")[0].trim();
        const clubName = clubPart[1].trim().toLowerCase();
        console.log(clubName);

        const swimmer = {
          id: swimmerLink.id,
          firstName: fullName.firstName,
          lastName: fullName.lastName,
          gender,
          clubName,
          birthYear,
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
      // IMPORTANT: budget réseau. 1 requête max ici.
      // On renvoie uniquement l'index des nageurs (id + nom/prénom + lien).
      return this.getSwimmerIndex(competId);
    });
  }

  /**
   * Récupère un nageur par son ID (licence)
   * @param {string} competId
   * @param {string} swimmerId
   * @returns {Promise<Swimmer>}
   */
  async getById(competId, swimmerId) {
    // 1 requête: accès direct à la page du nageur via iuf.
    const link = `${URL_FFN_COMPET(competId)}&iuf=${encodeURIComponent(swimmerId)}`;
    const swimmer = await this.scrapeSwimmerDetails(competId, {
      id: swimmerId,
      link,
    });

    if (!swimmer) throw new NotFoundError("Nageur");
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
      "Critères de recherche invalides",
    );

    // 1 requête: index complet des nageurs
    const index = await this.getSwimmerIndex(competId);

    const wantedFirst = normalizeForCompare(firstName || "");
    const wantedLast = normalizeForCompare(lastName || "");

    const matches = index.filter((s) => {
      const candidateFirst = normalizeForCompare(s.firstName);
      const candidateLast = normalizeForCompare(s.lastName);

      const matchFirstName =
        !wantedFirst || candidateFirst.includes(wantedFirst);
      const matchLastName = !wantedLast || candidateLast.includes(wantedLast);
      return matchFirstName && matchLastName;
    });

    // Si on a un identifiant précis (prénom+nom) et un match unique, on fait le 2e fetch.
    if (firstName && lastName && matches.length === 1) {
      const swimmer = await this.scrapeSwimmerDetails(competId, {
        id: matches[0].id,
        link: matches[0].link,
      });
      return swimmer ? [swimmer] : [];
    }

    // Sinon, rester sur 1 requête: renvoyer les candidats de l'index.
    return matches;
  }

  /**
   * Récupère les nageurs d'un club
   * @param {string} competId
   * @param {string} clubId
   * @returns {Promise<Swimmer[]>}
   */
  async getByClub(_competId, clubId) {
    // Le mode "budget réseau" ne résout pas clubId (évite des requêtes supplémentaires).
    // On garde la signature mais la fonctionnalité est indisponible sans détails.
    this.validate(z.object({ clubId: z.string().min(1) }), { clubId });
    return [];
  }

  /**
   * Récupère le premier nageur (fallback)
   * @param {string} competId
   * @returns {Promise<Swimmer | null>}
   */
  async getFirst(competId) {
    try {
      const swimmers = await this.getSwimmerIndex(competId);
      // getFirst doit renvoyer un Swimmer détaillé si possible (2 requêtes max)
      const first = swimmers[0];
      if (!first) return null;
      return await this.getById(competId, first.id);
    } catch {
      return null;
    }
  }
}

// Instance singleton
export const swimmerScraper = new SwimmerScraper();
