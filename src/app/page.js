"use client";

import { ArrowRight, Info, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";

import { useSearchHistory } from "@/components/search-history-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { capitalize } from "@/lib/utils";

export default function Home() {
  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [location, setLocation] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();

  const { addSearch } = useSearchHistory();

  const lastNameId = useId();
  const firstNameId = useId();
  const locationId = useId();

  async function onSubmit(event) {
    event.preventDefault();
    setError(null);

    const capFirstName = capitalize(firstName.trim());
    const capLastName = capitalize(lastName.trim());
    const capLocation = capitalize(location.trim());

    if (!capFirstName || !capLastName || !capLocation) {
      return;
    }

    setIsLoading(true);

    try {
      // 1. Résoudre le competId via l'API
      let competId = null;

      if (capLocation) {
        const res = await fetch(`/api/competition?location=${encodeURIComponent(capLocation)}`);
        if (res.ok) {
          const list = await res.json();
          if (list?.length > 0) {
            competId = list[0].ffnId;
          }
        }
      }

      if (!competId) {
        setError("Aucune compétition trouvée pour ce lieu.");
        setIsLoading(false);
        return;
      }

      // 2. Résoudre le nageur (license, clubCode) via l'API
      let swimmerId = null;
      let clubName = null;
      let clubId = null;

      if (capFirstName && capLastName) {
        const swimmerRes = await fetch(
          `/api/swimmer?competId=${encodeURIComponent(competId)}&firstName=${encodeURIComponent(capFirstName)}&lastName=${encodeURIComponent(capLastName)}`
        );
        if (swimmerRes.ok) {
          const swimmers = await swimmerRes.json();
          console.log(swimmers)
          if (swimmers?.length > 0) {
            swimmerId = swimmers[0].id;
            clubName = swimmers[0].clubName;
          }
        }
      }
      else return;

      if(clubName){
        const clubRes = await fetch(
          `/api/club?competId=${encodeURIComponent(competId)}&name=${encodeURIComponent(clubName)}`
        );
        if (clubRes.ok) {
          const club = await clubRes.json();
          console.log(club);
          if (club) {
            clubId = club.id;
          }
        }
      }
      
      console.log(`${swimmerId}, ${clubId}`);
      if (!swimmerId || !clubId) {
        setError("Aucun nageur trouvé.");
        setIsLoading(false);
        return;
      }

      // 3. Ajouter à l'historique
      addSearch({
        firstName: capFirstName,
        lastName: capLastName,
        competition: capLocation,
        competId,
        license: swimmerId,
        clubId,
      });

      // 4. Naviguer avec tous les IDs en URL
      const params = new URLSearchParams();
      params.set("competId", competId);
      params.set("license", swimmerId);
      params.set("clubId", clubId);

      router.push(`/competition?${params.toString()}`);
    } catch (err) {
      console.error("Erreur lors de la recherche:", err);
      setError("Erreur lors de la recherche. Veuillez réessayer.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="relative bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(90%_60%_at_50%_0%,color-mix(in_oklab,var(--color-accent)_70%,transparent),transparent_60%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent,color-mix(in_oklab,var(--color-foreground)_2%,transparent))]" />
      </div>

      <section className="relative mx-auto flex w-full max-w-5xl flex-col items-center px-4 pb-14 pt-10 sm:px-6 sm:pb-20 sm:pt-20">
        <div className="mb-3 w-full rounded-2xl border border-ring/25 bg-ring/10 p-4 text-sm text-foreground/80 backdrop-blur sm:mt-8 sm:p-5">
          <div className="flex items-start gap-3">
            <Info className="size-4 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="font-medium text-foreground">
                Recherche rapide (LiveFFN)
              </p>
              <p className="mt-1 text-pretty text-foreground/70">
                Renseigne le nom, le prénom du nageur et le lieu de la compétition.
              </p>
            </div>
          </div>
        </div>

        <div className="w-full rounded-2xl border border-border bg-background/70 p-5 backdrop-blur sm:p-10">
          <div className="flex flex-col gap-4">
            <p className="text-sm font-medium text-muted-foreground">Accueil</p>
            <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-5xl">
              Intothepool
            </h1>
            <p className="max-w-2xl text-pretty text-base text-muted-foreground">
              Renseigne le nageur et choisis la compétition.
            </p>
          </div>

          <form onSubmit={onSubmit} className="mt-6 grid gap-4 sm:mt-8 sm:gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={lastNameId}>Nom</Label>
              <Input
                id={lastNameId}
                name="lastName"
                autoComplete="family-name"
                placeholder="Daniaud"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={firstNameId}>Prénom</Label>
              <Input
                id={firstNameId}
                name="firstName"
                autoComplete="given-name"
                placeholder="Nora"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={locationId}>Lieu de la compétition</Label>
              <Input
                id={locationId}
                name="location"
                placeholder="Dunkerque"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-background">Lancez la recherche</Label>
              <Button type="submit" className="w-full group" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Recherche...
                  </>
                ) : (
                  <>
                    Rechercher
                    <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform duration-200" />
                  </>
                )}
              </Button>
              {error && <p className="text-sm text-red-500">{error}</p>}
            </div>
          </form>
        </div>

        <div className="mt-6 w-full rounded-2xl border border-border bg-background/70 p-4 backdrop-blur sm:mt-8 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-foreground">Comment ça marche</p>
            <p className="text-xs text-muted-foreground">3 étapes</p>
          </div>
          <ol className="mt-3 space-y-2 pl-5 text-sm text-muted-foreground marker:text-muted-foreground">
            <li>Renseigne le nom, le prénom et le lieu.</li>
            <li>Lance la recherche pour ouvrir la page compétition.</li>
            <li>Ouvre une épreuve pour voir Engagement / Résultat / Analyse.</li>
          </ol>
        </div>
      </section>
    </main>
  );
}
