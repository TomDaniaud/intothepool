"use client";

/**
 * Onglet "Résultat" : classement de la course.
 * Reçoit competId et engagement en props.
 */

import { EmptyState, FetchError } from "@/components/ui/fetch-states";
import { useFetchJson } from "@/hooks/useFetchJson";
import { cn } from "@/lib/utils";

function ResultsListSkeleton() {
  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-md border border-border">
        <div className="space-y-2 p-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="grid grid-cols-5 gap-2">
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
  if (!data?.results?.length) {
    return <EmptyState message="Aucun résultat disponible." />;
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-md border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
              <th className="p-2 text-left font-medium">Place</th>
              <th className="p-2 text-left font-medium">Nageur</th>
              <th className="p-2 text-left font-medium">Club</th>
              <th className="p-2 text-left font-medium">Temps</th>
              <th className="p-2 text-right font-medium">Delta</th>
            </tr>
          </thead>
          <tbody>
            {data.results.map((swimmer) => (
              <tr
                key={swimmer.rank}
                className={cn(
                  "border-b border-border last:border-b-0",
                  swimmer.isSelected && "bg-accent text-accent-foreground"
                )}
              >
                <td className="p-2 font-medium">{swimmer.rank}</td>
                <td className="p-2">
                  {swimmer.name}
                  {swimmer.isSelected && <span className="ml-1 text-xs font-medium text-primary">★</span>}
                </td>
                <td className="p-2 text-muted-foreground">{swimmer.club}</td>
                <td
                  className={cn(
                    "p-2 tabular-nums font-medium",
                    swimmer.isPersonalBest && "text-green-600 dark:text-green-400"
                  )}
                >
                  {swimmer.time}
                  {swimmer.isPersonalBest && <span className="ml-1 text-xs">⚡RP</span>}
                </td>
                <td
                  className={cn(
                    "p-2 text-right tabular-nums text-xs",
                    swimmer.delta?.startsWith("-")
                      ? "text-green-600 dark:text-green-400"
                      : "text-muted-foreground"
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
      </div>
    </div>
  );
}

export function ResultTab({ competId, engagement }) {
  const params = new URLSearchParams();
  if (competId) params.set("competId", competId);
  if (engagement?.label) params.set("race", engagement.label);
  if (engagement?.id) params.set("engagementId", engagement.id);
  if (engagement?.meta) params.set("meta", engagement.meta);

  const url = competId && engagement ? `/api/results?${params.toString()}` : null;
  const { data, error, isLoading } = useFetchJson(url);

  if (!engagement) {
    return <p className="text-sm text-muted-foreground">Aucune épreuve sélectionnée.</p>;
  }

  if (isLoading) return <ResultsListSkeleton />;
  if (error) return <FetchError error={error} />;

  return <ResultsTable data={data} />;
}
