import { z } from "zod";
import { BaseScraper } from "./base";
import { capitalize } from "../utils";

// ============================================================================
// ZOD
// ============================================================================

const EngagementSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["session", "race"]),
  time: z.string().optional(), // "HH:MM"
  label: z.string().min(1),
  meta: z.string().optional(),
  date: z.string().optional(),
  raceId: z.string().optional(), // ID de l'épreuve FFN pour les résultats
});

const GetEngagementsParamsSchema = z.object({
  competId: z.string().min(1),
  swimmerId: z.string().min(1),
});

// ============================================================================
// URLS
// ============================================================================

const URL_FFN_SWIMMER_ENGAGEMENTS = (competId, swimmerId) =>
  `https://www.liveffn.com/cgi-bin/startlist.php?competition=${competId}&langue=fra&go=detail&action=participant&iuf=${swimmerId}`;

const URL_FFN_RACE_LIST = (competId) =>
  `https://www.liveffn.com/cgi-bin/resultats.php?competition=${competId}&langue=fra&go=epreuve`;

// ============================================================================
// HELPERS
// ============================================================================

function normalizeWhitespace(value) {
  return (value || "").replace(/\s+/g, " ").trim();
}

function parseHoraire(raw) {
  const text = normalizeWhitespace(raw);
  const match = text.match(/\b(\d{1,2})h(\d{2})\b/i);
  if (!match) return null;
  const hh = String(Number(match[1])).padStart(2, "0");
  const mm = String(Number(match[2])).padStart(2, "0");
  // IMPORTANT: le scraper des séries attend un format "HHhMM" (voir isAfter/parseHours)
  return `${hh}h${mm}`;
}

function periodFromTime(timeHHMM) {
  const match = String(timeHHMM || "").match(/\b(\d{1,2})[h:](\d{2})\b/i);
  if (!match) return "session";
  const hh = Number(match[1]);
  const mm = Number(match[2]);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return "session";
  const minutes = hh * 60 + mm;
  if (minutes < 12 * 60) return "matin";
  if (minutes < 18 * 60) return "après-midi";
  return "soir";
}

function abbreviateStroke(raw) {
  const t = normalizeWhitespace(raw).toLowerCase();
  if (t.includes("nage libre")) return "nl";
  if (t.includes("papillon")) return "pap";
  if (t.includes("brasse")) return "br";
  if (t.includes("dos")) return "dos";
  if (t.includes("4 nages") || t.includes("4n")) return "4n";
  return null;
}

/**
 * Convertit "50 Papillon Dames" -> "50 PAP"
 * @param {string} raw
 */
function formatRaceLabel(raw) {
  const text = normalizeWhitespace(raw);
  if (!text) return "";

  // Exemple: "50 Papillon Dames"
  const match = text.match(
    /^\s*(\d{2,4})\s+(.+?)\s+(dames|messieurs)\s*$/i,
  );
  if (match) {
    const distance = String(Number(match[1]));
    const strokeAbbr = abbreviateStroke(match[2]);
    if (strokeAbbr) return `${distance} ${strokeAbbr}`;
    return `${distance} ${normalizeWhitespace(match[2])}`;
  }

  // fallback: on enlève juste Dames/Messieurs si présents
  const cleaned = text.replace(/\b(dames|messieurs)\b/i, "").trim();
  return cleaned;
}

function makeId(parts) {
  return parts
    .filter(Boolean)
    .join(":")
    .replace(/[^a-zA-Z0-9:_-]+/g, "_");
}

/**
 * Normalise le nom d'une épreuve pour comparaison (minuscules, sans espaces multiples)
 * @param {string} raw
 */
