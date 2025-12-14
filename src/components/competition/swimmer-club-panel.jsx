"use client";

/**
 * Panneau droite: infos nageur + infos club.
 * Avec fetch depuis les API.
 */

import { EmptyState, FetchError } from "@/components/ui/fetch-states";
import { Separator } from "@/components/ui/separator";
import { useFetchJson } from "@/hooks/useFetchJson";

function SwimmerPanelSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 text-card-foreground">
      <div className="h-4 w-16 animate-pulse rounded bg-muted" />
      <Separator className="my-3" />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={`swimmer-skeleton-${index}`}
            className="flex items-center justify-between gap-3"
          >
            <div className="h-3 w-20 animate-pulse rounded bg-muted" />
            <div className="h-3 w-24 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}

function ClubPanelSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 text-card-foreground">
      <div className="h-4 w-12 animate-pulse rounded bg-muted" />
      <Separator className="my-3" />
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={`club-skeleton-${index}`}
            className="flex items-center justify-between gap-3"
          >
            <div className="h-3 w-16 animate-pulse rounded bg-muted" />
            <div className="h-3 w-28 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}

function SwimmerPanel({ swimmer }) {
  return (
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
  );
}

function ClubPanel({ club }) {
  return (
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
  );
}

function SwimmerContainer({ license }) {
  const url = license
    ? `/api/swimmer?license=${encodeURIComponent(license)}`
    : "/api/swimmer";

  const { data: swimmer, error, isLoading } = useFetchJson(url);

  if (isLoading) return <SwimmerPanelSkeleton />;

  if (error) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 text-card-foreground">
        <FetchError error={error} />
      </div>
    );
  }

  if (!swimmer) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 text-card-foreground">
        <EmptyState message="Aucun nageur trouvé." />
      </div>
    );
  }

  return <SwimmerPanel swimmer={swimmer} />;
}

function ClubContainer({ code }) {
  const url = code ? `/api/club?code=${encodeURIComponent(code)}` : "/api/club";

  const { data: club, error, isLoading } = useFetchJson(url);

  if (isLoading) return <ClubPanelSkeleton />;

  if (error) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 text-card-foreground">
        <FetchError error={error} />
      </div>
    );
  }

  if (!club) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 text-card-foreground">
        <EmptyState message="Aucun club trouvé." />
      </div>
    );
  }

  return <ClubPanel club={club} />;
}

/**
 * Container principal qui fetch nageur et club.
 */
export function SwimmerClubPanelContainer({ swimmerLicense, clubCode }) {
  return (
    <section className="space-y-4">
      <SwimmerContainer license={swimmerLicense} />
      <ClubContainer code={clubCode} />
    </section>
  );
}

/**
 * Version avec props directes (pour usage legacy ou tests).
 */
export function SwimmerClubPanel({ swimmer, club }) {
  return (
    <section className="space-y-4">
      <SwimmerPanel swimmer={swimmer} />
      <ClubPanel club={club} />
    </section>
  );
}
