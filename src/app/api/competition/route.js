import { NextResponse } from "next/server";
import { z } from "zod";
import { scrapers } from "@/lib/scrapers";
import { ScrapingError, ValidationError, NotFoundError } from "@/lib/scrapers";

// Query params:
// - ffnId: string  -> retourne 1 compétition
// - location: string      -> retourne liste filtrée
// - sinon             -> retourne toutes les compétitions
const QueryParamsSchema = z.object({
  ffnId: z.string().min(1).optional(),
  location: z.string().min(1).optional(),
});

export async function GET(request) {
  try {
    const url = new URL(request.url);

    // Convertir null en undefined pour Zod
    const ffnId = url.searchParams.get("ffnId") || undefined;
    const location = url.searchParams.get("location") || undefined;

    const validation = QueryParamsSchema.safeParse({ ffnId, location });
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Paramètres invalides",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }


    if (ffnId) {
      const competition = await scrapers.competition.getById(ffnId);
      return NextResponse.json(competition);
    }

    if (location) {
      const competitions = await scrapers.competition.searchByLocation(location);
      return NextResponse.json(competitions);
    }

    const competitions = await scrapers.competition.getAll();
    return NextResponse.json(competitions);
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

    console.error("Erreur inattendue dans /api/competition:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
