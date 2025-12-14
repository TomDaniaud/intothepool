"use client";

/**
 * Onglet "Engagement" : infos textuelles sur l'épreuve sélectionnée.
 */

import { useFetchJson } from "@/hooks/useFetchJson";

function SeriesContainerSkeleton() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
        <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
      </div>

      <div className="overflow-hidden rounded-md border border-border">
        <div className="grid grid-cols-4 gap-2 border-b border-border bg-muted/40 p-2">
          <div className="col-span-2 h-3 animate-pulse rounded bg-muted" />
          <div className="col-span-2 h-3 animate-pulse rounded bg-muted" />
        </div>
        <div className="space-y-2 p-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={`skeleton-row-${index}`}
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
    </div>
  );
}

function SeriesTable({ series }) {
  if (!series?.swimmers?.length) {
    return (
      <div className="py-4 text-center text-sm text-muted-foreground">
        Aucune série disponible.
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-evenly space-y-4">
      <div className="overflow-hidden rounded-md border border-border">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-sm">
              <th colSpan={4} className="p-2 text-left font-medium">
                {series.race}
              </th>
              <th colSpan={2} className="p-2 text-right font-medium">
                Série ({series.nb}/{series.maxNb})
              </th>
            </tr>
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th className="p-2 text-left font-medium">Couloir</th>
              <th className="p-2 text-left font-medium">Nageur</th>
              <th className="p-2 text-left font-medium">Club</th>
              <th className="p-2 text-left font-medium">Temps</th>
              <th className="p-2 text-right font-medium" colSpan={2}></th>
            </tr>
          </thead>
          <tbody>
            {series.swimmers.map((swimmer) => {
              const rowClassName = swimmer.isSelected
                ? "bg-accent text-accent-foreground"
                : "";

              return (
                <tr
                  key={swimmer.lane}
                  className={`border-b border-border text-sm last:border-b-0 ${rowClassName}`}
                >
                  <td className="p-2 font-medium">{swimmer.lane}</td>
                  <td className="p-2">{swimmer.name}</td>
                  <td className="p-2 text-muted-foreground">{swimmer.club}</td>
                  <td className="p-2 tabular-nums">{swimmer.entryTime}</td>
                  <td className="p-2 text-right" colSpan={2}>
                    {swimmer.isSelected ? (
                      <span className="text-xs font-medium">Vous</span>
                    ) : null}
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

function SeriesContainer({ engagement, competId = "mock" }) {
  const url = `/api/series?compet=${encodeURIComponent(competId)}&race=${encodeURIComponent(
    engagement.label || "Épreuve",
  )}&engagementId=${encodeURIComponent(engagement.id || "unknown")}&meta=${encodeURIComponent(
    engagement.meta || "",
  )}`;

  const { data: series, error, isLoading } = useFetchJson(url);

  if (isLoading) return <SeriesContainerSkeleton />;
  if (error) throw error;

  return <SeriesTable series={series} />;
}

export function EngagementTab({ engagement }) {
  if (!engagement) {
    return (
      <p className="text-sm text-muted-foreground">
        Aucune épreuve sélectionnée.
      </p>
    );
  }

  return (
    <div>
      {/* <div className="text-sm font-semibold">{engagement.label}</div>
      {engagement.meta ? (
        <div className="mt-1 text-sm text-muted-foreground">{engagement.meta}</div>
      ) : null}

      <Separator className="my-4" /> */}

      <SeriesContainer engagement={engagement} />
    </div>
  );
}
