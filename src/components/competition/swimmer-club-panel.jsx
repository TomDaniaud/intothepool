"use client";

/**
 * Panneau droite: infos nageur + infos club.
 * Reçoit competId, license, clubCode en props.
 */

import { EmptyState, FetchError } from "@/components/ui/fetch-states";
import { Separator } from "@/components/ui/separator";
import { useFetchJson } from "@/hooks/useFetchJson";
import { capitalize } from "@/lib/utils";

function SwimmerPanelSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 text-card-foreground">
      <div className="h-4 w-16 animate-pulse rounded bg-muted" />
      <Separator className="my-3" />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between gap-3">
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
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between gap-3">
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
          <dd className="font-medium">{swimmer.id || "—"}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted-foreground">Catégorie</dt>
          <dd className="font-medium">{swimmer.gender || "—"}</dd>
        </div>
      </dl>
    </div>
  );
}

function ClubPanel({ club }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 text-card-foreground">
      <div className="text-sm font-semibold">{capitalize(club.type)}</div>
      <Separator className="my-3" />
      <dl className="grid gap-2 text-sm">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted-foreground">Nom</dt>
          <dd className="font-medium">{capitalize(club.name) || "—"}</dd>
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

function SwimmerContainer({ competId, license }) {
  const url = license
    ? `/api/swimmer?competId=${encodeURIComponent(competId)}&license=${encodeURIComponent(license)}`
    : null;

  const { data: swimmer, error, isLoading } = useFetchJson(url);

  if (!license) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 text-card-foreground">
        <EmptyState message="Aucun nageur sélectionné." />
      </div>
    );
  }

  if (isLoading) return <SwimmerPanelSkeleton />;

  if (error) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 text-card-foreground">
        <FetchError error={error} />
      </div>
    );
  }

  const swimmerData = Array.isArray(swimmer) ? swimmer[0] : swimmer;

  if (!swimmerData) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 text-card-foreground">
        <EmptyState message="Aucun nageur trouvé." />
      </div>
    );
  }

  return <SwimmerPanel swimmer={swimmerData} />;
}

function ClubContainer({ competId, clubCode }) {
  const url = clubCode
    ? `/api/club?competId=${encodeURIComponent(competId)}&clubId=${encodeURIComponent(clubCode)}`
    : null;

  const { data: club, error, isLoading } = useFetchJson(url);

  if (!clubCode) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 text-card-foreground">
        <EmptyState message="Aucun club sélectionné." />
      </div>
    );
  }

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
export function SwimmerClubPanelContainer({ competId, license, clubCode }) {
  return (
    <section className="space-y-4">
      <SwimmerContainer competId={competId} license={license} />
      <ClubContainer competId={competId} clubCode={clubCode} />
    </section>
  );
}
