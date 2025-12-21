/**
 * Utilitaires de scraping pour la FFN
 */
import * as cheerio from "cheerio";
import { z } from "zod";

// ============================================================================
// SCHEMAS ZOD
// ============================================================================

export const ClubSchema = z.object({
  id: z.string().min(1, "L'ID du club est requis"),
  name: z.string().min(1, "Le nom du club est requis"),
});

export const SwimmerSchema = z.object({
  id: z.string().min(1, "L'ID du nageur est requis"),
  firstName: z.string().min(1, "Le prénom est requis"),
  lastName: z.string().min(1, "Le nom est requis"),
  gender: z.enum(["Male", "Female"]),
  clubName: z.string().optional(),
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

export const SeriesParamsSchema = z.object({
  cat_id: z.string(),
  epr_id: z.string(),
  typ_id: z.string(),
  num_epreuve: z.string(),
  alea: z.string().optional(),
  langue: z.string().optional(),
});

// ============================================================================
// TYPES (pour JSDoc)
// ============================================================================

/**
 * @typedef {z.infer<typeof ClubSchema>} Club
 * @typedef {z.infer<typeof SwimmerSchema>} Swimmer
 * @typedef {z.infer<typeof SwimmerInSeriesSchema>} SwimmerInSeries
 * @typedef {z.infer<typeof SeriesSchema>} Series
 * @typedef {z.infer<typeof SeriesParamsSchema>} SeriesParams
 */

// ============================================================================
// ERREURS PERSONNALISÉES
// ============================================================================

export class ScrapingError extends Error {
  /**
   * @param {string} message
   * @param {string} [code]
   * @param {number} [status]
   */
  constructor(message, code = "SCRAPING_ERROR", status = 500) {
    super(message);
    this.name = "ScrapingError";
    this.code = code;
    this.status = status;
  }
}

export class CompetitionClosedError extends ScrapingError {
  constructor() {
    super("La compétition n'est pas ouverte", "COMPETITION_CLOSED", 404);
  }
}

export class NotFoundError extends ScrapingError {
  /**
   * @param {string} resource
   */
  constructor(resource) {
    super(`${resource} non trouvé(e)`, "NOT_FOUND", 404);
  }
}

export class ValidationError extends ScrapingError {
  /**
   * @param {string} message
   * @param {z.ZodError} [zodError]
   */
  constructor(message, zodError) {
    super(message, "VALIDATION_ERROR", 400);
    this.zodError = zodError;
  }
}

// ============================================================================
// UTILITAIRES HTTP
// ============================================================================

const DEFAULT_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
};

/**
 * Récupère le contenu HTML d'une URL
 * @param {string} url
 * @returns {Promise<string>}
 */
export async function getContentFromUrl(url) {
  try {
    const response = await fetch(url, {
      headers: DEFAULT_HEADERS,
    });

    if (!response.ok) {
      if (response.status === 403) {
        throw new ScrapingError(
          `Accès refusé pour l'URL ${url}`,
          "ACCESS_DENIED",
          403
        );
      }
      throw new ScrapingError(
        `Échec de la requête (${response.status}): ${url}`,
        "HTTP_ERROR",
        response.status
      );
    }

    const text = await response.text();
    console.log(`Fetched content from ${url} (length: ${text.length})`);
    return text;
  } catch (error) {
    if (error instanceof ScrapingError) {
      throw error;
    }
    throw new ScrapingError(
      `Impossible de charger la page: ${url}`,
      "NETWORK_ERROR",
      503
    );
  }
}

/**
 * Récupère et parse le HTML d'une URL avec Cheerio
 * @param {string} url
 * @returns {Promise<cheerio.CheerioAPI>}
 */
export async function getCheerioFromUrl(url) {
  const html = await getContentFromUrl(url);
  return cheerio.load(html);
}

// ============================================================================
// UTILITAIRES TEMPS
// ============================================================================

/**
 * Parse une heure au format "HHhMM" en minutes
 * @param {string} hourStr
 * @returns {number}
 */
export function parseHours(hourStr) {
  const [hours, mins] = hourStr.split("h").map(Number);
  return hours * 60 + mins;
}

/**
 * Compare deux heures au format "HHhMM"
 * @param {string} h1
 * @param {string} h2
 * @returns {number} - Positif si h1 > h2, négatif si h1 < h2, 0 si égal
 */
export function isAfter(h1, h2) {
  return parseHours(h1) - parseHours(h2);
}

// ============================================================================
// UTILITAIRES NOMS
// ============================================================================

/**
 * Sépare un nom complet en prénom et nom de famille
 * @param {string} fullName
 * @returns {{firstName: string, lastName: string}}
 */
export function splitName(fullName) {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "" };
  }
  // Convention: le dernier mot est le nom, le reste est le prénom
  const lastName = parts.pop() || "";
  const firstName = parts.join(" ");
  return { firstName, lastName };
}

