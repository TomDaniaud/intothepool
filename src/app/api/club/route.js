import { NextResponse } from "next/server";
import { z } from "zod";
import { getClubs, getClubByCode, getDefaultClub } from "./service";
import {
  ScrapingError,
  ValidationError,
} from "@/lib/scraping";

// Schema de validation des query params
const QueryParamsSchema = z.object({
  competId: z.string().min(1, "L'ID de la compétition est requis"),
  code: z.string().optional(),
});

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const competId = url.searchParams.get("competId");
    const code = url.searchParams.get("code");

    // Validation des paramètres
    const validation = QueryParamsSchema.safeParse({ competId, code });
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Paramètres invalides",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    // Recherche par code spécifique
    if (code) {
      const club = await getClubByCode(competId, code);
      return NextResponse.json(club);
    }

    // Retourne tous les clubs de la compétition
    const clubs = await getClubs(competId);
    return NextResponse.json(clubs);
  } catch (error) {
    // Gestion des erreurs personnalisées
    if (error instanceof ValidationError) {
      return NextResponse.json(
        {
          error: error.message,
          details: error.zodError?.flatten?.()?.fieldErrors,
        },
        { status: error.status }
      );
    }

    if (error instanceof ScrapingError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status }
      );
    }

    // Erreur inattendue
    console.error("Erreur inattendue dans /api/club:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
