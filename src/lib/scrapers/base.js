/**
 * Classe de base pour tous les scrapers FFN
 */
import * as cheerio from "cheerio";
import { z } from "zod";

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
// CACHE EN MÉMOIRE
// ============================================================================

/**
 * Cache simple en mémoire avec TTL
 */
class MemoryCache {
  constructor() {
    /** @type {Map<string, {data: any, expiry: number}>} */
    this.cache = new Map();
    this.defaultTTL = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * @param {string} key
   * @returns {any | null}
   */
  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }

  /**
   * @param {string} key
   * @param {any} data
   * @param {number} [ttl]
   */
  set(key, data, ttl = this.defaultTTL) {
    this.cache.set(key, {
      data,
      expiry: Date.now() + ttl,
    });
  }

  /**
   * @param {string} key
   */
  delete(key) {
    this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }
}

// Instance globale du cache
export const cache = new MemoryCache();

// ============================================================================
// CLASSE DE BASE SCRAPER
// ============================================================================

const DEFAULT_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
};

/**
 * Classe de base pour tous les scrapers
 * @template T - Type des données scrapées
 */
export class BaseScraper {
  /**
   * @param {Object} options
   * @param {boolean} [options.useCache=true] - Utiliser le cache
   * @param {number} [options.cacheTTL] - Durée de vie du cache en ms
   */
  constructor(options = {}) {
    this.useCache = options.useCache ?? true;
    this.cacheTTL = options.cacheTTL ?? 5 * 60 * 1000;
    /** @type {Map<string, BaseScraper>} */
    this.dependencies = new Map();
  }

  /**
   * Enregistre une dépendance vers un autre scraper
   * @param {string} name
   * @param {BaseScraper} scraper
   */
  registerDependency(name, scraper) {
    this.dependencies.set(name, scraper);
  }

  /**
   * Récupère une dépendance
   * @param {string} name
   * @returns {BaseScraper}
   */
  getDependency(name) {
    const dep = this.dependencies.get(name);
    if (!dep) {
      throw new Error(`Dépendance "${name}" non enregistrée`);
    }
    return dep;
  }

  /**
   * Génère une clé de cache unique
   * @param {string} prefix
   * @param  {...any} args
   * @returns {string}
   */
  getCacheKey(prefix, ...args) {
    return `${prefix}:${args.map((a) => JSON.stringify(a)).join(":")}`;
  }

  /**
   * Récupère depuis le cache ou exécute la fonction
   * @template R
   * @param {string} cacheKey
   * @param {() => Promise<R>} fetchFn
   * @returns {Promise<R>}
   */
  async getOrFetch(cacheKey, fetchFn) {
    if (this.useCache) {
      const cached = cache.get(cacheKey);
      if (cached !== null) {
        console.log(` CACHE key found for <${cacheKey}> -- using cached ressources ressource`);
        return cached;
      }
    }

    const result = await fetchFn();

    if (this.useCache) {
      cache.set(cacheKey, result, this.cacheTTL);
    }

    return result;
  }

  /**
   * Récupère le contenu HTML d'une URL
   * @param {string} url
   * @returns {Promise<string>}
   */
  async fetchHtml(url) {
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

      // Affiche le status code en vert dans le terminal
      console.log(` GET ${url} \x1b[32m${response.status}\x1b[0m -- external fetch`);

      return await response.text();
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
  async fetchCheerio(url) {

    const html = await this.fetchHtml(url);
    return cheerio.load(html);
  }

  /**
   * Vérifie si la compétition est fermée
   * @param {cheerio.CheerioAPI} $
   * @throws {CompetitionClosedError}
   */
  checkCompetitionOpen($) {
    if ($("#boxAlert").length > 0) {
      throw new CompetitionClosedError();
    }
  }

  /**
   * Valide des données avec un schéma Zod
   * @template S
   * @param {z.ZodSchema<S>} schema
   * @param {unknown} data
   * @param {string} [errorMessage]
   * @returns {S}
   */
  validate(schema, data, errorMessage = "Données invalides") {
    const result = schema.safeParse(data);
    if (!result.success) {
      throw new ValidationError(errorMessage, result.error);
    }
    return result.data;
  }

  /**
   * Valide des données avec un schéma Zod (sans throw)
   * @template S
   * @param {z.ZodSchema<S>} schema
   * @param {unknown} data
   * @returns {S | null}
   */
  safeValidate(schema, data) {
    const result = schema.safeParse(data);
    return result.success ? result.data : null;
  }
}

// ============================================================================
// UTILITAIRES
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
 * @returns {number}
 */
export function isAfter(h1, h2) {
  return parseHours(h1) - parseHours(h2);
}

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
  const lastName = parts.pop() || "";
  const firstName = parts.join(" ");
  return { firstName, lastName };
}
