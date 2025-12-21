import { NextResponse } from "next/server";
import { z } from "zod";
import { scrapers } from "@/lib/scrapers";
import { ScrapingError, ValidationError, NotFoundError } from "@/lib/scrapers";

// Query params:
// - event: string (ex: "100 NL") + gender: "F"|"M" + age|birthYear -> temps pour 1 épreuve
// - gender: "F"|"M" + age|birthYear -> toutes les qualifs pour cet âge
// - sinon -> toute la grille
const QueryParamsSchema = z.object({
  event: z.string().min(1).optional(),
  gender: z.enum(["F", "M"]).optional(),
  age: z.coerce.number().int().min(14).max(99).optional(),
  birthYear: z.coerce.number().int().min(1950).max(2020).optional(),
  season: z.coerce.number().int().min(2020).max(2030).optional(),
});

export async function GET(request) {
  try {
    const url = new URL(request.url);

    // Extraire les paramètres
    const event = url.searchParams.get("event") || undefined;
    const gender = url.searchParams.get("gender") || undefined;
    const ageParam = url.searchParams.get("age");
    const birthYearParam = url.searchParams.get("birthYear");
    const seasonParam = url.searchParams.get("season");

    const age = ageParam ? Number.parseInt(ageParam, 10) : undefined;
    const birthYear = birthYearParam ? Number.parseInt(birthYearParam, 10) : undefined;
    const season = seasonParam ? Number.parseInt(seasonParam, 10) : undefined;

    const validation = QueryParamsSchema.safeParse({ event, gender, age, birthYear, season });
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Paramètres invalides",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    // Cas 1: épreuve + gender + (age ou birthYear) -> temps pour 1 épreuve
    if (event && gender && (age || birthYear)) {
      const qualification = await scrapers.qualification.getQualificationTime({
        event,
        gender,
        age,
        birthYear,
        season,
      });
      return NextResponse.json(qualification);
    }

    // Cas 2: gender + (age ou birthYear) -> toutes les qualifs pour cet âge
    if (gender && (age || birthYear)) {
      const qualifications = await scrapers.qualification.getQualificationsForAge({
        gender,
        age,
        birthYear,
        season,
      });
      return NextResponse.json(qualifications);
    }

    // Cas 3: toute la grille
    const grid = await scrapers.qualification.getAll(season);
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
