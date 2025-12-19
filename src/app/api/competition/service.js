/**
 * Service pour les compétitions - Utilise le CompetitionScraper
 */
import { scrapers } from "@/lib/scrapers";

// Réexporter les erreurs pour la route
export {
  ScrapingError,
  ValidationError,
  NotFoundError,
} from "@/lib/scrapers";

/**
 * Récupère toutes les compétitions liveFFN
 */
export async function getCompetitions() {
  return scrapers.competition.getAll();
}

/**
 * Récupère une compétition par son ffnId
 * @param {string} id
 */
export async function getCompetitionById(id) {
  return scrapers.competition.getById(id);
}

/**
 * Recherche des compétitions par nom
 * @param {string} name
 */
export async function searchCompetitionsByName(name) {
  return scrapers.competition.searchByName(name);
}

/**
 * Récupère la première compétition (fallback)
 */
export async function getDefaultCompetition() {
  return scrapers.competition.getFirst();
}
