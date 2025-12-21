/**
 * Scraper pour les temps de qualification France Open (été)
 * Source: https://ffn.extranat.fr/webffn/nat_perfs.php?idact=nat&go=clt_tps&idsai=YYYY&idclt=79
 * 
 * idclt=79 correspond aux France Open d'été
 */
import { z } from "zod";
import { BaseScraper, NotFoundError } from "./base";

// ============================================================================
// SCHEMAS ZOD
// ============================================================================

export const GenderSchema = z.enum(["F", "M"]);

export const QualificationTimeSchema = z.object({
  event: z.string().min(1),
  gender: GenderSchema,
  age: z.number().int().min(14).max(99),
  birthYear: z.number().int(),
  time: z.string().min(1), // Format "MM:SS.cc" ou "HH:MM:SS.cc"
  effectif: z.number().int().optional(),
});

export const QualificationGridSchema = z.object({
  season: z.string(),
  competition: z.string(),
  qualifications: z.array(QualificationTimeSchema),
});

// ============================================================================
// TYPES
// ============================================================================

/** @typedef {z.infer<typeof QualificationTimeSchema>} QualificationTime */
/** @typedef {z.infer<typeof QualificationGridSchema>} QualificationGrid */
/** @typedef {"F" | "M"} Gender */

// ============================================================================
// CONSTANTES
// ============================================================================

// France Open d'été = idclt 79
const FRANCE_OPEN_ETE_ID = 79;

// Mapping des épreuves (normalisation)
const EVENT_ALIASES = {
  "50 Nage Libre": "50 NL",
  "100 Nage Libre": "100 NL",
  "200 Nage Libre": "200 NL",
  "400 Nage Libre": "400 NL",
  "800 Nage Libre": "800 NL",
  "1500 Nage Libre": "1500 NL",
  "50 Dos": "50 Dos",
  "100 Dos": "100 Dos",
  "200 Dos": "200 Dos",
  "50 Brasse": "50 Brasse",
  "100 Brasse": "100 Brasse",
  "200 Brasse": "200 Brasse",
  "50 Papillon": "50 Pap",
  "100 Papillon": "100 Pap",
  "200 Papillon": "200 Pap",
  "200 4 Nages": "200 4N",
  "400 4 Nages": "400 4N",
};

// ============================================================================
// URLs
// ============================================================================

/**
 * @param {number} season - Année de la saison (ex: 2025 pour saison 2024/2025)
 * @param {number} [competId=79] - ID de la compétition (79 = France Open été)
 */
