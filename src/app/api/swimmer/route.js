import { NextResponse } from "next/server";
import { getDefaultSwimmer, getSwimmerByLicense } from "./service";

export async function GET(request) {
  const url = new URL(request.url);
  const license = url.searchParams.get("license");

  if (license) {
    const swimmer = await getSwimmerByLicense(license);
    if (!swimmer) {
      return NextResponse.json({ error: "Nageur non trouvé" }, { status: 404 });
    }
    return NextResponse.json(swimmer);
  }

  // Par défaut, retourne le nageur mock
  const swimmer = await getDefaultSwimmer();
  return NextResponse.json(swimmer);
}
