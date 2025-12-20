"use client";

/**
 * Onglet "Analyse" : graphique de progression + statistiques détaillées.
 * Utilise le store de compétition pour accéder aux IDs.
 */

import { PerformanceChart } from "@/components/competition/performance-chart";
import { EmptyState, FetchError } from "@/components/ui/fetch-states";
import { Separator } from "@/components/ui/separator";
import { useFetchJson } from "@/hooks/useFetchJson";
import { cn } from "@/lib/utils";
import { useCompetitionStore, useApiUrl } from "@/components/competition-store-provider";

function AnalysisSkeleton() {
  return (
    <div className="space-y-6">
      {/* Chart skeleton */}
      <div className="space-y-2">
        <div className="h-4 w-40 animate-pulse rounded bg-muted" />
        <div className="h-48 w-full animate-pulse rounded-md bg-muted" />
      </div>

      {/* Stats skeleton */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div
            key={`stat-skeleton-${idx}`}
            className="rounded-lg border border-border p-3"
          >
            <div className="h-3 w-16 animate-pulse rounded bg-muted" />
            <div className="mt-2 h-6 w-20 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>

      {/* Comparison skeleton */}
      <div className="space-y-2">
        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, idx) => (
            <div
              key={`comp-skeleton-${idx}`}
              className="rounded-lg border border-border p-3"
            >
              <div className="h-3 w-20 animate-pulse rounded bg-muted" />
              <div className="mt-2 h-5 w-16 animate-pulse rounded bg-muted" />
              <div className="mt-1 h-3 w-12 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, subtext, highlight }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        className={cn(
          "mt-1 text-lg font-semibold tabular-nums",
          highlight === "positive" && "text-green-600 dark:text-green-400",
          highlight === "negative" && "text-red-600 dark:text-red-400",
        )}
      >
        {value}
      </div>
      {subtext && (
        <div className="mt-0.5 text-xs text-muted-foreground">{subtext}</div>
      )}
    </div>
  );
}

function ComparisonCard({ label, avgTime, delta }) {
  const isPositive = delta.startsWith("-");

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-medium tabular-nums">{avgTime}</div>
      <div
        className={cn(
          "mt-0.5 text-xs font-medium tabular-nums",
          isPositive
            ? "text-green-600 dark:text-green-400"
            : "text-red-600 dark:text-red-400",
        )}
      >
        {delta} vs vous
      </div>
    </div>
  );
}

function SplitsTable({ splits }) {
  if (!splits?.length) return null;

  return (
    <div className="overflow-hidden rounded-md border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
            <th className="p-2 text-left font-medium">Distance</th>
            <th className="p-2 text-left font-medium">Passage</th>
            <th className="p-2 text-left font-medium">Cumulé</th>
          </tr>
        </thead>
        <tbody>
          {splits.map((split) => (
            <tr
              key={split.distance}
              className="border-b border-border last:border-b-0"
            >
              <td className="p-2 font-medium">{split.distance}</td>
              <td className="p-2 tabular-nums">{split.time}</td>
              <td className="p-2 tabular-nums text-muted-foreground">
                {split.cumulative}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AnalysisContent({ data }) {
  if (!data) {
    return <EmptyState message="Aucune donnée d'analyse disponible." />;
  }

  const progressionHighlight = data.stats.progression.startsWith("-")
    ? "positive"
    : "negative";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="text-sm font-semibold">{data.eventLabel}</div>
        <div className="text-xs text-muted-foreground">
          Analyse de vos performances sur cette épreuve
        </div>
      </div>

      {/* Chart de progression */}
      <div>
        <div className="mb-2 text-sm font-medium">Évolution du temps</div>
        <PerformanceChart
          series={{
            eventLabel: data.eventLabel,
            points: data.progressionPoints,
          }}
        />
      </div>

      <Separator />

      {/* Statistiques principales */}
      <div>
        <div className="mb-3 text-sm font-medium">Statistiques</div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatCard
            label="Meilleur temps"
            value={data.stats.bestTime}
            highlight="positive"
          />
          <StatCard label="Temps moyen" value={data.stats.averageTime} />
          <StatCard
            label="Progression"
            value={data.stats.progression}
            subtext="depuis le début"
            highlight={progressionHighlight}
          />
          <StatCard
            label="Courses"
            value={data.stats.totalRaces}
            subtext="cette saison"
          />
          <StatCard label="Podiums" value={data.stats.podiums} />
          <StatCard
            label="Records perso"
            value={data.stats.personalBests}
            subtext="battus"
          />
        </div>
      </div>

      <Separator />

      {/* Comparaisons */}
      <div>
        <div className="mb-3 text-sm font-medium">Comparaison</div>
        <div className="grid grid-cols-2 gap-3">
          <ComparisonCard
            label="Moyenne régionale"
            avgTime={data.comparison.regionalAvg}
            delta={data.comparison.vsRegional}
          />
          <ComparisonCard
            label="Moyenne nationale"
            avgTime={data.comparison.nationalAvg}
            delta={data.comparison.vsNational}
          />
        </div>
      </div>

      <Separator />

      {/* Splits */}
      <div>
        <div className="mb-3 text-sm font-medium">Temps de passage</div>
        <SplitsTable splits={data.splits} />
      </div>
    </div>
  );
}

function AnalysisContainer({ engagement }) {
  const store = useCompetitionStore();
  const eventId = engagement?.label?.replace(/\s+/g, "") || null;

  const url = useApiUrl("/api/analysis", {
    eventId,
    license: store.license,
  });

  const shouldFetch = Boolean(eventId);
  const { data, error, isLoading } = useFetchJson(shouldFetch ? url : null);

  if (isLoading) return <AnalysisSkeleton />;

  if (error) {
    return <FetchError error={error} />;
  }

  return <AnalysisContent data={data} />;
}

export function AnalysisTab({ engagement }) {
  if (!engagement) {
    return (
      <p className="text-sm text-muted-foreground">
        Aucune épreuve sélectionnée.
      </p>
    );
  }

  return <AnalysisContainer engagement={engagement} />;
}
