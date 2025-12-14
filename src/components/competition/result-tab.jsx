"use client";

/**
 * Onglet "Résultat" : liste scrollable des résultats de course,
 * avec temps en vert pour les records personnels battus.
 */

import { useEffect, useRef } from "react";
import { EmptyState, FetchError } from "@/components/ui/fetch-states";
import { useFetchJson } from "@/hooks/useFetchJson";
import { cn } from "@/lib/utils";

function ResultsListSkeleton() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
        <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
      </div>

      <div className="overflow-hidden rounded-md border border-border">
        <div className="border-b border-border bg-muted/40 p-2">
          <div className="h-4 w-32 animate-pulse rounded bg-muted" />
        </div>
        <div className="space-y-2 p-2">
          {Array.from({ length: 8 }).map((_, rowIdx) => (
            <div
              key={`skeleton-result-${rowIdx}`}
              className="grid grid-cols-6 gap-2"
            >
              <div className="h-3 animate-pulse rounded bg-muted" />
              <div className="h-3 animate-pulse rounded bg-muted" />
              <div className="h-3 animate-pulse rounded bg-muted" />
              <div className="h-3 animate-pulse rounded bg-muted" />
              <div className="h-3 animate-pulse rounded bg-muted" />
              <div className="h-3 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ResultsTable({ data }) {
  const swimmerRowRef = useRef(null);

  // Scroll vers le nageur sélectionné
  useEffect(() => {
    if (swimmerRowRef.current) {
      swimmerRowRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, []);

  if (!data?.swimmers?.length) {
    return <EmptyState message="Aucun résultat disponible." />;
  }

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <div className="text-sm font-semibold">{data.race}</div>
        <div className="text-xs text-muted-foreground">
          Série {data.seriesNumber} / {data.totalSeries}
        </div>
      </div>

      <div className="overflow-hidden rounded-md border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
              <th className="p-2 text-left font-medium">Rang</th>
              <th className="p-2 text-left font-medium">Couloir</th>
              <th className="p-2 text-left font-medium">Nageur</th>
              <th className="p-2 text-left font-medium">Club</th>
              <th className="p-2 text-left font-medium">Temps</th>
              <th className="p-2 text-right font-medium">Écart</th>
            </tr>
          </thead>
          <tbody>
            {data.swimmers.map((swimmer) => (
              <tr
                key={`result-${swimmer.lane}`}
                ref={swimmer.isSelected ? swimmerRowRef : undefined}
                className={cn(
                  "border-b border-border last:border-b-0",
                  swimmer.isSelected && "bg-accent",
                )}
              >
                <td className="p-2 font-medium">
                  {swimmer.rank === 1 && "🥇"}
                  {swimmer.rank === 2 && "🥈"}
                  {swimmer.rank === 3 && "🥉"}
                  {swimmer.rank > 3 && swimmer.rank}
                </td>
                <td className="p-2">{swimmer.lane}</td>
                <td className="p-2">
                  {swimmer.name}
                  {swimmer.isSelected && (
                    <span className="ml-1 text-xs font-medium text-primary">
                      ★
                    </span>
                  )}
                </td>
                <td className="p-2 text-muted-foreground">{swimmer.club}</td>
                <td
                  className={cn(
                    "p-2 tabular-nums font-medium",
                    swimmer.isPersonalBest && "text-green-600 dark:text-green-400",
                  )}
                >
                  {swimmer.time}
                  {swimmer.isPersonalBest && (
                    <span className="ml-1 text-xs">⚡RP</span>
                  )}
                </td>
                <td
                  className={cn(
                    "p-2 text-right tabular-nums text-xs",
                    swimmer.delta.startsWith("-")
                      ? "text-green-600 dark:text-green-400"
                      : "text-muted-foreground",
                  )}
                >
                  {swimmer.delta}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <span className="text-green-600 dark:text-green-400">⚡RP</span>
          <span>Record personnel battu</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-green-600 dark:text-green-400">-0.00</span>
          <span>Temps amélioré vs engagement</span>
        </div>
      </div>
    </div>
  );
}

function ResultsContainer({ engagement }) {
  const url = `/api/results?race=${encodeURIComponent(
    engagement.label || "Épreuve",
  )}&engagementId=${encodeURIComponent(engagement.id || "unknown")}&meta=${encodeURIComponent(
    engagement.meta || "",
  )}`;

  const { data, error, isLoading } = useFetchJson(url);

  if (isLoading) return <ResultsListSkeleton />;

  if (error) {
    return <FetchError error={error} />;
  }

  return <ResultsTable data={data} />;
}

export function ResultTab({ engagement }) {
  if (!engagement) {
    return (
      <p className="text-sm text-muted-foreground">
        Aucune épreuve sélectionnée.
      </p>
    );
  }

  return <ResultsContainer engagement={engagement} />;
}
