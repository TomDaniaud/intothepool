"use client";

/**
 * Onglet "Analyse" : graphique de progression + statistiques.
 * Reçoit competId, license et engagement en props.
 */

import { PerformanceChart } from "@/components/competition/performance-chart";
import { useQualificationTime } from "@/hooks/useQualification";
import { EmptyState, FetchError } from "@/components/ui/fetch-states";
import { Separator } from "@/components/ui/separator";
import { useFetchJson } from "@/hooks/useFetchJson";
import { cn } from "@/lib/utils";

function AnalysisSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
      </div>
      <div className="h-48 animate-pulse rounded bg-muted" />
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded bg-muted" />
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value, subtext, highlight, featured }) {
  return (
    <div
      className={cn(
        "rounded-md border p-3",
        featured
          ? "border-2 border-yellow-400 bg-yellow-50 dark:border-yellow-500 dark:bg-yellow-950/20"
          : "border-border bg-muted/20"
      )}
    >
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        className={cn(
          "mt-1 text-lg font-semibold tabular-nums",
          highlight === "positive" && "text-green-600 dark:text-green-400",
          highlight === "negative" && "text-red-600 dark:text-red-400"
        )}
      >
        {value}
      </div>
      {subtext && <div className="text-xs text-muted-foreground">{subtext}</div>}
    </div>
  );
}

function ComparisonCard({ label, avgTime, delta }) {
  const isPositive = delta?.startsWith("-");
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-medium tabular-nums">{avgTime}</div>
      <div
        className={cn(
          "text-xs tabular-nums",
          isPositive ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
        )}
      >
        {delta}
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
            <tr key={split.distance} className="border-b border-border last:border-b-0">
              <td className="p-2 font-medium">{split.distance}</td>
              <td className="p-2 tabular-nums">{split.time}</td>
              <td className="p-2 tabular-nums text-muted-foreground">{split.cumulative}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AnalysisContent({ data, qualificationTime }) {
  if (!data) {
    return <EmptyState message="Aucune donnée d'analyse disponible." />;
  }

  const progressionHighlight = data.stats?.progression?.startsWith("-") ? "positive" : "negative";

  return (
    <div className="space-y-6">
      <div>
        <div className="text-sm font-semibold">{data.eventLabel}</div>
        <div className="text-xs text-muted-foreground">Analyse de vos performances</div>
      </div>

      {data.progressionPoints?.length > 0 && (
        <div>
          <div className="mb-2 text-sm font-medium">Évolution du temps</div>
          <PerformanceChart series={{ eventLabel: data.eventLabel, points: data.progressionPoints }} />
        </div>
      )}

      <Separator />

      {data.stats && (
        <div>
          <div className="mb-3 text-sm font-medium">Statistiques</div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatCard label="Meilleur temps" value={data.stats.bestTime} highlight="positive" />
            <StatCard label="Temps moyen" value={data.stats.averageTime} />
            <StatCard
              label="Progression"
              value={data.stats.progression}
              subtext="depuis le début"
              highlight={progressionHighlight}
            />
            <StatCard
              label="Temps qualif"
              value={qualificationTime || "—"}
              subtext="France Open"
              featured={!!qualificationTime}
            />
            <StatCard label="Podiums" value={data.stats.podiums} />
            <StatCard label="Records perso" value={data.stats.personalBests} subtext="battus" />
          </div>
        </div>
      )}

      {data.comparison && (
        <>
          <Separator />
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
        </>
      )}

      {data.splits?.length > 0 && (
        <>
          <Separator />
          <div>
            <div className="mb-3 text-sm font-medium">Temps de passage</div>
            <SplitsTable splits={data.splits} />
          </div>
        </>
      )}
    </div>
  );
}

export function AnalysisTab({ competId, license, engagement }) {
  const eventId = engagement?.label?.replace(/\s+/g, "") || null;
  const eventLabel = engagement?.label || null;

  const params = new URLSearchParams();
  if (eventId) params.set("eventId", eventId);
  if (license) params.set("license", license);

  const url = eventId ? `/api/analysis?${params.toString()}` : null;
  const { data, error, isLoading } = useFetchJson(url);

  // Récupérer les infos du nageur pour le temps de qualif
  const swimmerUrl = license && competId
    ? `/api/swimmer?competId=${competId}&license=${license}`
    : null;
  const { data: swimmerData } = useFetchJson(swimmerUrl);
  const swimmer = Array.isArray(swimmerData) ? swimmerData[0] : swimmerData;

  // Récupérer le temps de qualification pour cette course
  const birthYear = swimmer?.birthYear;
  const gender = swimmer?.gender || "M";
  // Toujours appeler le hook, mais passer null si données manquantes
  const { data: qualData } = useQualificationTime(
    birthYear && gender && engagement?.label
      ? { gender, birthYear, race: engagement.label }
      : { gender: null, birthYear: null, race: null }
  );
  const qualificationTime = qualData?.time;

  if (!engagement) {
    return <p className="text-sm text-muted-foreground">Aucune épreuve sélectionnée.</p>;
  }

  if (isLoading) return <AnalysisSkeleton />;
  if (error) return <FetchError error={error} />;

  return <AnalysisContent data={data} qualificationTime={qualificationTime} />;
}
