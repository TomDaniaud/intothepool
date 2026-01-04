"use client";

import { Calendar, Users, X } from "lucide-react";
import { cn, capitalize } from "@/lib/utils";

/**
 * Couleurs soft par niveau (badges uniquement)
 */
const levelBadgeColors = {
  NATIONAL: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  REGIONAL: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  DEPARTEMENTAL: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  INTERNATIONAL: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
};

const defaultBadgeColor = levelBadgeColors.DEPARTEMENTAL;

/**
 * Formate une date ISO en français
 * @param {Date | string} isoDate
 */
function formatFrenchDate(isoDate) {
  const date = new Date(isoDate);
  return date.toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
}

/**
 * Formate la plage de dates
 * @param {Date | string} startDate
 * @param {Date | string | null} endDate
 */
function formatDateRange(startDate, endDate) {
  if (!endDate) {
    return formatFrenchDate(startDate);
  }
  return `${formatFrenchDate(startDate)} → ${formatFrenchDate(endDate)}`;
}

/**
 * Formate le niveau pour l'affichage
 * @param {string} level
 */
function formatLevel(level) {
  const labels = {
    NATIONAL: "National",
    REGIONAL: "Régional",
    DEPARTEMENTAL: "Départ.",
    INTERNATIONAL: "Internat.",
  };
  return labels[level] || level;
}

/**
 * Composant CompetCard - Affiche une compétition (style shadcn)
 */
export function CompetCard({ competition, onClick, selected = false, className }) {
  const {
    name,
    location,
    level,
    image,
    poolsize,
    nbSwimmers,
    startDate,
    endDate,
  } = competition;

  const badgeColor = levelBadgeColors[level] || defaultBadgeColor;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative flex h-35 w-full overflow-hidden rounded-lg border border-border bg-card/70 backdrop-blur-md text-left transition-all duration-200",
        "hover:border-ring hover:shadow-sm",
        selected && "ring-2 ring-ring border-ring",
        className
      )}
    >
      {/* Image à gauche */}
      {image && (
        <div className="relative h-full w-20 shrink-0 overflow-hidden bg-muted">
          <img
            src={image}
            alt={location || name}
            className="h-full w-full object-cover opacity-80 transition-opacity duration-200 group-hover:opacity-100"
          />
        </div>
      )}

      {/* Contenu */}
      <div className="flex flex-1 flex-col p-3 min-w-0">
        {/* Header */}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-tight line-clamp-1">
            {location ? capitalize(location) : name}
          </p>
          <p className="mt-1 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {name}
          </p>
        </div>

        {/* Infos */}
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="size-3" />
            {formatDateRange(startDate, endDate)}
          </span>
          {nbSwimmers > 0 && (
            <span className="flex items-center gap-1">
              <Users className="size-3" />
              {nbSwimmers}
            </span>
          )}
        </div>

        {/* Badges en bas à droite */}
        <div className="absolute bottom-2 right-2 flex items-center gap-1.5">
          {poolsize && (
            <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              {poolsize}m
            </span>
          )}
          <span
            className={cn(
              "rounded-md px-1.5 py-0.5 text-[10px] font-medium",
              badgeColor
            )}
          >
            {formatLevel(level)}
          </span>
        </div>
      </div>
    </button>
  );
}

/**
 * Composant CompetCardSelected - Remplace l'input avec la compétition sélectionnée
 */
export function CompetCardSelected({ competition, onCancel, className }) {
  const {
    name,
    location,
    level,
    poolsize,
    startDate,
    endDate,
  } = competition;

  const badgeColor = levelBadgeColors[level] || defaultBadgeColor;

  return (
    <div
      className={cn(
        "relative flex h-9 w-full items-center gap-2 rounded-md border border-input bg-background/60 px-3 text-sm",
        className
      )}
    >
      {/* Infos compactes */}
      <span className="font-medium ">
        {location ? capitalize(location) : name}
      </span>
      <span className="text-muted-foreground ">•</span>
      <span className="text-muted-foreground text-xs truncate">
        {formatDateRange(startDate, endDate)}
      </span>
      
      {/* Badges */}
      <div className="ml-auto flex items-center gap-1.5 shrink-0">
        {poolsize && (
          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            {poolsize}m
          </span>
        )}
        <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium", badgeColor)}>
          {formatLevel(level)}
        </span>
        
        {/* Bouton annuler */}
        <button
          type="button"
          onClick={onCancel}
          className="ml-1 rounded p-0.5 text-muted-foreground transition-colors hover:bg-destructive hover:text-destructive-foreground"
          aria-label="Annuler la sélection"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
