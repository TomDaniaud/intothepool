"use client";

import { useId, useState } from "react";

import { useSearchHistory } from "@/components/search-history-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowBigRight } from "lucide-react";
import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

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
    addSearch({ firstName, lastName, competition });
    router.push("/search");
  }

  return (
    <main className="relative min-h-[100dvh] bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(90%_60%_at_50%_0%,color-mix(in_oklab,var(--color-accent)_70%,transparent),transparent_60%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent,color-mix(in_oklab,var(--color-foreground)_2%,transparent))]" />
      </div>

      <section className="relative mx-auto flex w-full max-w-5xl flex-col items-center px-6 pb-20 pt-20">
        <div className="w-full rounded-2xl border border-border bg-background/70 p-8 backdrop-blur sm:p-10 ">
          <div className="flex flex-col gap-4">
            <p className="text-sm font-medium text-muted-foreground">Accueil</p>
            <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
              intothepool
            </h1>
            <p className="max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg">
              Renseigne le nageur et choisis la compétition.
            </p>
          </div>

          <form onSubmit={onSubmit} className="mt-8 grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={lastNameId}>Nom</Label>
              <Input
                id={lastNameId}
                name="lastName"
                autoComplete="family-name"
                placeholder="Dupont"
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
                placeholder="Camille"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={competitionId}>Compétition</Label>
              <Input
                id={competitionId}
                name="firstName"
                placeholder="Annecy"
                value={competition}
                onChange={(e) => setCompetition(e.target.value)}
              />
            </div>
            <div className="space-y-2 w-100%">
              <Label className="text-background">Rechercher</Label>
              <Button className="w-full">Rechercher <ArrowRight/> </Button>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
