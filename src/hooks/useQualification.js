import { useFetchJson } from "./useFetchJson";

/**
 * Hook pour récupérer le temps de qualification d'une course spécifique
 * - race: nom de la course (ex: "50 Dos")
 * - gender: "M" ou "F" (normalise Male/Female automatiquement)
 * - birthYear: année de naissance
 * - season: optionnel, par défaut la saison en cours (côté API)
 * - event: optionnel, par défaut France Open été (côté API)
 */
export function useQualificationTime({ race, gender, birthYear, season, event }) {
  const params = new URLSearchParams();
  if (race) params.append("race", race);
  // Normaliser gender (Male/Female → M/F)
  if (gender) {
    const normalizedGender = String(gender).trim().slice(0, 1).toUpperCase();
    params.append("gender", normalizedGender);
  }
  if (birthYear) params.append("birthYear", birthYear);
  if (season) params.append("season", season);
  // event n'est pas encore utilisé côté API (pour l'instant France Open par défaut)

  // On ne fetch que si les paramètres nécessaires sont présents
  const url = race && gender && birthYear
    ? `/api/qualification?${params.toString()}`
    : null;

  return useFetchJson(url);
}
