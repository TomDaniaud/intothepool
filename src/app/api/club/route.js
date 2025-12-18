import { NextResponse } from "next/server";
import { z } from "zod";
import { getClubs, getClubByCode, getDefaultClub } from "./service";
import {
  ScrapingError,
  ValidationError,
} from "@/lib/scrapers";

// Schema de validation des query params
const QueryParamsSchema = z.object({
  competId: z.string().min(1, "L'ID de la compétition est requis").optional(),
  code: z.string().min(1).optional(),
});

export async function GET(request) {
  try {
    const url = new URL(request.url);
    // Convertir null en undefined pour Zod
    const competId = url.searchParams.get("competId") || undefined;
    const code = url.searchParams.get("code") || undefined;

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

    // competId est requis pour toutes les opérations de scraping
    if (!competId) {
      return NextResponse.json(
        { error: "L'ID de la compétition (competId) est requis" },
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
