import { NextResponse } from "next/server";
import { z } from "zod";
import { scrapers } from "@/lib/scrapers";
import { ScrapingError, ValidationError, NotFoundError } from "@/lib/scrapers";

// Query params:
// - list=events -> liste des événements disponibles (fetch depuis FFN)
// - list=default -> événement et saison par défaut
// - race: string (ex: "100 NL") + gender: "F"|"M" + birthYear -> temps pour 1 course
// - gender: "F"|"M" + birthYear -> toutes les qualifs pour cet âge
// - idclt: number -> ID de l'événement (79 = OPEN d'été par défaut)
// - sinon -> toute la grille
const QueryParamsSchema = z.object({
  race: z.string().min(1).optional(),
  gender: z.enum(["F", "M"]).optional(),
  birthYear: z.coerce.number().int().min(1950).max(2020).optional(),
  season: z.coerce.number().int().min(2020).max(2030).optional(),
  idclt: z.coerce.number().int().min(1).optional(),
});

export async function GET(request) {
  try {
    const url = new URL(request.url);

    // Cas 0a: Liste des événements disponibles (fetch depuis FFN)
    const list = url.searchParams.get("list");
    if (list === "events") {
      const events = await scrapers.qualification.getAvailableEvents();
      return NextResponse.json(events);
    }

    // Extraire les paramètres
    const race = url.searchParams.get("race") || undefined;
    let gender = url.searchParams.get("gender") || undefined;
    const birthYearParam = url.searchParams.get("birthYear");
    const seasonParam = url.searchParams.get("season");
    const idcltParam = url.searchParams.get("idclt");

    // Normaliser gender (Male/Female → M/F)
    if (gender) {
      gender = gender.slice(0, 1).toUpperCase();
    }

    const birthYear = birthYearParam ? Number.parseInt(birthYearParam, 10) : undefined;
    // Utiliser la saison par défaut si non fournie (getDefaultSeason est async)
    const season = seasonParam 
      ? Number.parseInt(seasonParam, 10) 
      : undefined; // Sera géré par le scraper qui utilise la dernière saison disponible
    const idclt = idcltParam ? Number.parseInt(idcltParam, 10) : undefined;

    const validation = QueryParamsSchema.safeParse({ race, gender, birthYear, season, idclt });
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Paramètres invalides",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    // Cas 1: course + gender + birthYear -> temps pour 1 course
    if (race && gender && birthYear) {
      const qualification = await scrapers.qualification.getQualificationTime({
        race,
        gender,
        birthYear,
        season,
        idclt,
      });
      return NextResponse.json(qualification);
    }

    // Cas 2: gender + birthYear -> toutes les qualifs pour cet âge
    if (gender && birthYear) {
      const qualifications = await scrapers.qualification.getQualificationsForAge({
        gender,
        birthYear,
        season,
        idclt,
      });
      return NextResponse.json(qualifications);
    }

    // Cas 3: toute la grille
    const grid = await scrapers.qualification.getAll({ season, idclt });
    return NextResponse.json(grid);
    
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json(
        {
          error: error.message,
          details: error.zodError?.flatten?.()?.fieldErrors,
        },
        { status: error.status }
      );
    }

    if (error instanceof NotFoundError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status }
      );
    }

    if (error instanceof ScrapingError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status }
      );
    }

    console.error("Erreur inattendue dans /api/qualification:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
