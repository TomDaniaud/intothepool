"use client";

/**
 * Onglet "Qualification" : liste des temps de qualification pour le nageur.
 * Affiche tous les temps de qualif pour l'âge/année du nageur.
 */

import { useState } from "react";
import { Trophy } from "lucide-react";
import { EmptyState, FetchError } from "@/components/ui/fetch-states";
import { useFetchJson } from "@/hooks/useFetchJson";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

function QualificationSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-9 w-48 animate-pulse rounded bg-muted" />
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded bg-muted" />
        ))}
      </div>
    </div>
  );
}

function QualificationRow({ qualification, isHighlighted }) {
  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-md border p-3",
        isHighlighted
          ? "border-2 border-yellow-400 bg-yellow-50 dark:border-yellow-500 dark:bg-yellow-950/20"
          : "border-border bg-muted/20"
      )}
    >
      <div className="flex items-center gap-3">
        <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Trophy className="size-4" />
        </div>
        <div>
          <div className="text-sm font-medium">{qualification.race}</div>
          <div className="text-xs text-muted-foreground">
            {qualification.age} ans ({qualification.birthYear})
          </div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-base font-semibold tabular-nums">{qualification.time}</div>
        {qualification.effectif && (
          <div className="text-xs text-muted-foreground">
            {qualification.effectif} qualifiés
          </div>
        )}
      </div>
    </div>
  );
}

function QualificationContent({ qualifications, currentRace }) {
  if (!qualifications?.length) {
    return <EmptyState message="Aucun temps de qualification disponible pour ce profil." />;
  }

  // Normaliser la course courante pour la comparaison
  const normalizedCurrentRace = currentRace
    ?.replace(/\s+/g, " ")
    ?.trim()
    ?.toLowerCase();

  return (
    <div className="space-y-2">
      {qualifications.map((qual, index) => {
        const isHighlighted =
          normalizedCurrentRace &&
          qual.race.toLowerCase().includes(normalizedCurrentRace.split(" ")[0]);
        return (
          <QualificationRow
            key={`${qual.race}-${index}`}
            qualification={qual}
            isHighlighted={isHighlighted}
          />
        );
      })}
    </div>
  );
}

export function QualificationTab({ competId, license, engagement, swimmerInfo }) {
  const [targetEvent, setTargetEvent] = useState("france-open-ete");

  // Récupérer la liste des événements disponibles
  const { data: events } = useFetchJson("/api/qualification?list=events");

  // Récupérer les infos du nageur si pas fournies
  const swimmerUrl = !swimmerInfo && license && competId
    ? `/api/swimmer?competId=${competId}&license=${license}`
    : null;
  const { data: swimmerData } = useFetchJson(swimmerUrl);

  // Utiliser swimmerInfo ou swimmerData
  const swimmer = swimmerInfo || swimmerData?.[0];

  // Déterminer le genre et l'année de naissance
  // On va essayer de déduire le genre depuis le prénom ou l'utiliser s'il est fourni
  const birthYear = swimmer?.birthYear || swimmer?.year;
  const gender = swimmer?.gender || "M"; // Par défaut M si non fourni

  // Construire l'URL de qualification
  const qualParams = new URLSearchParams();
  if (gender) qualParams.set("gender", gender);
  if (birthYear) qualParams.set("birthYear", birthYear);

  const qualUrl = birthYear
    ? `/api/qualification?${qualParams.toString()}`
    : null;
  const { data: qualifications, error, isLoading } = useFetchJson(qualUrl);

  if (!license) {
    return <EmptyState message="Aucun nageur sélectionné." />;
  }

  return (
    <div className="space-y-4">
      {/* Sélecteur d'événement cible */}
      <div className="space-y-2">
        <Label htmlFor="target-event">Événement cible</Label>
        <Select value={targetEvent} onValueChange={setTargetEvent}>
          <SelectTrigger id="target-event" className="w-full sm:w-64">
            <SelectValue placeholder="Sélectionner un événement" />
          </SelectTrigger>
          <SelectContent>
            {events?.map((evt) => (
              <SelectItem key={evt.id} value={evt.id}>
                {evt.name}
              </SelectItem>
            ))}
            {!events?.length && (
              <SelectItem value="france-open-ete">France Open (été)</SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Infos nageur */}
      {swimmer && (
        <div className="rounded-md border border-border bg-muted/30 p-3">
          <div className="text-sm font-medium">
            {swimmer.firstName} {swimmer.lastName || swimmer.name}
          </div>
          <div className="text-xs text-muted-foreground">
            {birthYear && `Né(e) en ${birthYear}`}
            {swimmer.clubName && ` • ${swimmer.clubName}`}
          </div>
        </div>
      )}

      {/* Liste des qualifications */}
      {isLoading ? (
        <QualificationSkeleton />
      ) : error ? (
        <FetchError error={error} />
      ) : (
        <QualificationContent
          qualifications={qualifications}
          currentRace={engagement?.label}
        />
      )}
    </div>
  );
}
