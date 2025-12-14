import { NextResponse } from "next/server";
import {
  getDefaultSwimmer,
  getSwimmerByLicense,
  getSwimmerByName,
} from "./service";

export async function GET(request) {
  const url = new URL(request.url);
  const license = url.searchParams.get("license");
  const firstName = url.searchParams.get("firstName");
  const lastName = url.searchParams.get("lastName");

  // Recherche par licence
  if (license) {
    const swimmer = await getSwimmerByLicense(license);
    if (!swimmer) {
      return NextResponse.json({ error: "Nageur non trouvé" }, { status: 404 });
    }
    return NextResponse.json(swimmer);
  }

  // Recherche par nom/prénom
  if (firstName || lastName) {
    const swimmer = await getSwimmerByName(firstName, lastName);
    if (!swimmer) {
      return NextResponse.json({ error: "Nageur non trouvé" }, { status: 404 });
    }
    return NextResponse.json(swimmer);
  }

  // Par défaut, retourne le nageur mock
  const swimmer = await getDefaultSwimmer();
  return NextResponse.json(swimmer);
}
