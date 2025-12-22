import { NextResponse } from "next/server";
import { z } from "zod";
import { scrapers, ScrapingError, NotFoundError, ValidationError } from "@/lib/scrapers";

const QueryParamsSchema = z.object({
  competId: z.string().min(1, "L'ID de la compétition est requis"),
  raceId: z.string().min(1, "L'ID de l'épreuve est requis"),
  swimmerId: z.string().optional(),
});

export async function GET(request) {
  try {
    const url = new URL(request.url);

    const competId = url.searchParams.get("competId") || undefined;
    const raceId = url.searchParams.get("raceId") || undefined;
    const swimmerId = url.searchParams.get("swimmerId") || undefined;

    const validation = QueryParamsSchema.safeParse({ competId, raceId, swimmerId });
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Paramètres invalides",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    // Si on a un swimmerId, on retourne le résultat spécifique
    if (swimmerId) {
      const { race, swimmer } = await scrapers.results.getBySwimmer(
        competId,
        raceId,
        swimmerId
      );

      // Mock data pour le classement national (TODO: scraper réel)
      const swimmerRanking = swimmer ? {
        ageRank: Math.floor(Math.random() * 50) + 1,
        ageTotal: 247,
        overallRank: Math.floor(Math.random() * 200) + 50,
        overallTotal: 1523,
      } : null;

      return NextResponse.json({
        race,
        swimmer,
        swimmerRanking,
      });
    }

    // Sinon, tous les résultats de l'épreuve
    const raceResults = await scrapers.results.getByRace(competId, raceId);
    return NextResponse.json(raceResults);

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

    console.error("Erreur inattendue dans /api/results:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
