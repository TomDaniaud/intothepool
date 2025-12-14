"use client";

import { ArrowRight, Info } from "lucide-react";
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
  const [competition, setCompetition] = useState("");
  const router = useRouter();

  const { addSearch } = useSearchHistory();

  const lastNameId = useId();
  const firstNameId = useId();
  const competitionId = useId();

  function onSubmit(event) {
    event.preventDefault();
    const capFirstName = capitalize(firstName.trim());
    const capLastName = capitalize(lastName.trim());
    const capCompetition = capitalize(competition.trim());

    setFirstName(capFirstName);
    setLastName(capLastName);
    setCompetition(capCompetition);
    addSearch({
      firstName: capFirstName,
      lastName: capLastName,
      competition: capCompetition,
    });
    router.push("/competition");
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
            <span className=" ">
              <Info className="size-4 inline-flex" />
            </span>
            <div className="min-w-0">
              <p className="font-medium text-foreground">
                Recherche rapide (LiveFFN)
              </p>
              <p className="mt-1 text-pretty text-foreground/70">
                Fais une recherche en renseignant le nom et le prénom du nageur et
                le lieu de la compétition.
              </p>
            </div>
          </div>
        </div>
        <div className="w-full rounded-2xl border border-border bg-background/70 p-5 backdrop-blur sm:p-10 ">
          <div className="flex flex-col gap-4">
            <p className="text-sm font-medium text-muted-foreground">Accueil</p>
            <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-5xl">
              Intothepool
            </h1>
            <p className="max-w-2xl text-pretty text-base text-muted-foreground sm:text-md">
              Renseigne le nageur et choisis la compétition.
            </p>
          </div>

          <form
            onSubmit={onSubmit}
            className="mt-6 grid gap-4 sm:mt-8 sm:gap-6 sm:grid-cols-2"
          >
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
              <Label htmlFor={competitionId}>Compétition</Label>
              <Input
                id={competitionId}
                name="competition"
                autoComplete="location"
                placeholder="Annecy"
                value={competition}
                onChange={(e) => setCompetition(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-background">Lancez la recherche</Label>
              <Button type="submit" className="w-full group">
                Rechercher{" "}
                <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform duration-200" />
              </Button>
            </div>
          </form>
        </div>
        <div className="mt-6 w-full rounded-2xl border border-border bg-background/70 p-4 text-muted-foreground backdrop-blur sm:mt-8 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-foreground">
              Comment ça marche
            </p>
            <p className="text-xs text-muted-foreground">4 étapes</p>
          </div>
          <ol className="mt-3 space-y-2 pl-5 text-sm marker:text-muted-foreground">
            <li>Renseigne le nom, le prénom et la compétition.</li>
            <li>Lance la recherche pour ouvrir la page compétition.</li>
            <li>
              Chaque recherche crée un onglet dans la sidebar (historique).
            </li>
            <li>
              Ouvre une épreuve pour voir Engagement / Résultat / Analyse.
            </li>
          </ol>
        </div>
      </section>
    </main>
  );
}