const URL_QUALIFICATION_GRID = (season, competId = FRANCE_OPEN_ETE_ID) =>
  `https://ffn.extranat.fr/webffn/nat_perfs.php?idact=nat&go=clt_tps&idsai=${season}&idclt=${competId}`;

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Calcule la saison en cours (ex: en décembre 2024, c'est la saison 2025)
 * La saison FFN commence en septembre
 */
function getCurrentSeason() {
  const now = new Date();
  const month = now.getMonth(); // 0-11
  const year = now.getFullYear();
  // Si on est entre janvier et août, on est dans la saison de l'année en cours
  // Si on est entre septembre et décembre, on est dans la saison de l'année suivante
  return month >= 8 ? year + 1 : year;
}

/**
 * Extrait l'année de naissance depuis le header de colonne
 * Ex: "14 ans (2011)" -> { age: 14, birthYear: 2011 }
 * @param {string} header
 */
function parseAgeHeader(header) {
  const match = header.match(/(\d+)\s*ans.*\((\d{4})/);
  if (!match) {
    // "19 ans et plus (2006 et avant)"
    const match2 = header.match(/(\d+)\s*ans\s*et\s*plus.*\((\d{4})/);
    if (match2) {
      return { age: Number.parseInt(match2[1], 10), birthYear: Number.parseInt(match2[2], 10), isPlus: true };
    }
    return null;
  }
  return { age: Number.parseInt(match[1], 10), birthYear: Number.parseInt(match[2], 10), isPlus: false };
}

/**
 * Normalise le nom d'une épreuve
 * @param {string} event
 */
function normalizeEvent(event) {
  return EVENT_ALIASES[event.trim()] || event.trim();
}

// ============================================================================
// QUALIFICATION SCRAPER
// ============================================================================

export class QualificationScraper extends BaseScraper {
  constructor(options = {}) {
    super({
      ...options,
      cacheTTL: options.cacheTTL ?? 60 * 60 * 1000, // 1 heure (les grilles changent rarement)
    });
  }

  /**
   * Récupère toutes les qualifications pour la saison en cours
   * @param {number} [season] - Saison (ex: 2025)
   * @returns {Promise<QualificationGrid>}
   */
  async getAll(season = getCurrentSeason()) {
    const cacheKey = this.getCacheKey("qualification-grid", season);

    return this.getOrFetch(cacheKey, async () => {
      const $ = await this.fetchCheerio(URL_QUALIFICATION_GRID(season));

      /** @type {QualificationTime[]} */
      const qualifications = [];

      // La page contient 2 tableaux : Femmes puis Hommes
      const tables = $("table");
      
      /** @type {Gender[]} */
      const genders = ["F", "M"];
      
      tables.each((tableIndex, table) => {
        if (tableIndex >= 2) return; // On ne prend que les 2 premiers tableaux
        
        const gender = genders[tableIndex];
        const $table = $(table);
        
        // Récupérer les headers pour les catégories d'âge
        /** @type {Array<{age: number, birthYear: number, isPlus: boolean}>} */
        const ageColumns = [];
        
        $table.find("tr").first().find("th, td").each((i, cell) => {
          if (i === 0) return; // Skip "Épreuves"
          const text = $(cell).text().trim();
          const parsed = parseAgeHeader(text);
          if (parsed) {
            ageColumns.push(parsed);
          }
        });

        // Parser chaque ligne d'épreuve
        $table.find("tr").each((rowIndex, row) => {
          if (rowIndex === 0) return; // Skip header
          
          const $row = $(row);
          const cells = $row.find("td");
          
          if (cells.length === 0) return;
          
          const eventName = $(cells[0]).text().trim();
          if (!eventName || eventName === "Épreuves") return;
          
          const normalizedEvent = normalizeEvent(eventName);
          
          // Chaque catégorie d'âge a 2 colonnes: Temps et Effectif
          let colIndex = 1;
          for (const ageData of ageColumns) {
            const timeCell = $(cells[colIndex]);
            const effectifCell = $(cells[colIndex + 1]);
            
            const time = timeCell?.text()?.trim();
            const effectif = Number.parseInt(effectifCell?.text()?.trim(), 10) || undefined;
            
            if (time && time !== "" && !time.includes("Temps")) {
              const qual = {
                event: normalizedEvent,
                gender,
                age: ageData.age,
                birthYear: ageData.birthYear,
                time,
                effectif,
              };
              
              const validated = this.safeValidate(QualificationTimeSchema, qual);
              if (validated) {
                qualifications.push(validated);
              }
            }
            
            colIndex += 2;
          }
        });
      });

      return {
        season: `${season - 1} / ${season}`,
        competition: "France Open (été)",
        qualifications,
      };
    });
  }

  /**
   * Récupère le temps de qualification pour une épreuve et un âge donnés
   * @param {Object} params
   * @param {string} params.event - Nom de l'épreuve (ex: "100 NL", "200 Dos")
   * @param {Gender} params.gender - "F" ou "M"
   * @param {number} params.age - Âge du nageur (14-19+)
   * @param {number} [params.birthYear] - Année de naissance (alternative à age)
   * @param {number} [params.season] - Saison
   * @returns {Promise<QualificationTime>}
   */
  async getQualificationTime({ event, gender, age, birthYear, season }) {
    const grid = await this.getAll(season);
    
    // Normaliser l'épreuve
    const normalizedEvent = normalizeEvent(event);
    
    // Trouver la qualification correspondante
    let qualification;
    
    if (birthYear) {
      // Recherche par année de naissance
      qualification = grid.qualifications.find(
        (q) =>
          q.event.toLowerCase() === normalizedEvent.toLowerCase() &&
          q.gender === gender &&
          q.birthYear === birthYear
      );
      
      // Si pas trouvé et birthYear <= plus vieille catégorie, prendre la catégorie 19+
      if (!qualification) {
        const oldest = grid.qualifications.find(
          (q) =>
            q.event.toLowerCase() === normalizedEvent.toLowerCase() &&
            q.gender === gender &&
            q.age >= 19
        );
        if (oldest && birthYear <= oldest.birthYear) {
          qualification = oldest;
        }
      }
    } else if (age) {
      // Recherche par âge
      const targetAge = Math.min(age, 19); // 19+ regroupé
      qualification = grid.qualifications.find(
        (q) =>
          q.event.toLowerCase() === normalizedEvent.toLowerCase() &&
          q.gender === gender &&
          (q.age === targetAge || (targetAge >= 19 && q.age >= 19))
      );
    }
    
    if (!qualification) {
      throw new NotFoundError(
        `Temps de qualification pour ${event} (${gender}, ${age ? `${age} ans` : `né(e) en ${birthYear}`})`
      );
    }
    
    return qualification;
  }

  /**
   * Récupère toutes les qualifications pour un âge/année de naissance donné
   * @param {Object} params
   * @param {Gender} params.gender - "F" ou "M"
   * @param {number} [params.age] - Âge du nageur
   * @param {number} [params.birthYear] - Année de naissance
   * @param {number} [params.season] - Saison
   * @returns {Promise<QualificationTime[]>}
   */
  async getQualificationsForAge({ gender, age, birthYear, season }) {
    const grid = await this.getAll(season);
    
    let results;
    
    if (birthYear) {
      results = grid.qualifications.filter(
        (q) => q.gender === gender && q.birthYear === birthYear
      );
      
      // Si pas trouvé, chercher la catégorie 19+
      if (results.length === 0) {
        const oldest = grid.qualifications.find(
          (q) => q.gender === gender && q.age >= 19
        );
        if (oldest && birthYear <= oldest.birthYear) {
          results = grid.qualifications.filter(
            (q) => q.gender === gender && q.age >= 19
          );
        }
      }
    } else if (age) {
      const targetAge = Math.min(age, 19);
      results = grid.qualifications.filter(
        (q) =>
          q.gender === gender &&
          (q.age === targetAge || (targetAge >= 19 && q.age >= 19))
      );
    } else {
      results = [];
    }
    
    return results;
  }

  /**
   * Liste toutes les épreuves disponibles
   * @param {number} [season]
   * @returns {Promise<string[]>}
   */
  async getEvents(season) {
    const grid = await this.getAll(season);
    const events = [...new Set(grid.qualifications.map((q) => q.event))];
    return events.sort();
  }
}

// Instance singleton
export const qualificationScraper = new QualificationScraper();
