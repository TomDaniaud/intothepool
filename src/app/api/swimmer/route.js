import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getSwimmers,
  getSwimmerByLicense,
  getSwimmerByName,
  getDefaultSwimmer,
} from "./service";
import { ScrapingError, ValidationError } from "@/lib/scraping";

// Schema de validation des query params
const QueryParamsSchema = z.object({
  competId: z.string().min(1, "L'ID de la compétition est requis"),
  license: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const competId = url.searchParams.get("competId");
    const license = url.searchParams.get("license");
    const firstName = url.searchParams.get("firstName");
    const lastName = url.searchParams.get("lastName");

    // Validation des paramètres
    const validation = QueryParamsSchema.safeParse({
      competId,
      license,
      firstName,
      lastName,
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

    // Recherche par licence
    if (license) {
      const swimmer = await getSwimmerByLicense(competId, license);
      return NextResponse.json(swimmer);
    }

    // Recherche par nom/prénom
    if (firstName || lastName) {
      const swimmers = await getSwimmerByName(competId, firstName, lastName);
      if (swimmers.length === 0) {
        return NextResponse.json(
          { error: "Nageur non trouvé" },
          { status: 404 }
        );
      }
      return NextResponse.json(swimmers);
    }

    // Retourne tous les nageurs de la compétition
    const swimmers = await getSwimmers(competId);
    return NextResponse.json(swimmers);
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
    console.error("Erreur inattendue dans /api/swimmer:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
