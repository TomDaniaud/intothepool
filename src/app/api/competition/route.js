import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getCompetitionById,
  getCompetitions,
  searchCompetitionsByName,
} from "./service";
import { ScrapingError, ValidationError, NotFoundError } from "@/lib/scrapers";

// Query params:
// - id|ffnId: string  -> retourne 1 compétition
// - name: string      -> retourne liste filtrée
// - sinon             -> retourne toutes les compétitions
const QueryParamsSchema = z.object({
  id: z.string().min(1).optional(),
  ffnId: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
});

export async function GET(request) {
  try {
    const url = new URL(request.url);

    // Convertir null en undefined pour Zod
    const id = url.searchParams.get("id") || undefined;
    const ffnId = url.searchParams.get("ffnId") || undefined;
    const name = url.searchParams.get("name") || undefined;

    const validation = QueryParamsSchema.safeParse({ id, ffnId, name });
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Paramètres invalides",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const resolvedId = id || ffnId;

    if (resolvedId) {
      const competition = await getCompetitionById(resolvedId);
      return NextResponse.json(competition);
    }

    if (name) {
      const competitions = await searchCompetitionsByName(name);
      return NextResponse.json(competitions);
    }

    const competitions = await getCompetitions();
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
