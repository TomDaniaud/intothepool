import { NextResponse } from "next/server";
import { getPerformance } from "./service";

export async function GET(request) {
  const url = new URL(request.url);
  const eventId = url.searchParams.get("eventId");
  const license = url.searchParams.get("license");

  const performance = await getPerformance(eventId, license);

  if (!performance) {
    return NextResponse.json(
      { error: "Aucune performance trouvée" },
      { status: 404 },
    );
  }

  return NextResponse.json(performance);
}
