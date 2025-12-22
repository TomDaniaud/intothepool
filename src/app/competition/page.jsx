"use client";

/**
 * Page Competition
 * Lit les paramètres d'URL: ?competId=xxx&license=yyy&clubCode=zzz
 * Ces params sont passés à chaque composant enfant.
 */

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Share2, Check } from "lucide-react";

import { CompetitionBackground } from "@/components/competition/competition-background";
import { EngagementsPanelContainer } from "@/components/competition/engagements-panel";
import { EngagementDetailsSheet } from "@/components/competition/modalsheet";
import { SwimmerClubPanelContainer } from "@/components/competition/swimmer-club-panel";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/fetch-states";
import { useFetchJson } from "@/hooks/useFetchJson";

export default function CompetitionPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex w-full max-w-6xl items-center justify-center px-6 py-20">
          <EmptyState message="Chargement…" />
        </main>
      }
    >
      <CompetitionPageContent />
    </Suspense>
  );
}

function CompetitionPageContent() {
  const searchParams = useSearchParams();
  const [selectedEngagement, setSelectedEngagement] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Lire les paramètres d'URL
  const competId = searchParams.get("competId");
  const license = searchParams.get("license");
  const clubCode = searchParams.get("clubId");

  // Fetch les infos de la compétition pour obtenir le level
  const competUrl = competId
    ? `/api/competition?ffnId=${encodeURIComponent(competId)}`
    : null;
  const { data: competition } = useFetchJson(competUrl);

  // Si pas de competId, afficher un message
  if (!competId) {
    return (
      <main className="mx-auto flex w-full max-w-6xl items-center justify-center px-6 py-20">
        <EmptyState message="Aucune compétition sélectionnée. Retournez à l'accueil pour lancer une recherche." />
      </main>
    );
  }

  function onSelectEngagement(engagement) {
    setSelectedEngagement(engagement);
    setDetailsOpen(true);
  }

  // Partage natif si possible, sinon copie l'URL
  async function handleShare() {
    const shareData = {
      title: document.title || "Compétition FFN",
      text: "Consulte cette compétition sur IntoThePool :",
      url: window.location.href,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // L'utilisateur a annulé ou erreur
        console.log("Partage annulé ou erreur", err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        console.error("Impossible de copier l'URL");
      }
    }
  }

  return (
    <>
      <div className="absolute w-full h-full">
        <CompetitionBackground level={competition?.level} />
      </div>
      <main className="relative isolate mx-auto w-full max-w-6xl px-6 py-10">

        <div className="relative z-10">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-balance text-2xl font-semibold tracking-tight">
            Compétition
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Visualisation des engagements et informations du nageur.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleShare} className="shrink-0">
          {copied ? (
            <>
              <Check className="size-4 text-green-500" />
              Lien copié
            </>
          ) : (
            <>
              <Share2 className="size-4" />
              Partager
            </>
          )}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        {/* Gauche: engagements (timeline) */}
        <EngagementsPanelContainer
          competId={competId}
          swimmerId={license}
          onSelect={onSelectEngagement}
        />

        {/* Droite: nageur + club */}
        <SwimmerClubPanelContainer
          competId={competId}
          license={license}
          clubCode={clubCode}
        />
      </div>

      {/* Modal détails épreuve */}
      <EngagementDetailsSheet
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        engagement={selectedEngagement}
        competId={competId}
        license={license}
      />
        </div>
      </main>

    </>
  );
}