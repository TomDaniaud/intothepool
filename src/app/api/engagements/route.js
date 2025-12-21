import { NextResponse } from "next/server";
import { getEngagementById, getEngagements } from "@/lib/scrapers/engagement";

export async function GET(request) {
  const url = new URL(request.url);
  const competId = url.searchParams.get("competId");
  const swimmerId = url.searchParams.get("swimmerId");
  const id = url.searchParams.get("id");

  // competId est requis pour toutes les opérations de scraping
    if (competId && swimmerId) {
      const engagements = await getEngagements(competId, swimmerId);
      return NextResponse.json(engagements);
    }

  // Si un ID spécifique est demandé
  if (id) {
    const engagement = await getEngagementById(id);
    if (!engagement) {
      return NextResponse.json(
        { error: "Engagement non trouvé" },
        { status: 404 },
      );
    }
    return NextResponse.json(engagement);
  }

  // Sinon erreur
  return NextResponse.json(
        { error: "Parametres manquants" },
        { status: 404 },
      );
}
