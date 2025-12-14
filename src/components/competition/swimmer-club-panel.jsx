"use client";

/**
 * Panneau gauche: infos nageur + infos club.
 * C'est volontairement "dumb" et basé sur des props pour rester modulaire.
 */

import { Separator } from "@/components/ui/separator";

export function SwimmerClubPanel({ swimmer, club }) {
  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4 text-card-foreground">
        <div className="text-sm font-semibold">Nageur</div>
        <Separator className="my-3" />
        <dl className="grid gap-2 text-sm">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">Nom</dt>
            <dd className="font-medium">{swimmer.lastName || "—"}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">Prénom</dt>
            <dd className="font-medium">{swimmer.firstName || "—"}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">Licence</dt>
            <dd className="font-medium">{swimmer.license || "—"}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">Catégorie</dt>
            <dd className="font-medium">{swimmer.category || "—"}</dd>
          </div>
        </dl>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 text-card-foreground">
        <div className="text-sm font-semibold">Club</div>
        <Separator className="my-3" />
        <dl className="grid gap-2 text-sm">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">Nom</dt>
            <dd className="font-medium">{club.name || "—"}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">Ville</dt>
            <dd className="font-medium">{club.city || "—"}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">Code</dt>
            <dd className="font-medium">{club.code || "—"}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
