"use client";

/**
 * Onglet "Analyse" : statistiques du résultat + temps de passage.
 * Reçoit competId, license, engagement et result en props.
 */

import { PerformanceChart } from "@/components/competition/performance-chart";
import { useQualificationTime } from "@/hooks/useQualification";
import { EmptyState, FetchError } from "@/components/ui/fetch-states";
import { Separator } from "@/components/ui/separator";
import { useFetchJson } from "@/hooks/useFetchJson";
import { cn } from "@/lib/utils";
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
);

function AnalysisSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded bg-muted" />
        ))}
      </div>
      <div className="h-48 animate-pulse rounded bg-muted" />
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

function RankingCard({ label, rank, total }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold tabular-nums">
        {rank ? `${rank}${total ? `/${total}` : ""}` : "—"}
      </div>
    </div>
  );
}

function SplitsTable({ splits }) {
  if (!splits?.length) return null;

  // Convertir les temps en secondes pour calculer les splits
  const timeToSeconds = (timeStr) => {
    if (!timeStr) return null;
    const parts = timeStr.split(/[:.]/).map(Number);
    if (parts.length === 3) return parts[0] * 60 + parts[1] + parts[2] / 100;
    if (parts.length === 2) return parts[0] + parts[1] / 100;
    return null;
  };

  const formatSeconds = (sec) => {
    if (sec === null) return "—";
    const minutes = Math.floor(sec / 60);
    const rest = sec - minutes * 60;
    const s = Math.floor(rest);
    const cs = Math.round((rest - s) * 100);
    return minutes > 0 
      ? `${minutes}:${s.toString().padStart(2, "0")}.${cs.toString().padStart(2, "0")}`
      : `${s}.${cs.toString().padStart(2, "0")}`;
  };

  // Calculer les temps au tour à partir des temps cumulés
  const cumulatives = splits.map((s) => timeToSeconds(s.cumulative));
  const computedSplits = splits.map((s, i) => {
    const cumSec = cumulatives[i];
    const prevCumSec = i > 0 ? cumulatives[i - 1] : 0;
    const splitSec = cumSec !== null && prevCumSec !== null ? cumSec - prevCumSec : null;
    return {
      distance: s.distance,
      split: splitSec !== null ? formatSeconds(splitSec) : "—",
      cumulative: s.cumulative || "—",
    };
  });

  return (
    <div className="overflow-hidden rounded-md border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
            <th className="p-2 text-left font-medium">Distance</th>
            <th className="p-2 text-left font-medium">Temps</th>
            <th className="p-2 text-left font-medium">Cumulé</th>
          </tr>
        </thead>
        <tbody>
          {computedSplits.map((split) => (
            <tr key={split.distance} className="border-b border-border last:border-b-0">
              <td className="p-2 font-medium">{split.distance}</td>
              <td className="p-2 tabular-nums">{split.split}</td>
              <td className="p-2 tabular-nums text-muted-foreground">{split.cumulative}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Graphique Chart.js minimaliste des temps de passage
 */
function SplitsChart({ splits }) {
  if (!splits?.length) return null;

  // Convertir les temps en secondes
  const timeToSeconds = (timeStr) => {
    if (!timeStr) return null;
    const parts = timeStr.split(/[:.]/).map(Number);
    if (parts.length === 3) {
      // mm:ss.cs
      return parts[0] * 60 + parts[1] + parts[2] / 100;
    } else if (parts.length === 2) {
      // ss.cs
      return parts[0] + parts[1] / 100;
    }
    return null;
  };

  // Calculer les temps au tour à partir des temps cumulés
  const cumulatives = splits.map((s) => timeToSeconds(s.cumulative));
  const dataPoints = splits
    .map((s, i) => {
      const cumSec = cumulatives[i];
      const prevCumSec = i > 0 ? cumulatives[i - 1] : 0;
      // Calculer le split (temps au tour) = cumulé actuel - cumulé précédent
      const splitSec = cumSec !== null && prevCumSec !== null ? cumSec - prevCumSec : null;
      return {
        distance: s.distance.replace(" m", ""),
        value: splitSec,
      };
    })
    .filter((p) => p.value !== null && p.value > 0);

  if (dataPoints.length < 2) return null;

  // Calcul de la moyenne
  const avg =
    dataPoints.reduce((acc, p) => acc + p.value, 0) / dataPoints.length;

  const getCssVar = (name, fallback) => {
    if (typeof window === "undefined") return fallback;
    const raw = getComputedStyle(document.documentElement).getPropertyValue(name);
    return raw?.trim() || fallback;
  };

  const border = getCssVar("--color-primary", "hsl(220 70% 50%)");
  const muted = getCssVar("--color-muted-foreground", "hsl(0 0% 45%)");
  const avgColor = getCssVar("--color-accent", "hsl(45 90% 55%)");

  const data = {
    labels: dataPoints.map((p) => p.distance),
    datasets: [
      {
        label: "Split",
        data: dataPoints.map((p) => p.value),
        borderColor: border,
        backgroundColor: `${border}20`,
        pointBackgroundColor: border,
        pointRadius: 3,
        tension: 0.3,
      },
      {
        label: "Moyenne",
        data: Array(dataPoints.length).fill(avg),
        borderColor: avgColor,
        borderDash: [6, 6],
        pointRadius: 2,
        fill: false,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const sec = ctx.parsed.y;
            const s = Math.floor(sec);
            const cs = Math.round((sec - s) * 100);
            return `${s}.${cs.toString().padStart(2, "0")}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: muted, font: { size: 10 } },
      },
      y: {
        grid: { display: false },
        ticks: { display: false },
      },
    },
  };

  return (
    <div className="absolute inset-0">
      <Line data={data} options={options} />
    </div>
  );
}

function AnalysisContent({ engagement, result, totalResults, qualificationTime, swimmerRanking, progressionData }) {
  if (!engagement) {
    return <EmptyState message="Aucune épreuve sélectionnée." />;
  }

  // Calculer l'amélioration (temps d'engagement - temps réalisé)
  const engagementTime = engagement?.meta?.match(/(\d{2}:\d{2}\.\d{2})/)?.[1] || null;
  const actualTime = result?.time || null;
  
  const improvement = (() => {
    if (!engagementTime || !actualTime) return null;
    const parseTime = (t) => {
      const parts = t.split(/[:.]/).map(Number);
      if (parts.length === 3) return parts[0] * 60 + parts[1] + parts[2] / 100;
      return null;
    };
    const engSec = parseTime(engagementTime);
    const actSec = parseTime(actualTime);
    if (engSec === null || actSec === null) return null;
    const diff = actSec - engSec;
    const sign = diff >= 0 ? "+" : "-";
    const absDiff = Math.abs(diff);
    const sec = Math.floor(absDiff);
    const cs = Math.round((absDiff - sec) * 100);
    return `${sign}${sec.toString().padStart(2, "0")}.${cs.toString().padStart(2, "0")}`;
  })();

  const improvementHighlight = improvement?.startsWith("-") ? "positive" : improvement?.startsWith("+") ? "negative" : null;

  return (
    <div className="space-y-6">
      <div>
        <div className="text-sm font-semibold">{engagement?.label}</div>
        <div className="text-xs text-muted-foreground">Analyse de votre performance</div>
      </div>

      {/* Graphique d'évolution du temps (TODO: alimenter avec les données historiques) */}
      {progressionData?.points?.length > 0 && (
        <div>
          <div className="mb-2 text-sm font-medium">Évolution du temps</div>
          <PerformanceChart series={progressionData} />
        </div>
      )}

      {/* Statistiques principales */}
      <div>
        <div className="mb-3 text-sm font-medium">Performance</div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatCard label="Temps engagé" value={engagementTime || "—"} />
          <StatCard 
            label="Temps réalisé" 
            value={actualTime || "—"} 
            highlight={actualTime ? (improvement?.startsWith("-") ? "positive" : null) : null}
          />
          <StatCard
            label="Amélioration"
            value={improvement || "—"}
            highlight={improvementHighlight}
          />
          <StatCard
            label="Temps qualif"
            value={qualificationTime || "—"}
            subtext="France Open"
            featured={!!qualificationTime}
          />
          <StatCard label="Points" value={result?.points ? `${result.points} pts` : "—"} />
          <StatCard 
            label="Classement" 
            value={result?.rank ? `${result.rank}${totalResults ? `/${totalResults}` : ""}` : "—"} 
          />
        </div>
      </div>

      {/* Classement National */}
      <div>
        <div className="mb-3 text-sm font-medium">Classement</div>
        <div className="grid grid-cols-2 gap-3">
          <RankingCard
            label="National par âge"
            rank={swimmerRanking?.ageRank}
            total={swimmerRanking?.ageTotal}
          />
          <RankingCard
            label="National total"
            rank={swimmerRanking?.overallRank}
            total={swimmerRanking?.overallTotal}
          />
        </div>
      </div>

      {/* Temps de passage */}
      {result?.splits?.length > 0 && (
        <>
          <div>
            <div className="mb-3 text-sm font-medium">Temps de passage</div>
            <div className="flex max-sm:flex-col items-center gap-4 justify-center">
              <div className="w-full sm:flex-2">
                <SplitsTable splits={result.splits} />
              </div>
              <div className="w-full sm:flex-3 relative flex items-center justify-center min-h-64">
                <SplitsChart splits={result.splits} />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function AnalysisTab({ competId, license, engagement }) {
  const raceId = engagement?.raceId;
  const eventLabel = engagement?.label;

  // Fetch les résultats de la course pour ce nageur (inclut swimmerRanking)
  const resultsUrl = competId && raceId && license
    ? `/api/results?competId=${competId}&raceId=${raceId}&swimmerId=${license}`
    : null;
  const { data: resultsData, error: resultsError, isLoading: resultsLoading } = useFetchJson(resultsUrl);

  // Fetch l'évolution du temps (historique des performances)
  const eventId = eventLabel?.replace(/\s+/g, "") || null;
  const analysisUrl = eventId && license
    ? `/api/analysis?eventId=${eventId}&eventLabel=${encodeURIComponent(eventLabel)}&license=${license}&competId=${competId}`
    : null;
  const { data: analysisData } = useFetchJson(analysisUrl);

  // Récupérer les infos du nageur pour le temps de qualif
  const swimmerUrl = license && competId
    ? `/api/swimmer?competId=${competId}&license=${license}`
    : null;
  const { data: swimmerData } = useFetchJson(swimmerUrl);
  const swimmer = Array.isArray(swimmerData) ? swimmerData[0] : swimmerData;

  // Récupérer le temps de qualification pour cette course
  const { data: qualData } = useQualificationTime({ 
    gender: swimmer?.gender, 
    birthYear: swimmer?.birthYear, 
    race: engagement?.label
  });
  const qualificationTime = qualData?.time;

  if (!engagement) {
    return <p className="text-sm text-muted-foreground">Aucune épreuve sélectionnée.</p>;
  }

  if (resultsLoading) return <AnalysisSkeleton />;
  if (resultsError) return <FetchError error={resultsError} />;

  // Extraire le résultat du nageur et le total
  const swimmerResult = resultsData?.swimmer || null;
  const totalResults = resultsData?.race?.results?.length || 0;

  // Classement national depuis la réponse results
  const swimmerRanking = resultsData?.swimmerRanking || null;

  // Données d'évolution depuis /api/analysis
  const progressionData = analysisData ? {
    eventLabel: analysisData.eventLabel,
    points: analysisData.progressionPoints,
  } : null;

  return (
    <AnalysisContent 
      engagement={engagement}
      result={swimmerResult}
      totalResults={totalResults}
      qualificationTime={qualificationTime}
      swimmerRanking={swimmerRanking}
      progressionData={progressionData}
    />
  );
}