function normalizeRaceName(raw) {
  return normalizeWhitespace(raw)
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

// ============================================================================
// SCRAPER
// ============================================================================

export class EngagementScraper extends BaseScraper {
  constructor(options = {}) {
    super(options);
  }

  /**
   * Récupère le mapping nom d'épreuve → raceId pour une compétition
   * @param {string} competId
   * @returns {Promise<Map<string, string>>}
   */
  async getRaceIdMapping(competId) {
    const cacheKey = this.getCacheKey("race-id-mapping", competId);

    return this.getOrFetch(cacheKey, async () => {
      const url = URL_FFN_RACE_LIST(competId);
      const $ = await this.fetchCheerio(url);

      /** @type {Map<string, string>} */
      const mapping = new Map();

      // Les épreuves sont dans des <option> avec value contenant "epreuve=XX"
      $("select.epreuve option").each((_, el) => {
        const $opt = $(el);
        const href = $opt.attr("value") || "";
        const label = normalizeWhitespace($opt.text());

        if (!href || !label) return;

        // Extraire epreuve=XX
        const match = href.match(/epreuve=(\d+)/);
        if (match) {
          const raceId = match[1];
          // Stocker avec le nom normalisé comme clé
          mapping.set(normalizeRaceName(label), raceId);
        }
      });

      return mapping;
    });
  }

  /**
   * @param {string} competId
   * @param {string} swimmerId
   * @returns {Promise<Engagement[]>}
   */
  async getAll(competId, swimmerId) {
    this.validate(GetEngagementsParamsSchema, { competId, swimmerId }, "Paramètres invalides");

    const cacheKey = this.getCacheKey("engagements", competId, swimmerId);

    return this.getOrFetch(cacheKey, async () => {
      // Récupérer le mapping des épreuves en parallèle
      const [raceIdMapping, $] = await Promise.all([
        this.getRaceIdMapping(competId),
        this.fetchCheerio(URL_FFN_SWIMMER_ENGAGEMENTS(competId, swimmerId)),
      ]);

      this.checkCompetitionOpen($);

      const rows = $("tr.survol");
      if (!rows.length) return [];

      /**
       * sessionKey = `${dateText}|${period}`
       * @type {Map<string, {dateText: string, dayName: string, period: string, time: string|null, races: Engagement[]}>}
       */
      const sessions = new Map();
      /** @type {string[]} */
      const sessionOrder = [];

      rows.each((_, el) => {
        const $row = $(el);

        const rawRace = normalizeWhitespace($row.find("td").first().text());
        const label = formatRaceLabel(rawRace);
        if (!label) return;

        const dateText = normalizeWhitespace($row.find(".startlist_date").text()); // "Jeudi 18 Décembre"
        const dayName = capitalize(normalizeWhitespace(dateText.split(" ")[0] || "Jour")); // "jeudi"
        const rawHoraire = normalizeWhitespace($row.find(".startlist_horaire").text()); // "08h55"
        const time = parseHoraire(rawHoraire);

        const period = time ? periodFromTime(time) : "session";
        const sessionKey = `${dateText}|${period}`;

        if (!sessions.has(sessionKey)) {
          sessions.set(sessionKey, {
            dateText,
            dayName,
            period,
            time: time || null,
            races: [],
          });
          sessionOrder.push(sessionKey);
        } else {
          // garder l'heure la plus tôt pour la session
          const s = sessions.get(sessionKey);
          if (s && time && (!s.time || time < s.time)) s.time = time;
        }

        const serie = normalizeWhitespace($row.find(".startlist_serie").text()); // "série 4"
        const couloir = normalizeWhitespace($row.find(".startlist_couloir").text()); // "couloir 8"
        const chrono = normalizeWhitespace($row.find(".temps").text()); // "00:33.74"

        const metaParts = [];
        if (serie) metaParts.push(serie.replace(/\s+/g, " ").trim());
        if (couloir) metaParts.push(couloir.replace(/\s+/g, " ").trim());
        if (chrono) metaParts.push(chrono);

        // Chercher le raceId correspondant au nom de l'épreuve
        const raceId = raceIdMapping.get(normalizeRaceName(rawRace)) || undefined;

        const race = {
          id: makeId(["race", competId, swimmerId, dateText, rawHoraire, label]),
          kind: "race",
          time: time || undefined,
          label,
          date: dateText || undefined,
          meta: metaParts.length ? metaParts.join(" • ") : undefined,
          raceId,
        };

        const validated = this.safeValidate(EngagementSchema, race);
        if (validated) {
          sessions.get(sessionKey)?.races.push(validated);
        }
      });

      /** @type {Engagement[]} */
      const out = [];

      for (const key of sessionOrder) {
        const s = sessions.get(key);
        if (!s) continue;

        const sessionLabel = `${s.dayName} ${s.period}`; // ex: "jeudi matin"
        const session = {
          id: makeId(["session", competId, swimmerId, s.dateText, s.period]),
          kind: "session",
          time: s.time || undefined,
          label: sessionLabel,
          meta: s.dateText || undefined,
          date: s.dateText || undefined,
        };

        const validatedSession = this.safeValidate(EngagementSchema, session);
        if (validatedSession) out.push(validatedSession);

        // tri des races de la session par heure si possible
        s.races.sort((a, b) => {
          if (!a.time && !b.time) return 0;
          if (!a.time) return 1;
          if (!b.time) return -1;
          return a.time.localeCompare(b.time);
        });

        out.push(...s.races);
      }

      return out;
    });
  }

  /**
   * @param {string} id
   * @returns {Promise<Engagement|null>}
   */
  async getById(id) {
    const str = String(id || "");
    // id encodé: "race:competId:swimmerId:...." ou "session:competId:swimmerId:...."
    const parts = str.split(":");
    if (parts.length < 3) return null;

    const competId = parts[1];
    const swimmerId = parts[2];
    if (!competId || !swimmerId) return null;

    const all = await this.getAll(competId, swimmerId);
    return all.find((e) => e.id === str) || null;
  }
}

export const engagementScraper = new EngagementScraper();

/**
 * API “simple” (compat avec le reste du code)
 * Entrée autorisée: competId + swimmerId
 */
export async function getEngagements(competId, swimmerId) {
  return engagementScraper.getAll(competId, swimmerId);
}

export async function getEngagementById(id) {
  return engagementScraper.getById(id);
}
