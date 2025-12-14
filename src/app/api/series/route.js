import { NextResponse } from "next/server";
import { getSeries } from "./service";

export async function GET(request) {
  const url = new URL(request.url);
  const competId = url.searchParams.get("compet");
  const race = url.searchParams.get("race");
  const engagementId = url.searchParams.get("engagementId");
  const meta = url.searchParams.get("meta");

  const series = await getSeries({ competId, race, engagementId, meta });

  return NextResponse.json(series);
}
