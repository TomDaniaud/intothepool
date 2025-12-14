"use client";

import { AlertCircle, RefreshCw } from "lucide-react";

/**
 * Composant d'affichage d'erreur avec bouton de retry optionnel.
 */
export function FetchError({ error, onRetry }) {
  const message =
    error?.message || "Une erreur est survenue lors du chargement.";

  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center">
      <AlertCircle className="size-8 text-destructive" />
      <div className="space-y-1">
        <p className="text-sm font-medium text-destructive">
          Erreur de chargement
        </p>
        <p className="text-xs text-muted-foreground">{message}</p>
      </div>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 inline-flex items-center gap-2 rounded-md bg-destructive px-3 py-1.5 text-xs font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <RefreshCw className="size-3" />
          Réessayer
        </button>
      ) : null}
    </div>
  );
}

/**
 * Composant d'affichage quand il n'y a pas de données.
 */
export function EmptyState({
  message = "Aucune donnée disponible.",
  icon: Icon,
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
      {Icon ? <Icon className="size-8 text-muted-foreground/50" /> : null}
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
