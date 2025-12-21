/**
 * Point d'entrée pour tous les scrapers
 * Exporte les instances singleton et les classes
 */

// Classes de base et erreurs
export {
  BaseScraper,
  ScrapingError,
  CompetitionClosedError,
  NotFoundError,
  ValidationError,
  cache,
  parseHours,
  isAfter,
  splitName,
} from "./base";

// Scrapers
export { ClubScraper, clubScraper, ClubSchema } from "./club";
export { SwimmerScraper, swimmerScraper, SwimmerSchema } from "./swimmer";
export { SeriesScraper, seriesScraper, SeriesSchema, SeriesParamsSchema } from "./series";
export { CompetitionScraper, competitionScraper, CompetitionSchema, LevelSchema } from "./competition";
export { QualificationScraper, qualificationScraper, QualificationTimeSchema, QualificationGridSchema, GenderSchema } from "./qualification";

// ============================================================================
// FACTORY POUR CRÉER DES SCRAPERS CONFIGURÉS
// ============================================================================

import { ClubScraper } from "./club";
import { SwimmerScraper } from "./swimmer";
import { SeriesScraper } from "./series";
import { CompetitionScraper } from "./competition";
import { QualificationScraper } from "./qualification";

/**
 * @typedef {Object} ScraperOptions
 * @property {boolean} [useCache=true]
 * @property {number} [cacheTTL]
 */

/**
 * Crée un ensemble de scrapers connectés entre eux
 * @param {ScraperOptions} [options]
 * @returns {{club: ClubScraper, swimmer: SwimmerScraper, series: SeriesScraper, competition: CompetitionScraper}}
 */
export function createScrapers(options = {}) {
  const club = new ClubScraper(options);
  const swimmer = new SwimmerScraper(options);
  const series = new SeriesScraper(options);
  const competition = new CompetitionScraper(options);
  const qualification = new QualificationScraper(options);

  // Connecter les dépendances
  swimmer.registerDependency("club", club);

  return { club, swimmer, series, competition, qualification };
}

// ============================================================================
// INSTANCE GLOBALE CONNECTÉE
// ============================================================================

/**
 * Scrapers pré-configurés avec toutes les dépendances
 */
export const scrapers = createScrapers();
