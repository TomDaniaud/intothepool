"use client";

/**
 * Page Competition
 * - Colonne gauche: engagements (timeline)
 * - Colonne droite: infos nageur + club
 * - Au clic sur une épreuve: ouverture d'une right modal (placeholder, style GitHub)
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSearchHistory } from "@/components/search-history-provider";
import { EngagementsPanelContainer } from "@/components/competition/engagements-panel";
import { EngagementDetailsSheet } from "@/components/competition/modalsheet";
import { SwimmerClubPanelContainer } from "@/components/competition/swimmer-club-panel";

export default function CompetitionPage() {
  const { items, activeId } = useSearchHistory();
  const router = useRouter();

  const [selectedEngagement, setSelectedEngagement] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Trouver la recherche active
  const activeSearch = items.find((x) => x.id === activeId) || items[0] || null;

  // Rediriger vers l'accueil si pas de recherche active
  useEffect(() => {
    if (items.length === 0) {
      router.push("/");
    }
  }, [items, router]);

  function onSelectEngagement(engagement) {
    setSelectedEngagement(engagement);
    setDetailsOpen(true);
  }

  // Si pas de recherche, on attend la redirection
  if (!activeSearch) {
    return null;
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10">
      <div className="mb-6">
        <h1 className="text-balance text-2xl font-semibold tracking-tight">
          {activeSearch.competition || "Compétition"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {activeSearch.firstName} {activeSearch.lastName} — Visualisation des
          engagements et informations du nageur.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        {/* Gauche: engagements (timeline) */}
        <EngagementsPanelContainer
          competId={activeSearch.competition}
          swimmerName={`${activeSearch.firstName} ${activeSearch.lastName}`}
          onSelect={onSelectEngagement}
        />

        {/* Droite: nageur + club */}
        <SwimmerClubPanelContainer
          swimmerFirstName={activeSearch.firstName}
          swimmerLastName={activeSearch.lastName}
        />
      </div>

      {/* Right modal placeholder (style GitHub) */}
      <EngagementDetailsSheet
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        engagement={selectedEngagement}
        competId={activeSearch.competition}
        swimmerName={`${activeSearch.firstName} ${activeSearch.lastName}`}
      />
    </main>
  );
}
