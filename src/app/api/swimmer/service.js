/**
 * Service pour les nageurs - Scraping depuis la FFN
 */
import { z } from "zod";
import {
  getCheerioFromUrl,
  URL_FFN_COMPET,
  SwimmerSchema,
  ScrapingError,
  CompetitionClosedError,
  NotFoundError,
  ValidationError,
  splitName,
} from "@/lib/scraping";

// ============================================================================
// SCHEMAS DE VALIDATION
// ============================================================================

export const GetSwimmersParamsSchema = z.object({
  competId: z.string().min(1, "L'ID de la compétition est requis"),
});

export const GetSwimmerByLicenseParamsSchema = z.object({
  license: z.string().min(1, "La licence est requise"),
});

export const GetSwimmerByNameParamsSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
}).refine(
  (data) => data.firstName || data.lastName,
  "Au moins le prénom ou le nom est requis"
);

// ============================================================================
// TYPES
// ============================================================================

/**
 * @typedef {z.infer<typeof SwimmerSchema>} Swimmer
 * @typedef {{link: string, id: string}} SwimmerLink
 */

// ============================================================================
// FONCTIONS UTILITAIRES
// ============================================================================

/**
 * Extrait l'ID d'un lien de nageur
 * @param {string} href
 * @returns {string | null}
 */
function extractSwimmerId(href) {
  try {
    const url = new URL(href, "https://www.liveffn.com");
    return url.searchParams.get("iuf");
  } catch {
    return null;
  }
}

// ============================================================================
// FONCTIONS DE SCRAPING
// ============================================================================

/**
 * Récupère les liens des nageurs d'une compétition
 * @param {string} competId
 * @returns {Promise<SwimmerLink[]>}
 */
async function getSwimmerLinks(competId) {
  const $ = await getCheerioFromUrl(URL_FFN_COMPET(competId));

  // Vérifier si la compétition est fermée
  if ($("#boxAlert").length > 0) {
    throw new CompetitionClosedError();
  }

  /** @type {SwimmerLink[]} */
  const swimmerLinks = [];

  $(".nageur").each((_, element) => {
    const a = $(element).find("a").first();
    const href = a.attr("href") || "";
    const id = extractSwimmerId(href);

    if (href && id) {
      swimmerLinks.push({ link: href, id });
    }
  });

  return swimmerLinks;
}

/**
 * Récupère les détails d'un nageur depuis sa page
 * @param {SwimmerLink} swimmerLink
 * @returns {Promise<Swimmer | null>}
 */
async function scrapeSwimmerDetails(swimmerLink) {
  try {
    const $ = await getCheerioFromUrl(swimmerLink.link);
    const tableau = $(".tableau");

    let td = tableau.find(".resStructureIndividu1");
    let gender = "Male";

    if (td.length === 0) {
      td = tableau.find(".resStructureIndividu2");
      gender = "Female";
    }

    if (td.length === 0) {
      return null;
    }

    const rawText = td.text().trim();
    const info = rawText.split("(");

    if (info.length < 2) {
      return null;
    }

    const fullName = splitName(info[0].trim());
    const clubPart = info[1].split(" - ");
    const clubName = clubPart[1]
      ? clubPart[1].split(":")[0].trim().toLowerCase()
      : "";

    const swimmer = {
      id: swimmerLink.id,
      firstName: fullName.firstName,
      lastName: fullName.lastName,
      gender,
      clubName,
    };

    // Valider le nageur
    const result = SwimmerSchema.safeParse(swimmer);
    if (!result.success) {
      console.warn(
        `Nageur invalide (${swimmerLink.id}):`,
        result.error.flatten()
      );
      return null;
    }

    return result.data;
  } catch (error) {
    console.warn(`Erreur en traitant le nageur ${swimmerLink.id}:`, error);
    return null;
  }
}

/**
 * Récupère tous les nageurs d'une compétition
 * @param {string} competId - ID de la compétition FFN
 * @returns {Promise<Swimmer[]>}
 * @throws {CompetitionClosedError} Si la compétition n'est pas ouverte
 * @throws {ScrapingError} Si le scraping échoue
 */
export async function getSwimmers(competId) {
  // Validation des paramètres
  const validation = GetSwimmersParamsSchema.safeParse({ competId });
  if (!validation.success) {
    throw new ValidationError("Paramètres invalides", validation.error);
  }

  const links = await getSwimmerLinks(competId);

  // Scraper les détails de chaque nageur (en parallèle avec limite)
  const BATCH_SIZE = 10;
  /** @type {Swimmer[]} */
  const swimmers = [];

  for (let i = 0; i < links.length; i += BATCH_SIZE) {
    const batch = links.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map((link) => scrapeSwimmerDetails(link))
    );
    swimmers.push(...results.filter((s) => s !== null));
  }

  return swimmers;
}

/**
 * Récupère un nageur par sa licence (ID FFN)
 * @param {string} competId - ID de la compétition
 * @param {string} license - Licence/ID du nageur
 * @returns {Promise<Swimmer>}
 * @throws {NotFoundError} Si le nageur n'est pas trouvé
 */
export async function getSwimmerByLicense(competId, license) {
  // Validation
  const validation = GetSwimmerByLicenseParamsSchema.safeParse({ license });
  if (!validation.success) {
    throw new ValidationError("Licence invalide", validation.error);
  }

  const swimmers = await getSwimmers(competId);
  const swimmer = swimmers.find((s) => s.id === license);

  if (!swimmer) {
    throw new NotFoundError("Nageur");
  }

  return swimmer;
}

/**
 * Recherche un nageur par nom/prénom
 * @param {string} competId - ID de la compétition
 * @param {string} [firstName] - Prénom
 * @param {string} [lastName] - Nom
 * @returns {Promise<Swimmer[]>}
 */
export async function getSwimmerByName(competId, firstName, lastName) {
  // Validation
  const validation = GetSwimmerByNameParamsSchema.safeParse({
    firstName,
    lastName,
  });
  if (!validation.success) {
    throw new ValidationError(
      "Au moins le prénom ou le nom est requis",
      validation.error
    );
  }

  const swimmers = await getSwimmers(competId);

  return swimmers.filter((s) => {
    const matchFirstName =
      !firstName ||
      s.firstName.toLowerCase().includes(firstName.toLowerCase());
    const matchLastName =
      !lastName || s.lastName.toLowerCase().includes(lastName.toLowerCase());
    return matchFirstName && matchLastName;
  });
}

/**
 * Récupère le premier nageur (pour les cas par défaut)
 * @param {string} competId - ID de la compétition
 * @returns {Promise<Swimmer | null>}
 */
export async function getDefaultSwimmer(competId) {
  try {
    const swimmers = await getSwimmers(competId);
    return swimmers[0] || null;
  } catch {
    return null;
  }
}
