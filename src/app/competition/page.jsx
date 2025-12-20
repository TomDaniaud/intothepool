"use client";

/**
 * Page Competition
 * - Colonne gauche: engagements (timeline)
 * - Colonne droite: infos nageur + club
 * - Au clic sur une épreuve: ouverture d'une right modal (placeholder, style GitHub)
 * - Utilise le store de compétition pour partager les IDs entre composants
 * - Supporte les paramètres d'URL pour le partage: ?competId=xxx&nageurId=yyy
 */

import { useEffect, useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Share2, Check, Loader2 } from "lucide-react";
import { useSearchHistory } from "@/components/search-history-provider";
import { CompetitionStoreProvider, useCompetitionStore } from "@/components/competition-store-provider";
import { EngagementsPanelContainer } from "@/components/competition/engagements-panel";
import { EngagementDetailsSheet } from "@/components/competition/modalsheet";
import { SwimmerClubPanelContainer } from "@/components/competition/swimmer-club-panel";
import { Button } from "@/components/ui/button";
import { useFetchJson } from "@/hooks/useFetchJson";

/**
 * Composant interne qui hydrate le store avec les données de la recherche active.
 */
function CompetitionContent({ activeSearch }) {
  const store = useCompetitionStore();
  const [selectedEngagement, setSelectedEngagement] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Hydrater le store avec les données de la recherche active
  useEffect(() => {
    if (activeSearch) {
      store.initSearch(
        activeSearch.competId || activeSearch.competition, // competId ou fallback sur le nom
        activeSearch.firstName,
        activeSearch.lastName,
        activeSearch.clubCode,
        activeSearch.license
      );
    }
  }, [activeSearch, store.initSearch]);

  function onSelectEngagement(engagement) {
    setSelectedEngagement(engagement);
    setDetailsOpen(true);
    // Mettre à jour le store avec l'engagement sélectionné
    store.set({ engagementId: engagement?.id, eventId: engagement?.eventId });
  }

  // Générer l'URL de partage (seulement competId et nageurId)
  function getShareUrl() {
    const params = new URLSearchParams();
    if (activeSearch.competId) params.set("competId", activeSearch.competId);
    if (activeSearch.license) params.set("nageurId", activeSearch.license);
    
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    return `${baseUrl}/competition?${params.toString()}`;
  }

  async function handleShare() {
    const url = getShareUrl();
    
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback pour les navigateurs sans API clipboard
      console.error("Impossible de copier l'URL");
    }
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-balance text-2xl font-semibold tracking-tight">
            {activeSearch.competition || "Compétition"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {activeSearch.firstName} {activeSearch.lastName} — Visualisation des
            engagements et informations du nageur.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleShare}
          className="shrink-0"
        >
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
        {/* Gauche: engagements (timeline) - récupère competId depuis le store */}
        <EngagementsPanelContainer
          onSelect={onSelectEngagement}
        />

        {/* Droite: nageur + club - priorise la licence si disponible */}
        <SwimmerClubPanelContainer
          swimmerFirstName={activeSearch.firstName}
          swimmerLastName={activeSearch.lastName}
          swimmerLicense={activeSearch.license}
          clubCode={activeSearch.clubCode}
        />
      </div>

      {/* Right modal placeholder (style GitHub) */}
      <EngagementDetailsSheet
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        engagement={selectedEngagement}
        competId={store.competId}
        swimmerName={store.swimmerName}
      />
    </main>
  );
}

export default function CompetitionPage() {
  const { items, activeId, addSearch } = useSearchHistory();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Lire les paramètres d'URL (seulement competId et nageurId)
  const urlCompetId = searchParams.get("competId");
  const urlNageurId = searchParams.get("nageurId");

  // Déterminer si on a des paramètres d'URL valides
  const hasUrlParams = Boolean(urlCompetId);

  // Fetch les infos de la compétition si on a un competId dans l'URL
  const competitionUrl = urlCompetId ? `/api/competition?ffnId=${encodeURIComponent(urlCompetId)}` : null;
  const { data: competitionData, isLoading: competitionLoading } = useFetchJson(competitionUrl);

  // Fetch les infos du nageur si on a un nageurId dans l'URL
  const swimmerUrl = urlCompetId && urlNageurId 
    ? `/api/swimmer?competId=${encodeURIComponent(urlCompetId)}&license=${encodeURIComponent(urlNageurId)}` 
    : null;
  const { data: swimmerData, isLoading: swimmerLoading } = useFetchJson(swimmerUrl);

  // Construire la recherche depuis les paramètres d'URL si présents
  const urlSearch = useMemo(() => {
    if (!hasUrlParams) return null;
    
    // Attendre que les données soient chargées
    const competition = competitionData?.name || "";
    const swimmer = Array.isArray(swimmerData) ? swimmerData[0] : swimmerData;
    
    return {
      id: "url-params",
      competId: urlCompetId || "",
      competition: competition,
      firstName: swimmer?.firstName || "",
      lastName: swimmer?.lastName || "",
      license: urlNageurId || swimmer?.license || "",
      clubCode: swimmer?.clubCode || "",
    };
  }, [hasUrlParams, urlCompetId, urlNageurId, competitionData, swimmerData]);

  // Ajouter la recherche URL à l'historique au premier chargement (une fois les données chargées)
  useEffect(() => {
    if (urlSearch && urlSearch.competId && !competitionLoading && !swimmerLoading) {
      // Vérifier si cette recherche n'existe pas déjà dans l'historique
      const exists = items.some(
        (item) =>
          item.competId === urlSearch.competId &&
          item.license === urlSearch.license
      );
      if (!exists && (urlSearch.firstName || urlSearch.lastName)) {
        addSearch({
          competId: urlSearch.competId,
          competition: urlSearch.competition,
          firstName: urlSearch.firstName,
          lastName: urlSearch.lastName,
          license: urlSearch.license,
          clubCode: urlSearch.clubCode,
        });
      }
    }
  }, [urlSearch, items, addSearch, competitionLoading, swimmerLoading]);

  // Trouver la recherche active (priorité aux paramètres URL)
  const activeSearch = urlSearch || items.find((x) => x.id === activeId) || items[0] || null;

  // Rediriger vers l'accueil si pas de recherche active et pas de paramètres URL
  useEffect(() => {
    if (items.length === 0 && !hasUrlParams) {
      router.push("/");
    }
  }, [items, router, hasUrlParams]);

  // Afficher un loader pendant le chargement des données URL
  if (hasUrlParams && (competitionLoading || swimmerLoading)) {
    return (
      <main className="mx-auto flex w-full max-w-6xl items-center justify-center px-6 py-20">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Chargement de la compétition...</p>
        </div>
      </main>
    );
  }

  // Si pas de recherche, on attend la redirection
  if (!activeSearch) {
    return null;
  }

  // Wrap le contenu avec le provider du store
  return (
    <CompetitionStoreProvider>
      <CompetitionContent activeSearch={activeSearch} />
    </CompetitionStoreProvider>
  );
}
