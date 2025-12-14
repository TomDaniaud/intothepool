"use client";

/**
 * Page Competition
 * - Colonne gauche: engagements (timeline)
 * - Colonne droite: infos nageur + club
 * - Au clic sur une épreuve: ouverture d'une right modal (placeholder, style GitHub)
 */

import { useState } from "react";
import { EngagementsPanelContainer } from "@/components/competition/engagements-panel";
import { EngagementDetailsSheet } from "@/components/competition/modalsheet";
import { SwimmerClubPanelContainer } from "@/components/competition/swimmer-club-panel";

export default function CompetitionPage() {
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
        <EngagementsPanelContainer onSelect={onSelectEngagement} />

        {/* Droite: nageur + club */}
        <SwimmerClubPanelContainer />
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
