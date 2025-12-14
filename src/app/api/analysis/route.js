import { NextResponse } from "next/server";
import { getAnalysis } from "./service";

export async function GET(request) {
  const url = new URL(request.url);
  const eventId = url.searchParams.get("eventId");
  const license = url.searchParams.get("license");

  const analysis = await getAnalysis({ eventId, license });

  return NextResponse.json(analysis);
}