// ============================================================================
// URLs FFN
// ============================================================================

export const URL_FFN = "https://www.liveffn.com/cgi-bin/liste_live.php";

/**
 * URL de la page des participants d'une compétition
 * @param {string} competId
 */
export const URL_FFN_COMPET = (competId) =>
  `https://www.liveffn.com/cgi-bin/startlist.php?competition=${competId}&langue=fra&go=detail&action=participant`;

/**
 * URL de la page des clubs d'une compétition
 * @param {string} competId
 */
export const URL_FFN_CLUB = (competId) =>
  `https://www.liveffn.com/cgi-bin/startlist.php?competition=${competId}&langue=fra&go=detail&action=structure`;

/**
 * URL de la page d'engagement d'un nageur
 * @param {string} competId
 * @param {string} swimmerId
 */
export const URL_FFN_COMMITMENT = (competId, swimmerId) =>
  `${URL_FFN_COMPET(competId)}&iuf=${swimmerId}`;

/**
 * URL du programme d'une compétition
 * @param {string} competId
 */
export const URL_FFN_PROGRAM = (competId) =>
  `https://www.liveffn.com/cgi-bin/programme.php?competition=${competId}&langue=fra`;

/**
 * URL des résultats d'un nageur
 * @param {string} competId
 * @param {string} swimmerId
 */
export const URL_FFN_RESULT = (competId, swimmerId) =>
  `https://www.liveffn.com/cgi-bin/resultats.php?competition=${competId}&langue=fra&go=detail&action=participant&iuf=${swimmerId}`;

/**
 * URL d'une série
 * @param {string} competId
 * @param {SeriesParams} params
 */
export const URL_FFN_SERIES = (competId, params) => {
  const { cat_id, epr_id, typ_id, num_epreuve, langue = "fra", alea = "" } = params;
  return `https://www.liveffn.com/cgi-bin/programme.php?competition=${competId}&langue=${langue}&alea=${alea}&cat_id=${cat_id}&epr_id=${epr_id}&typ_id=${typ_id}&num_epreuve=${num_epreuve}`;
};

/**
 * URL Extranat pour rechercher un nageur
 * @param {string} firstName
 * @param {string} lastName
 */
export const URL_EXTRANAT_SWIMMER = (firstName, lastName) => {
  const year = new Date().getFullYear();
  const params = new URLSearchParams({
    go: "clt",
    idtrt: "ind",
    idrch: `${lastName} ${firstName}`,
    idsai: String(year),
  });
  return `https://ffn.extranat.fr/webffn/_recherche.php?${params.toString()}`;
};

/**
 * URL Extranat pour rechercher un club
 * @param {string} clubName
 */
export const URL_EXTRANAT_CLUB = (clubName) => {
  const year = new Date().getFullYear();
  const params = new URLSearchParams({
    go: "clt",
    idtrt: "str",
    idrch: clubName,
    idsai: String(year),
  });
  return `https://ffn.extranat.fr/webffn/_recherche.php?${params.toString()}`;
};
