"use client";

/**
 * Page Competition
 * - Colonne gauche: engagements (timeline)
 * - Colonne droite: infos nageur + club
 * - Au clic sur une épreuve: ouverture d'une right modal (placeholder, style GitHub)
 */

import { useMemo, useState } from "react";

import { EngagementDetailsSheet } from "@/components/competition/modalsheet";
import { EngagementsPanel } from "@/components/competition/engagements-panel";
import { SwimmerClubPanel } from "@/components/competition/swimmer-club-panel";
import { mockEngagements } from "@/data/engagements";

export default function CompetitionPage() {
  // Mock data nageur/club : plus tard, on lira depuis l'historique / une API.
  const swimmer = useMemo(
    () => ({
      firstName: "Camille",
      lastName: "Dupont",
      license: "A123456",
      category: "Senior",
    }),
    [],
  );

  const club = useMemo(
    () => ({
      name: "Cercle des Nageurs",
      city: "Annecy",
      code: "074001",
    }),
    [],
  );

  const [selectedEngagement, setSelectedEngagement] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  function onSelectEngagement(engagement) {
    setSelectedEngagement(engagement);
    setDetailsOpen(true);
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10">
      <div className="mb-6">
        <h1 className="text-balance text-2xl font-semibold tracking-tight">
          Compétition
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Visualisation des engagements et informations du nageur.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        {/* Gauche: engagements (timeline) */}
        <EngagementsPanel engagements={mockEngagements} onSelect={onSelectEngagement} />

        {/* Droite: nageur + club */}
        <SwimmerClubPanel swimmer={swimmer} club={club} />
      </div>

      {/* Right modal placeholder (style GitHub) */}
      <EngagementDetailsSheet
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        engagement={selectedEngagement}
      />
    </main>
  );
}
