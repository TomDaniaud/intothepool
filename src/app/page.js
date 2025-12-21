"use client";

import { ArrowRight, Info, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, useEffect } from "react";

import { useSearchHistory } from "@/components/search-history-provider";
import { CompetCard, CompetCardSelected } from "@/components/compet-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { capitalize, cn } from "@/lib/utils";

export default function Home() {
  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [filterQuery, setFilterQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [competitions, setCompetitions] = useState([]);
  const [competitionsLoading, setCompetitionsLoading] = useState(true);
  const [selectedCompetition, setSelectedCompetition] = useState(null);
  const router = useRouter();

  const { addSearch } = useSearchHistory();

  const lastNameId = useId();
  const firstNameId = useId();

  // Charger toutes les compétitions au montage
  useEffect(() => {
    async function fetchCompetitions() {
      try {
        const res = await fetch("/api/competition");
        if (res.ok) {
          const data = await res.json();
          setCompetitions(data || []);
        }
      } catch (err) {
        console.error("Erreur chargement compétitions:", err);
      } finally {
        setCompetitionsLoading(false);
      }
    }
    fetchCompetitions();
  }, []);

  // Sélectionner une compétition depuis la grille
  function selectCompetition(comp) {
    setSelectedCompetition(comp);
    setFilterQuery("");
  }

  // Annuler la sélection
  function cancelSelection() {
    setSelectedCompetition(null);
  }

  // Gère le filtre et auto-sélection si match exact
  function handleFilterChange(value) {
    setFilterQuery(value);
    if (!value.trim()) return;
    
    const query = value.toLowerCase().trim();
    const exactMatch = competitions.find(
      (comp) =>
        comp.location?.toLowerCase() === query ||
        comp.name?.toLowerCase() === query
    );
    if (exactMatch) {
      setSelectedCompetition(exactMatch);
      setFilterQuery("");
    }
  }

  async function onSubmit(event) {
    event.preventDefault();
    setError(null);

    const capFirstName = capitalize(firstName.trim());
    const capLastName = capitalize(lastName.trim());

    if (!capFirstName || !capLastName || !selectedCompetition) {
      if (!selectedCompetition) {
        setError("Sélectionne une compétition dans la liste ci-dessous.");
      }
      return;
    }

    setIsLoading(true);

    try {
      // 1. Utiliser le competId de la compétition sélectionnée
      const competId = selectedCompetition.ffnId;
      const capLocation = selectedCompetition.location || selectedCompetition.name;

      if (!competId) {
        setError("Aucune compétition sélectionnée.");
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
        setError("Ce nageur n'est pas inscrit pour cette competiton");
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
                className={cn(error && 'ring-2 ring-red-300')}
                onChange={(e) => { setLastName(e.target.value); setError(null); }}
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
                className={cn(error && 'ring-2 ring-red-300')}
                onChange={(e) => { setFirstName(e.target.value); setError(null); }}
              />
            </div>

            {/* Compétition: soit input filtre, soit card sélectionnée */}
            <div className="space-y-2">
              <Label htmlFor="competFilter">Compétition</Label>
              {selectedCompetition ? (
                <CompetCardSelected
                  competition={selectedCompetition}
                  onCancel={cancelSelection}
                />
              ) : (
                <Input
                  id="competFilter"
                  placeholder="Filtrer par lieu..."
                  value={filterQuery}
                  onChange={(e) => { handleFilterChange(e.target.value); setError(null); }}
                />
              )}
            </div>

            <div className="space-y-2">
              <Label className="invisible">Rechercher</Label>
              <Button type="submit" className="w-full group" disabled={isLoading || !selectedCompetition}>
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

        {/* Grille des compétitions disponibles */}
        <div className="mt-8 w-full">
          <h2 className="mb-4 text-lg font-semibold">Compétitions disponibles</h2>
          {competitionsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : competitions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune compétition disponible.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {competitions
                .filter((comp) => {
                  if (!filterQuery.trim()) return true;
                  const query = filterQuery.toLowerCase();
                  return (
                    comp.location?.toLowerCase().includes(query) ||
                    comp.name?.toLowerCase().includes(query)
                  );
                })
                .map((comp) => (
                  <CompetCard
                    key={comp.ffnId}
                    competition={comp}
                    onClick={() => selectCompetition(comp)}
                    selected={selectedCompetition?.ffnId === comp.ffnId}
                  />
                ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
