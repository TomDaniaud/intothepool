/**
 * Service pour les clubs - Scraping depuis la FFN
 */
import { z } from "zod";
import {
  getCheerioFromUrl,
  URL_FFN_CLUB,
  ClubSchema,
  ScrapingError,
  CompetitionClosedError,
  NotFoundError,
  ValidationError,
} from "@/lib/scraping";

// ============================================================================
// SCHEMAS DE VALIDATION
// ============================================================================

export const GetClubsParamsSchema = z.object({
  competId: z.string().min(1, "L'ID de la compétition est requis"),
});

export const GetClubByCodeParamsSchema = z.object({
  code: z.string().min(1, "Le code du club est requis"),
});

// ============================================================================
// TYPES
// ============================================================================

/**
 * @typedef {z.infer<typeof ClubSchema>} Club
 */

// ============================================================================
// FONCTIONS DE SCRAPING
// ============================================================================

/**
 * Récupère tous les clubs d'une compétition
 * @param {string} competId - ID de la compétition FFN
 * @returns {Promise<Club[]>}
 * @throws {CompetitionClosedError} Si la compétition n'est pas ouverte
 * @throws {ScrapingError} Si le scraping échoue
 */
export async function getClubs(competId) {
  // Validation des paramètres
  const validation = GetClubsParamsSchema.safeParse({ competId });
  if (!validation.success) {
    throw new ValidationError(
      "Paramètres invalides",
      validation.error
    );
  }

  const $ = await getCheerioFromUrl(URL_FFN_CLUB(competId));

  // Vérifier si la compétition est fermée
  if ($("#boxAlert").length > 0) {
    throw new CompetitionClosedError();
  }

  // Map pour éviter les doublons
  /** @type {Map<string, Club>} */
  const clubMap = new Map();

  $(".resStructure").each((_, element) => {
    const a = $(element).find("a").first();
    const name = a.text().trim().toLowerCase();
    const link = a.attr("href") || "";

    try {
      const id = new URL(link, "https://www.liveffn.com").searchParams.get(
        "structure"
      );

      if (id && name) {
        // Valider le club avant de l'ajouter
        const clubResult = ClubSchema.safeParse({ id, name });
        if (clubResult.success) {
          clubMap.set(id, clubResult.data);
        }
      }
    } catch {
      // Ignorer les URLs malformées
    }
  });

  return Array.from(clubMap.values());
}

/**
 * Récupère un club par son code depuis une compétition
 * @param {string} competId - ID de la compétition
 * @param {string} code - Code du club
 * @returns {Promise<Club>}
 * @throws {NotFoundError} Si le club n'est pas trouvé
 */
export async function getClubByCode(competId, code) {
  // Validation des paramètres
  const validation = GetClubByCodeParamsSchema.safeParse({ code });
  if (!validation.success) {
    throw new ValidationError("Code du club invalide", validation.error);
  }

  const clubs = await getClubs(competId);
  const club = clubs.find((c) => c.id === code);

  if (!club) {
    throw new NotFoundError("Club");
  }

  return club;
}

/**
 * Récupère le premier club (pour les cas par défaut)
 * @param {string} competId - ID de la compétition
 * @returns {Promise<Club | null>}
 */
export async function getDefaultClub(competId) {
  try {
    const clubs = await getClubs(competId);
    return clubs[0] || null;
  } catch {
    return null;
  }
}
