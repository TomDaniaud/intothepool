/**
 * Service pour les clubs - Utilise le ClubScraper
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
 * Récupère tous les clubs d'une compétition
 * @param {string} competId
 */
export async function getClubs(competId) {
  return scrapers.club.getAll(competId);
}

/**
 * Récupère un club par son code/ID
 * @param {string} competId
 * @param {string} code
 */
export async function getClubByCode(competId, code) {
  return scrapers.club.getById(competId, code);
}

/**
 * Récupère le premier club (fallback)
 * @param {string} competId
 */
export async function getDefaultClub(competId) {
  return scrapers.club.getFirst(competId);
}
