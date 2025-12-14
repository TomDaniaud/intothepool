"use client";

/**
 * Panneau gauche: timeline des engagements.
 * - Les items sont affichés comme une ligne avec checkpoints (style GitHub-ish).
 * - Seules les épreuves (kind="race") sont cliquables.
 */

import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

function markerClassName(kind) {
  if (kind === "race") {
    return "bg-primary";
  }
  if (kind === "break") {
    return "bg-muted-foreground";
  }
  return "bg-foreground";
}

export function EngagementsPanel({ engagements, onSelect }) {
  return (
    <section className="rounded-xl border border-border bg-card text-card-foreground">
      <div className="px-4 py-4">
        <div className="text-sm font-semibold">Engagements</div>
        <div className="text-sm text-muted-foreground">
          Timeline des sessions et épreuves.
        </div>
      </div>
      <Separator />

      <div className="relative px-4 py-4">
        <div className="absolute bottom-4 left-[19px] top-4 w-px bg-border" />

        <div className="grid gap-1">
          {engagements.map((engagement) => {
            const isRace = engagement.kind === "race";

            return (
              <div key={engagement.id} className="relative flex gap-3 py-2">
                <div className="relative flex w-8 justify-center">
                  <div
                    className={cn(
                      "mt-1.5 h-3 w-3 rounded-full border border-border",
                      markerClassName(engagement.kind),
                    )}
                  />
                </div>

                {isRace ? (
                  <button
                    type="button"
                    className={cn(
                      "min-w-0 flex-1 rounded-md px-2 py-1 text-left",
                      "hover:bg-accent hover:text-accent-foreground",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    )}
                    onClick={() => onSelect(engagement)}
                  >
                    <div className="truncate text-sm font-medium">{engagement.label}</div>
                    {engagement.meta ? (
                      <div className="mt-0.5 truncate text-xs text-muted-foreground">
                        {engagement.meta}
                      </div>
                    ) : null}
                  </button>
                ) : (
                  <div className="min-w-0 flex-1 rounded-md px-2 py-1">
                    <div
                      className={cn(
                        "truncate text-sm font-semibold",
                        engagement.kind === "break" && "font-medium",
                      )}
                    >
                      {engagement.label}
                    </div>
                    {engagement.meta ? (
                      <div className="mt-0.5 truncate text-xs text-muted-foreground">
                        {engagement.meta}
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
