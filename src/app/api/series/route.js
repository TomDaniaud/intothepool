import { NextResponse } from "next/server";
import { z } from "zod";
import { getSeries } from "./service";
import { ScrapingError, ValidationError } from "@/lib/scraping";

// Schema de validation des query params
const QueryParamsSchema = z.object({
  competId: z.string().optional(),
  race: z.string().optional(),
  engagementId: z.string().optional(),
  meta: z.string().optional(),
  date: z.string().optional(),
  time: z.string().optional(),
});

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const competId = url.searchParams.get("compet") || url.searchParams.get("competId");
    const race = url.searchParams.get("race");
    const engagementId = url.searchParams.get("engagementId");
    const meta = url.searchParams.get("meta");
    const date = url.searchParams.get("date");
    const time = url.searchParams.get("time");

    // Validation des paramètres
    const validation = QueryParamsSchema.safeParse({
      competId,
      race,
      engagementId,
      meta,
      date,
      time,
    });
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Paramètres invalides",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const series = await getSeries({
      competId,
      race,
      engagementId,
      meta,
      date,
      time,
    });

    return NextResponse.json(series);
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
    console.error("Erreur inattendue dans /api/series:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
