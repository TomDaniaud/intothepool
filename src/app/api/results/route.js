import { NextResponse } from "next/server";
import { getResults } from "./service";

export async function GET(request) {
  const url = new URL(request.url);
  const race = url.searchParams.get("race");
  const engagementId = url.searchParams.get("engagementId");
  const meta = url.searchParams.get("meta");

  const results = await getResults({ race, engagementId, meta });

  return NextResponse.json(results);
}
