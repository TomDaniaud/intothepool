"use client";

/**
 * Onglet "Engagement" : liste scrollable de toutes les séries,
 * avec scroll automatique vers la série du nageur.
 * Utilise le store de compétition pour accéder au competId.
 */

import { useEffect, useRef } from "react";
import { EmptyState, FetchError } from "@/components/ui/fetch-states";
import { useFetchJson } from "@/hooks/useFetchJson";
import { cn } from "@/lib/utils";
import { useCompetitionStore, useApiUrl } from "@/components/competition-store-provider";

function SeriesListSkeleton() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
        <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
      </div>

      {Array.from({ length: 3 }).map((_, seriesIdx) => (
        <div
          key={`skeleton-series-${seriesIdx}`}
          className="overflow-hidden rounded-md border border-border"
        >
          <div className="border-b border-border bg-muted/40 p-2">
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
          </div>
          <div className="space-y-2 p-2">
            {Array.from({ length: 4 }).map((_, rowIdx) => (
              <div
                key={`skeleton-row-${seriesIdx}-${rowIdx}`}
                className="grid grid-cols-4 gap-2"
              >
                <div className="h-3 animate-pulse rounded bg-muted" />
                <div className="h-3 animate-pulse rounded bg-muted" />
                <div className="h-3 animate-pulse rounded bg-muted" />
                <div className="h-3 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function SeriesTable({ series, isSwimmerSeries, seriesRef }) {
  return (
    <div
      ref={seriesRef}
      className={cn(
        "overflow-hidden rounded-md border",
        isSwimmerSeries
          ? "border-primary ring-2 ring-primary/20"
          : "border-border",
      )}
    >
      <div
        className={cn(
          "border-b px-3 py-2 text-sm font-medium",
          isSwimmerSeries
            ? "border-primary/30 bg-primary/10 text-primary"
            : "border-border bg-muted/40",
        )}
      >
        Série {series.seriesNumber}
        {isSwimmerSeries && (
          <span className="ml-2 text-xs font-normal">(votre série)</span>
        )}
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-xs text-muted-foreground">
            <th className="p-2 text-left font-medium">Couloir</th>
            <th className="p-2 text-left font-medium">Nageur</th>
            <th className="p-2 text-left font-medium">Club</th>
            <th className="p-2 text-left font-medium">Temps</th>
          </tr>
        </thead>
        <tbody>
          {series.swimmers.map((swimmer) => (
            <tr
              key={`lane-${swimmer.lane}`}
              className={cn(
                "border-b border-border last:border-b-0",
                swimmer.isSelected && "bg-accent text-accent-foreground",
              )}
            >
              <td className="p-2 font-medium">{swimmer.lane}</td>
              <td className="p-2">
                {swimmer.name}
                {swimmer.isSelected && (
                  <span className="ml-1 text-xs font-medium text-primary">
                    ★
                  </span>
                )}
              </td>
              <td className="p-2 text-muted-foreground">{swimmer.club}</td>
              <td className="p-2 tabular-nums">{swimmer.entryTime}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SeriesList({ data }) {
  const swimmerSeriesRef = useRef(null);

  // Scroll vers la série du nageur au chargement
  useEffect(() => {
    if (swimmerSeriesRef.current) {
      swimmerSeriesRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, []);

  if (!data?.series?.length) {
    return <EmptyState message="Aucune série disponible." />;
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {data.series.map((series) => (
          <SeriesTable
            key={`series-${series.seriesNumber}`}
            series={series}
            isSwimmerSeries={series.isSwimmerSeries}
            seriesRef={series.isSwimmerSeries ? swimmerSeriesRef : undefined}
          />
        ))}
      </div>
    </div>
  );
}

function SeriesContainer({ engagement }) {
  const store = useCompetitionStore();
  const url = useApiUrl("/api/series", {
    race: engagement.label || "Épreuve",
    engagementId: engagement.id || "unknown",
    meta: engagement.meta || "",
  });

  const shouldFetch = Boolean(store.competId);
  const { data, error, isLoading } = useFetchJson(shouldFetch ? url : null);

  if (!store.competId) {
    return <EmptyState message="ID de compétition manquant." />;
  }

  if (isLoading) return <SeriesListSkeleton />;

  if (error) {
    return <FetchError error={error} />;
  }

  return <SeriesList data={data} />;
}

export function EngagementTab({ engagement }) {
  if (!engagement) {
    return (
      <p className="text-sm text-muted-foreground">
        Aucune épreuve sélectionnée.
      </p>
    );
  }

  return <SeriesContainer engagement={engagement} />;
}

