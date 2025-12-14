"use client";

/**
 * Onglet "Résultat" : placeholder + chart en bas.
 * Fetch les données de performance depuis l'API.
 */

import { PerformanceChart } from "@/components/competition/performance-chart";
import { EmptyState, FetchError } from "@/components/ui/fetch-states";
import { Separator } from "@/components/ui/separator";
import { useFetchJson } from "@/hooks/useFetchJson";

function PerformanceChartSkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-4 w-32 animate-pulse rounded bg-muted" />
      <div className="h-48 w-full animate-pulse rounded-md bg-muted" />
    </div>
  );
}

function _ResultTabSkeleton() {
  return (
    <div className="flex min-h-0 flex-col">
      <div>
        <div className="h-4 w-20 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-3 w-48 animate-pulse rounded bg-muted" />
      </div>

      <Separator className="my-4" />

      <div className="mt-auto">
        <PerformanceChartSkeleton />
      </div>
    </div>
  );
}

function PerformanceChartContainer({ eventId, license }) {
  const params = new URLSearchParams();
  if (eventId) params.set("eventId", eventId);
  if (license) params.set("license", license);

  const url = `/api/performance${params.toString() ? `?${params.toString()}` : ""}`;

  const { data: series, error, isLoading } = useFetchJson(url);

  if (isLoading) return <PerformanceChartSkeleton />;

  if (error) {
    return <FetchError error={error} />;
  }

  if (!series || !series.points?.length) {
    return <EmptyState message="Aucune donnée de performance disponible." />;
  }

  return (
    <div>
      <div className="mb-2 text-sm font-medium">Évolution du temps</div>
      <PerformanceChart series={series} />
    </div>
  );
}

export function ResultTab({ engagement }) {
  // Extraire l'eventId du label de l'engagement (ex: "200 NL" -> "200NL")
  const eventId = engagement?.label?.replace(/\s+/g, "") || null;

  return (
    <div className="flex min-h-0 flex-col">
      <div>
        <div className="text-sm font-semibold">Résultat</div>
        <p className="mt-1 text-sm text-muted-foreground">
          Placeholder: résultats officiels à venir.
        </p>
      </div>

      <Separator className="my-4" />

      <div className="mt-auto">
        <PerformanceChartContainer eventId={eventId} />
      </div>
    </div>
  );
}

/**
 * Version avec props directes (pour usage legacy ou tests).
 */
export function ResultTabWithSeries({ series }) {
  return (
    <div className="flex min-h-0 flex-col">
      <div>
        <div className="text-sm font-semibold">Résultat</div>
        <p className="mt-1 text-sm text-muted-foreground">
          Placeholder: résultats officiels à venir.
        </p>
      </div>

      <Separator className="my-4" />

      <div className="mt-auto">
        <div className="mb-2 text-sm font-medium">Évolution du temps</div>
        <PerformanceChart series={series} />
      </div>
    </div>
  );
}
