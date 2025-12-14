import { NextResponse } from "next/server";
import { getClubByCode, getDefaultClub } from "./service";

export async function GET(request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (code) {
    const club = await getClubByCode(code);
    if (!club) {
      return NextResponse.json({ error: "Club non trouvé" }, { status: 404 });
    }
    return NextResponse.json(club);
  }

  // Par défaut, retourne le club mock
  const club = await getDefaultClub();
  return NextResponse.json(club);
}
