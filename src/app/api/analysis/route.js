import { NextResponse } from "next/server";
import { getAnalysis } from "./service";

export async function GET(request) {
  const url = new URL(request.url);
  const eventId = url.searchParams.get("eventId");
  const eventLabel = url.searchParams.get("eventLabel");
  const license = url.searchParams.get("license");
  const competId = url.searchParams.get("competId");

  const analysis = await getAnalysis({ eventId, eventLabel, license, competId });

  return NextResponse.json(analysis);
}
