"use client";

/**
 * Onglet "Qualification" : liste des temps de qualification pour le nageur.
 * Affiche tous les temps de qualif pour l'âge/année du nageur.
 */

import { useState } from "react";
import { Trophy, ExternalLink } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { useQualificationTime } from "@/hooks/useQualification";

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
            {qualification.age?
            <>{qualification.age} ans ({qualification.birthYear})</>:
            <>Toute catégories</>
        }
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
          qual.race.toLowerCase().includes(normalizedCurrentRace);
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

export function QualificationTab({ competId, license, engagement }) {
  // Stocker l'idclt de l'événement sélectionné (79 = OPEN d'été par défaut)
  const [selectedIdclt, setSelectedIdclt] = useState(79);

  // Récupérer la liste des événements disponibles
  const { data: events } = useFetchJson("/api/qualification?list=events");
  
  // Trouver l'événement sélectionné pour avoir son URL
  const selectedEvent = events?.find((evt) => evt.idclt === selectedIdclt);

  // Récupérer les infos du nageur si pas fournies
  const swimmerUrl = license && competId
    ? `/api/swimmer?competId=${competId}&license=${license}`
    : null;
  const { data: swimmerData } = useFetchJson(swimmerUrl);
  const swimmer = Array.isArray(swimmerData) ? swimmerData[0] : swimmerData;
  const birthYear = swimmer?.birthYear;
  const gender = swimmer?.gender;

  const { data: qualifications, isLoading, error } = useQualificationTime({
    gender,
    birthYear,
    idclt: selectedIdclt,
  });

  if (!license) {
    return <EmptyState message="Aucun nageur sélectionné." />;
  }

  return (
    <div className="space-y-4">
      {/* Sélecteur d'événement cible */}
      <div className="space-y-2">
        <Label htmlFor="target-event">Événement cible</Label>
        <div className="flex items-center gap-2">
          <Select 
            value={String(selectedIdclt)} 
            onValueChange={(val) => setSelectedIdclt(Number(val))}
          >
            <SelectTrigger id="target-event" className="w-full sm:w-64">
              <SelectValue placeholder="Sélectionner un événement" />
            </SelectTrigger>
            <SelectContent>
              {events?.map((evt) => (
                <SelectItem key={evt.idclt} value={String(evt.idclt)}>
                  {evt.name}
                </SelectItem>
              ))}
              {!events?.length && (
                <SelectItem value="79">OPEN d'été</SelectItem>
              )}
            </SelectContent>
          </Select>
          {selectedEvent?.url && (
            <Button
              variant="outline"
              size="icon"
              asChild
              className="shrink-0"
            >
              <a 
                href={selectedEvent.url} 
                target="_blank" 
                rel="noopener noreferrer"
                title="Voir la grille sur FFN"
              >
                <ExternalLink className="size-4" />
              </a>
            </Button>
          )}
        </div>
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
