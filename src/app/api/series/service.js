/**
 * Service pour les séries - Utilise le SeriesScraper
 */
import { scrapers } from "@/lib/scrapers";

// Réexporter les erreurs pour la route
export {
  ScrapingError,
  ValidationError,
  NotFoundError,
} from "@/lib/scrapers";

/**
 * Récupère toutes les séries pour une épreuve
 * @param {Object} params
 * @param {string} [params.competId]
 * @param {string} [params.race]
 * @param {string} [params.engagementId]
 * @param {string} [params.meta]
 * @param {string} [params.date]
 * @param {string} [params.time]
 */
export async function getSeries(params) {
  return scrapers.series.getSeries(params);
}

/**
 * Récupère les paramètres d'une série depuis le programme
 * @param {string} competId
 * @param {string} date
 * @param {string} time
 */
export async function getProgram(competId, date, time) {
  return scrapers.series.getProgram(competId, date, time);
}

