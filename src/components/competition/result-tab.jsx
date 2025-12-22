"use client";

/**
 * Onglet "Résultat" : classement de la course.
 * Reçoit competId, raceId et swimmerId en props.
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

function ResultsTable({ data, swimmerId }) {
  if (!data?.results?.length) {
    return <EmptyState message="Aucun résultat disponible." />;
  }

  return (
    <div className="space-y-4">
      {data.raceName && (
        <div className="text-sm text-muted-foreground">
          {data.raceName}
          {data.raceDate && <span className="ml-2 text-xs">({data.raceDate})</span>}
        </div>
      )}

      <div className="overflow-hidden rounded-md border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
              <th className="p-2 text-left font-medium">Place</th>
              <th className="p-2 text-left font-medium">Nageur</th>
              <th className="p-2 text-left font-medium">Club</th>
              <th className="p-2 text-left font-medium">Temps</th>
              <th className="p-2 text-right font-medium">Points</th>
            </tr>
          </thead>
          <tbody>
            {data.results.map((swimmer, idx) => {
              const isSelected = swimmer.swimmerId === swimmerId;
              return (
                <tr
                  key={swimmer.swimmerId || idx}
                  className={cn(
                    "border-b border-border last:border-b-0",
                    isSelected && "bg-accent text-accent-foreground"
                  )}
                >
                  <td className="p-2 font-medium">{swimmer.rank ?? "—"}</td>
                  <td className="p-2">
                    {swimmer.name}
                    {swimmer.birthYear && (
                      <span className="ml-1 text-xs text-muted-foreground">({swimmer.birthYear})</span>
                    )}
                    {isSelected && <span className="ml-1 text-xs font-medium text-primary">★</span>}
                  </td>
                  <td className="p-2 text-muted-foreground">{swimmer.club || "—"}</td>
                  <td className="p-2 tabular-nums font-medium">
                    {swimmer.time || "—"}
                    {swimmer.remark && (
                      <span className="ml-1 text-xs text-destructive">{swimmer.remark}</span>
                    )}
                  </td>
                  <td className="p-2 text-right tabular-nums text-xs text-muted-foreground">
                    {swimmer.points ? `${swimmer.points} pts` : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ResultTab({ competId, raceId, swimmerId }) {
  const params = new URLSearchParams();
  if (competId) params.set("competId", competId);
  if (raceId) params.set("raceId", raceId);
  // if (swimmerId) params.set("swimmerId", swimmerId);

  const url = competId && raceId ? `/api/results?${params.toString()}` : null;
  const { data, error, isLoading } = useFetchJson(url);

  if (!raceId) {
    return <p className="text-sm text-muted-foreground">Aucune épreuve sélectionnée.</p>;
  }

  if (isLoading) return <ResultsListSkeleton />;
  if (error) return <FetchError error={error} />;

  return <ResultsTable data={data} swimmerId={swimmerId} />;
}
