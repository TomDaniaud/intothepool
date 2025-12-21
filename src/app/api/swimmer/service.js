/**
 * Service pour les nageurs - Utilise le SwimmerScraper
 */
import { scrapers } from "@/lib/scrapers";

// Réexporter les erreurs pour la route
export {
  ScrapingError,
  ValidationError,
  NotFoundError,
  CompetitionClosedError,
} from "@/lib/scrapers";

/**
 * Récupère tous les nageurs d'une compétition
 * @param {string} competId
 */
export async function getSwimmers(competId) {
  return scrapers.swimmer.getAll(competId);
}

/**
 * Récupère un nageur par sa licence/ID
 * @param {string} competId
 * @param {string} license
 */
export async function getSwimmerByLicense(competId, license) {
  return scrapers.swimmer.getById(competId, license);
}

/**
 * Recherche des nageurs par nom/prénom
 * @param {string} competId
 * @param {string} [firstName]
 * @param {string} [lastName]
 */
export async function getSwimmerByName(competId, firstName, lastName) {
  return scrapers.swimmer.search(competId, firstName, lastName);
}

/**
 * Récupère les nageurs d'un club
 * @param {string} competId
 * @param {string} clubId
 */
export async function getSwimmersByClub(competId, clubId) {
  return scrapers.swimmer.getByClub(competId, clubId);
}

/**
 * Récupère le premier nageur (fallback)
 * @param {string} competId
 */
export async function getDefaultSwimmer(competId) {
  return scrapers.swimmer.getFirst(competId);
}
