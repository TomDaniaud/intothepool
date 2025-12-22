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
  race: z.string().min(1),
  gender: GenderSchema,
  age: z.number().int().min(10).max(99).optional(), // Optionnel pour les événements sans tranches d'âge
  birthYear: z.number().int().optional(), // Optionnel pour les événements sans tranches d'âge
  time: z.string().min(1), // Format "MM:SS.cc" ou "HH:MM:SS.cc"
  effectif: z.number().int().optional(),
});

export const QualificationGridSchema = z.object({
  season: z.string(),
  seasonYear: z.number().int().optional(),
  event: z.string(),
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

// Événement par défaut (OPEN d'été)
const DEFAULT_EVENT_IDCLT = 79;
const DEFAULT_EVENT_NAME = "OPEN d'été";

// URL de base pour découvrir les events et la saison
const URL_QUALIFICATION_BASE = "https://ffn.extranat.fr/webffn/nat_perfs.php?idact=nat&go=clt_tps";

// URL sans saison pour découvrir la dernière saison disponible
const URL_QUALIFICATION_LATEST = (idclt = DEFAULT_EVENT_IDCLT) =>
  `${URL_QUALIFICATION_BASE}&idclt=${idclt}`;

// Mapping des courses (normalisation)
const RACE_ALIASES = {
  "50 nage libre": "50 NL",
  "100 nage libre": "100 NL",
  "200 nage libre": "200 NL",
  "400 nage libre": "400 NL",
  "800 nage libre": "800 NL",
  "1500 nage libre": "1500 NL",
  "50 dos": "50 Dos",
  "100 dos": "100 Dos",
  "200 dos": "200 Dos",
  "50 brasse": "50 Brasse",
  "100 brasse": "100 Brasse",
  "200 brasse": "200 Brasse",
  "50 papillon": "50 Pap",
  "100 papillon": "100 Pap",
  "200 papillon": "200 Pap",
  "200 4 nages": "200 4N",
  "400 4 nages": "400 4N",
};

// ============================================================================
// URLs
// ============================================================================

/**
 * @param {number} season - Année de la saison (ex: 2025 pour saison 2024/2025)
 * @param {number} [idclt=79] - ID de l'événement (79 = OPEN d'été)
 */
const URL_QUALIFICATION_GRID = (season, idclt = DEFAULT_EVENT_IDCLT) =>
  `${URL_QUALIFICATION_BASE}&idsai=${season}&idclt=${idclt}`;

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Extrait la saison depuis le texte de la page
 * Ex: "Saison : 2024 / 2025" -> { seasonLabel: "2024 / 2025", seasonYear: 2025 }
 * @param {string} text
 */
function parseSeasonFromPage(text) {
  // Chercher "Saison : XXXX / YYYY" ou "Saison: XXXX / YYYY"
  const match = text.match(/Saison\s*:\s*(\d{4})\s*\/\s*(\d{4})/i);
  if (match) {
    return {
      seasonLabel: `${match[1]} / ${match[2]}`,
      seasonYear: Number.parseInt(match[2], 10),
    };
  }
  return null;
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
 * Normalise le nom d'une course
 * @param {string} race
 */
function normalizeRace(race) {
  return RACE_ALIASES[race.trim().toLowerCase()] || race.trim().toLowerCase();
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
   * Récupère toutes les qualifications pour la saison et l'événement donnés
   * @param {Object} [params]
   * @param {number} [params.season] - Saison (ex: 2025). Si non spécifiée, récupère la dernière disponible
   * @param {number} [params.idclt] - ID de l'événement. Si non spécifié, utilise l'événement par défaut (OPEN d'été)
   * @returns {Promise<QualificationGrid>}
   */
  async getAll({ season, idclt } = {}) {
    const eventIdclt = idclt ?? DEFAULT_EVENT_IDCLT;
    
    // Si pas de saison spécifiée, on fait une requête sans paramètre pour obtenir la dernière
    const url = season 
      ? URL_QUALIFICATION_GRID(season, eventIdclt) 
      : URL_QUALIFICATION_LATEST(eventIdclt);
    
    const cacheKey = this.getCacheKey("qualification-grid", `${eventIdclt}-${season || "latest"}`);

    return this.getOrFetch(cacheKey, async () => {
      const $ = await this.fetchCheerio(url);

      // Extraire la saison depuis la page
      const pageText = $.text();
      const parsedSeason = parseSeasonFromPage(pageText);
      const seasonLabel = parsedSeason?.seasonLabel || "Saison inconnue";
      const seasonYear = parsedSeason?.seasonYear || season;

      /** @type {QualificationTime[]} */
      const qualifications = [];

      // La page contient les données dans un ou plusieurs tableaux
      // Les sections Femmes et Hommes sont séparées par une ligne d'en-tête répétée
      const tables = $("table").filter((_, table) => {
        const text = $(table).text();
        // Tableaux avec catégories d'âge OU tableaux "Toutes catégories"
        return text.includes("Épreuves") && (text.includes("ans") || text.includes("Toutes catégories"));
      });
      
      // Parser chaque tableau trouvé
      tables.each((_, table) => {
        const $table = $(table);
        
        // Variables pour tracker la section courante
        /** @type {Gender} */
        let currentGender = "F"; // On commence par les femmes
        let headerCount = 0; // Compte le nombre de fois qu'on voit les en-têtes de catégories
        
        // Récupérer les headers pour les catégories d'âge (une seule fois)
        /** @type {Array<{age: number, birthYear: number, isPlus: boolean}>} */
        let ageColumns = [];
        
        // Parser toutes les lignes du tableau
        $table.find("tr").each((_, row) => {
          const $row = $(row);
          const cells = $row.find("th, td");
          
          if (cells.length < 2) return;
          
          const firstCellText = $(cells[0]).text().trim();
          
          // Détecter une ligne d'en-tête (catégories d'âge OU "Toutes catégories")
          const hasAgeHeaders = $(row).text().includes("ans") && $(row).text().includes("(");
          const hasAllCategoriesHeader = firstCellText === "Épreuves" || $(row).text().includes("Toutes catégories");
          
          if ((hasAgeHeaders || hasAllCategoriesHeader) && !firstCellText.match(/nage libre|dos|brasse|papillon|4 nages/i)) {
            // C'est une ligne d'en-tête
            headerCount++;;
            
            // Si c'est la 2ème fois qu'on voit les en-têtes, on passe aux hommes
            if (headerCount === 2) {
              currentGender = "M";
            }
            
            // Parser les catégories d'âge (refaire pour chaque section car les années peuvent différer)
            const newAgeColumns = [];
            cells.each((i, cell) => {
              const text = $(cell).text().trim();
              if (text.includes("ans") && text.includes("(")) {
                const parsed = parseAgeHeader(text);
                if (parsed) {
                  newAgeColumns.push(parsed);
                }
              }
            });
            
            if (newAgeColumns.length > 0) {
              ageColumns = newAgeColumns;
            }
            return;
          }
          
          // Vérifier que c'est bien une ligne d'épreuve (contient un nom de nage)
          const isRaceLine = /nage libre|dos|brasse|papillon|4 nages/i.test(firstCellText);
          if (!isRaceLine) return;
          
          const normalizedRace = normalizeRace(firstCellText);
          
          // Cas 1: Tableau AVEC colonnes d'âge
          if (ageColumns.length > 0) {
            // Chaque catégorie d'âge a 2 colonnes: Temps et Effectif
            let colIndex = 1;
            for (const ageData of ageColumns) {
              const timeCell = $(cells[colIndex]);
              const effectifCell = $(cells[colIndex + 1]);
              
              // Nettoyer le temps (supprimer espaces et caractères non imprimables)
              const rawTime = timeCell?.text() || "";
              const time = rawTime.replace(/\s+/g, "").trim();
              const effectif = Number.parseInt(effectifCell?.text()?.trim(), 10) || undefined;
              
              // Vérifier que le temps est au bon format (MM:SS.cc ou HH:MM:SS.cc)
              const isValidTime = /^\d{2}:\d{2}\.\d{2}$/.test(time) || /^\d{2}:\d{2}:\d{2}\.\d{2}$/.test(time);
              
              if (time && isValidTime) {
                const qual = {
                  race: normalizedRace,
                  gender: currentGender,
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
          } else {
            // Cas 2: Tableau SANS colonnes d'âge (ex: Championnats de France Elite)
            // Structure: Épreuve | Temps | Effectif
            const timeCell = $(cells[1]);
            const effectifCell = $(cells[2]);
            
            const rawTime = timeCell?.text() || "";
            const time = rawTime.replace(/\s+/g, "").trim();
            const effectif = Number.parseInt(effectifCell?.text()?.trim(), 10) || undefined;
            
            const isValidTime = /^\d{2}:\d{2}\.\d{2}$/.test(time) || /^\d{2}:\d{2}:\d{2}\.\d{2}$/.test(time);
            
            if (time && isValidTime) {
              const qual = {
                race: normalizedRace,
                gender: currentGender,
                // Pas d'âge ni birthYear pour cet événement
                time,
                effectif,
              };
              
              const validated = this.safeValidate(QualificationTimeSchema, qual);
              if (validated) {
                qualifications.push(validated);
              }
            }
          }
        });
      });

      // Trouver le nom de l'événement depuis la page (option selected)
      const selectedOption = $("select[name='idclt'] option[selected]").text().trim();
      const eventName = selectedOption || DEFAULT_EVENT_NAME;

      return {
        season: seasonLabel,
        seasonYear,
        event: eventName,
        idclt: eventIdclt,
        qualifications,
      };
    });
  }

  /**
   * Récupère le temps de qualification pour une course et un âge donnés
   * @param {Object} params
   * @param {string} params.race - Nom de la course (ex: "100 NL", "200 Dos")
   * @param {Gender} params.gender - "F" ou "M"
   * @param {number} params.age - Âge du nageur (14-19+)
   * @param {number} [params.birthYear] - Année de naissance (alternative à age)
   * @param {number} [params.season] - Saison
   * @param {number} [params.idclt] - ID de l'événement
   * @returns {Promise<QualificationTime>}
   */
  async getQualificationTime({ race, gender, birthYear, season, idclt }) {
    const grid = await this.getAll({ season, idclt });
    
    // Normaliser la course
    const normalizedRace = normalizeRace(race);
    
    // Trouver la qualification correspondante
    let qualification;
    
    // D'abord, vérifier si cet événement a des tranches d'âge
    const hasAgeCategories = grid.qualifications.some((q) => q.birthYear != null);
    
    if (!hasAgeCategories) {
      // Événement sans tranches d'âge: juste matcher race + gender
      qualification = grid.qualifications.find(
        (q) =>
          q.race.toLowerCase() === normalizedRace.toLowerCase() &&
          q.gender === gender
      );
    } else if (birthYear) {
      // Recherche par année de naissance exacte
      qualification = grid.qualifications.find(
        (q) =>
          q.race.toLowerCase() === normalizedRace.toLowerCase() &&
          q.gender === gender &&
          q.birthYear === birthYear
      );
      
      // Si pas trouvé, essayer avec birthYear - 1 (décalage possible)
      if (!qualification) {
        qualification = grid.qualifications.find(
          (q) =>
            q.race.toLowerCase() === normalizedRace.toLowerCase() &&
            q.gender === gender &&
            q.birthYear === birthYear - 1
        );
      }
      
      // Si pas trouvé et birthYear <= plus vieille catégorie, prendre la catégorie 19+
      if (!qualification) {
        const oldest = grid.qualifications.find(
          (q) =>
            q.race.toLowerCase() === normalizedRace.toLowerCase() &&
            q.gender === gender &&
            q.age >= 19
        );
        if (oldest && oldest.birthYear && birthYear <= oldest.birthYear) {
          qualification = oldest;
        }
      }
    }
    
    if (!qualification) {
      throw new NotFoundError(
        `Temps de qualification pour ${race} (${gender}${birthYear ? `, né(e) en ${birthYear}` : ""})`
      );
    }
    
    return qualification;
  }

  /**
   * Récupère toutes les qualifications pour un âge/année de naissance donné
   * @param {Object} params
   * @param {Gender} params.gender - "F" ou "M"
   * @param {number} [params.birthYear] - Année de naissance
   * @param {number} [params.season] - Saison
   * @param {number} [params.idclt] - ID de l'événement
   * @returns {Promise<QualificationTime[]>}
   */
  async getQualificationsForAge({ gender, birthYear, season, idclt }) {
    const grid = await this.getAll({ season, idclt });
    
    // D'abord, vérifier si cet événement a des tranches d'âge
    const hasAgeCategories = grid.qualifications.some((q) => q.birthYear != null);
    
    // Événement sans tranches d'âge: retourner toutes les qualifs pour ce genre
    if (!hasAgeCategories) {
      return grid.qualifications.filter((q) => q.gender === gender);
    }
    
    let results = [];
    
    if (birthYear) {
      results = grid.qualifications.filter(
        (q) => q.gender === gender && q.birthYear === birthYear
      );
      
      // Si pas trouvé, chercher la catégorie 19+
      if (results.length === 0) {
        const oldest = grid.qualifications.find(
          (q) => q.gender === gender && q.age >= 19
        );
        if (oldest && oldest.birthYear && birthYear <= oldest.birthYear) {
          results = grid.qualifications.filter(
            (q) => q.gender === gender && q.age >= 19
          );
        }
      }
    }
    
    return results;
  }

  /**
   * Liste toutes les courses disponibles
   * @param {Object} [params]
   * @param {number} [params.season]
   * @param {number} [params.idclt]
   * @returns {Promise<string[]>}
   */
  async getRaces({ season, idclt } = {}) {
    const grid = await this.getAll({ season, idclt });
    const races = [...new Set(grid.qualifications.map((q) => q.race))];
    return races.sort();
  }

  /**
   * Fetch et retourne la liste des événements disponibles depuis le site FFN
   * @returns {Promise<Array<{id: string, idclt: number, name: string, url: string}>>}
   */
  async getAvailableEvents() {
    const cacheKey = this.getCacheKey("available-events");
    
    return this.getOrFetch(cacheKey, async () => {
      const $ = await this.fetchCheerio(URL_QUALIFICATION_BASE);
      
      /** @type {Array<{id: string, idclt: number, name: string, url: string}>} */
      const events = [];
      
      // Parser le <select name="idclt">
      $("select[name='idclt'] option").each((_, option) => {
        const $option = $(option);
        const value = $option.attr("value") || "";
        const name = $option.text().trim();
        
        // Ignorer l'option "---" (pas de idclt)
        if (!name || name === "---") return;
        
        // Extraire idclt depuis l'URL: "nat_perfs.php?idact=nat&go=clt_tps&idsai=2025&idclt=78"
        const idcltMatch = value.match(/idclt=(\d+)/);
        if (!idcltMatch) return;
        
        const idclt = Number.parseInt(idcltMatch[1], 10);
        // Créer un id slug à partir du nom
        const id = name
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "") // Supprimer accents
          .replace(/[^a-z0-9]+/g, "-") // Remplacer caractères spéciaux par -
          .replace(/^-|-$/g, ""); // Supprimer - au début/fin
        
        // Construire l'URL complète vers la grille extranat
        const url = `https://ffn.extranat.fr/webffn/${value}`;
        
        events.push({ id, idclt, name, url });
      });
      
      return events;
    });
  }
}

// Instance singleton
export const qualificationScraper = new QualificationScraper();
