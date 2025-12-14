import { NextResponse } from "next/server";
import { getEngagementById, getEngagements } from "./service";

export async function GET(request) {
  const url = new URL(request.url);
  const competId = url.searchParams.get("competId");
  const id = url.searchParams.get("id");

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

  // Sinon, retourne tous les engagements
  const engagements = await getEngagements(competId);
  return NextResponse.json(engagements);
}
