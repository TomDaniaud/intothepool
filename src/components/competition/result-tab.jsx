"use client";

/**
 * Onglet "Résultat" : placeholder + chart en bas.
 */

import { Separator } from "@/components/ui/separator";
import { PerformanceChart } from "@/components/competition/performance-chart";

export function ResultTab({ series }) {
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
