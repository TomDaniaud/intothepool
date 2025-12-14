"use client";

/**
 * Chart.js (mock) pour afficher l'évolution d'un temps.
 * - Modulaire: ce composant ne dépend que d'une série de points.
 * - Style: utilise les tokens CSS (pas de couleurs hardcodées).
 */

import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
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
  Legend,
  Filler,
);

function getCssVar(name, fallback) {
  if (typeof window === "undefined") return fallback;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name);
  return raw?.trim() || fallback;
}

function formatSeconds(seconds) {
  if (!Number.isFinite(seconds)) return "";
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds - minutes * 60;
  const sec = Math.floor(remaining);
  const centi = Math.round((remaining - sec) * 100);
  return minutes > 0
    ? `${minutes}:${String(sec).padStart(2, "0")}.${String(centi).padStart(2, "0")}`
    : `${sec}.${String(centi).padStart(2, "0")}`;
}

export function PerformanceChart({ series }) {
  const labels = series?.points?.map((p) => p.dateLabel) ?? [];
  const values = series?.points?.map((p) => p.timeSeconds) ?? [];

  const border = getCssVar("--color-primary", "hsl(0 0% 10%)");
  const muted = getCssVar("--color-muted-foreground", "hsl(0 0% 45%)");
  const grid = getCssVar("--color-border", "hsl(0 0% 85%)");

  const data = {
    labels,
    datasets: [
      {
        label: series?.eventLabel ?? "Évolution",
        data: values,
        borderColor: border,
        backgroundColor: "transparent",
        pointBackgroundColor: border,
        pointBorderColor: border,
        pointRadius: 3,
        tension: 0.25,
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
          label: (ctx) => formatSeconds(ctx.parsed.y),
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: muted },
      },
      y: {
        grid: { color: grid },
        ticks: {
          color: muted,
          callback: (value) => formatSeconds(Number(value)),
        },
      },
    },
  };

  return (
    <div className="h-48 w-full">
      <Line data={data} options={options} />
    </div>
  );
}
