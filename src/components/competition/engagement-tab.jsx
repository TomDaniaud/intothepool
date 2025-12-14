"use client";

/**
 * Onglet "Engagement" : infos textuelles sur l'épreuve sélectionnée.
 */

import { Separator } from "@/components/ui/separator";

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
      <div className="text-sm font-semibold">{engagement.label}</div>
      {engagement.meta ? (
        <div className="mt-1 text-sm text-muted-foreground">{engagement.meta}</div>
      ) : null}

      <Separator className="my-4" />

      <p className="text-sm text-muted-foreground">
        Placeholder: détails complets (scraping) à venir.
      </p>
    </div>
  );
}
