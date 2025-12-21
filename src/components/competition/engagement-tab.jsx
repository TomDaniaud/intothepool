"use client";

/**
 * Onglet "Engagement" : liste des séries.
 * Reçoit competId et engagement en props.
 */

import { useEffect, useRef } from "react";
import { EmptyState, FetchError } from "@/components/ui/fetch-states";
import { useFetchJson } from "@/hooks/useFetchJson";
import { cn } from "@/lib/utils";

function SeriesListSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-md border border-border">
          <div className="border-b border-border bg-muted/40 p-2">
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
          </div>
          <div className="space-y-2 p-2">
            {Array.from({ length: 4 }).map((_, j) => (
              <div key={j} className="grid grid-cols-4 gap-2">
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
        isSwimmerSeries ? "border-primary ring-2 ring-primary/20" : "border-border"
      )}
    >
      <div
        className={cn(
          "border-b px-3 py-2 text-sm font-medium",
          isSwimmerSeries ? "border-primary/30 bg-primary/10 text-primary" : "border-border bg-muted/40"
        )}
      >
        Série {series.seriesNumber}
        {isSwimmerSeries && <span className="ml-2 text-xs font-normal">(votre série)</span>}
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
              key={swimmer.lane}
              className={cn(
                "border-b border-border last:border-b-0",
                swimmer.isSelected && "bg-accent text-accent-foreground"
              )}
            >
              <td className="p-2 font-medium">{swimmer.lane}</td>
              <td className="p-2">
                {swimmer.name}
                {swimmer.isSelected && <span className="ml-1 text-xs font-medium text-primary">★</span>}
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

  useEffect(() => {
    if (swimmerSeriesRef.current) {
      swimmerSeriesRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, []);

  if (!data?.series?.length) {
    return <EmptyState message="Aucune série disponible." />;
  }

  return (
    <div className="space-y-3">
      {data.series.map((series) => (
        <SeriesTable
          key={series.seriesNumber}
          series={series}
          isSwimmerSeries={series.isSwimmerSeries}
          seriesRef={series.isSwimmerSeries ? swimmerSeriesRef : undefined}
        />
      ))}
    </div>
  );
}

export function EngagementTab({ competId, engagement }) {
  const params = new URLSearchParams();
  if (competId) params.set("competId", competId);
  if (engagement?.label) params.set("race", engagement.label);
  if (engagement?.id) params.set("engagementId", engagement.id);
  if (engagement?.meta) params.set("meta", engagement.meta);

  const url = competId && engagement ? `/api/series?${params.toString()}` : null;
  const { data, error, isLoading } = useFetchJson(url);

  if (!engagement) {
    return <p className="text-sm text-muted-foreground">Aucune épreuve sélectionnée.</p>;
  }

  if (isLoading) return <SeriesListSkeleton />;
  if (error) return <FetchError error={error} />;

  return <SeriesList data={data} />;
}

