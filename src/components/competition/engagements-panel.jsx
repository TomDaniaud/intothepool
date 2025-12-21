"use client";

/**
 * Panneau gauche: timeline des engagements.
 * Reçoit competId en props.
 */

import Timeline from "@mui/lab/Timeline";
import TimelineConnector from "@mui/lab/TimelineConnector";
import TimelineContent from "@mui/lab/TimelineContent";
import TimelineDot from "@mui/lab/TimelineDot";
import TimelineItem from "@mui/lab/TimelineItem";
import TimelineOppositeContent from "@mui/lab/TimelineOppositeContent";
import TimelineSeparator from "@mui/lab/TimelineSeparator";
import { EmptyState, FetchError } from "@/components/ui/fetch-states";
import { Separator } from "@/components/ui/separator";
import { useFetchJson } from "@/hooks/useFetchJson";
import { cn } from "@/lib/utils";

function EngagementsPanelSkeleton() {
  return (
    <section className="rounded-xl border border-border bg-card text-card-foreground">
      <div className="px-4 py-4">
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-3 w-40 animate-pulse rounded bg-muted" />
      </div>
      <Separator />
      <div className="space-y-4 px-4 py-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="h-3 w-10 animate-pulse rounded bg-muted" />
            <div className="size-3 animate-pulse rounded-full bg-muted" />
            <div className="flex-1 space-y-1">
              <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function EngagementsPanel({ engagements, onSelect }) {
  return (
    <section className="rounded-xl border border-border bg-card text-card-foreground">
      <div className="px-4 py-4">
        <div className="text-sm font-semibold">Engagements</div>
        <div className="text-sm text-muted-foreground">
          Timeline des sessions et épreuves.
        </div>
      </div>
      <Separator />

      <div className="px-4 py-4">
        <Timeline
          position="right"
          sx={{
            p: 0,
            m: 0,
            "& .MuiTimelineItem-root:before": { flex: 0, padding: 0 },
            "& .MuiTimelineDot-root": { boxShadow: "none", borderColor: "var(--border)" },
            "& .MuiTimelineConnector-root": { backgroundColor: "var(--border)" },
            "& .MuiTimelineContent-root": { paddingTop: 0, paddingBottom: 0 },
            "& .MuiTimelineOppositeContent-root": {
              paddingTop: 0,
              paddingBottom: 0,
              paddingLeft: 0,
              paddingRight: 2,
              color: "var(--muted-foreground)",
              fontSize: 12,
              whiteSpace: "nowrap",
            },
          }}
        >
          {engagements.map((engagement, index) => {
            const isLast = index === engagements.length - 1;
            const isRace = engagement.kind === "race";
            const isBreak = engagement.kind === "break";
            const dotBg =
              engagement.kind === "race"
                ? "var(--primary)"
                : engagement.kind === "session"
                  ? "var(--foreground)"
                  : "transparent";

            return (
              <TimelineItem key={engagement.id}>
                <TimelineOppositeContent>{engagement.time || ""}</TimelineOppositeContent>
                <TimelineSeparator>
                  <TimelineDot
                    variant={isBreak ? "outlined" : "filled"}
                    sx={{ bgcolor: dotBg, borderColor: "var(--border)", width: 12, height: 12, my: 0.5 }}
                  />
                  {!isLast && <TimelineConnector />}
                </TimelineSeparator>

                <TimelineContent>
                  {isRace ? (
                    <button
                      type="button"
                      className={cn(
                        "group cursor-pointer transition-transform duration-200 hover:translate-x-2",
                        "min-w-0 w-full rounded-md px-2 py-1 text-left",
                        "hover:bg-accent hover:text-accent-foreground",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      )}
                      onClick={() => onSelect(engagement)}
                    >
                      <div className="truncate text-sm group-hover:underline underline-offset-2">
                        {engagement.label}
                      </div>
                      {engagement.meta && (
                        <div className="mt-0.5 truncate text-xs text-muted-foreground">
                          {engagement.meta}
                        </div>
                      )}
                    </button>
                  ) : (
                    <div className="min-w-0 rounded-md px-2 py-1">
                      <div className={cn("truncate text-sm font-semibold", isBreak && "font-medium")}>
                        {engagement.label}
                      </div>
                      {engagement.meta && (
                        <div className="mt-0.5 truncate text-xs text-muted-foreground">
                          {engagement.meta}
                        </div>
                      )}
                    </div>
                  )}
                </TimelineContent>
              </TimelineItem>
            );
          })}
        </Timeline>
      </div>
    </section>
  );
}

/**
 * Container qui fetch les engagements.
 */
export function EngagementsPanelContainer({ competId, onSelect }) {
  const url = competId ? `/api/engagements?competId=${encodeURIComponent(competId)}` : null;
  const { data: engagements, error, isLoading } = useFetchJson(url);

  if (!competId) {
    return (
      <section className="rounded-xl border border-border bg-card p-4 text-card-foreground">
        <EmptyState message="ID de compétition manquant." />
      </section>
    );
  }

  if (isLoading) return <EngagementsPanelSkeleton />;

  if (error) {
    return (
      <section className="rounded-xl border border-border bg-card p-4 text-card-foreground">
        <FetchError error={error} />
      </section>
    );
  }

  if (!engagements || engagements.length === 0) {
    return (
      <section className="rounded-xl border border-border bg-card p-4 text-card-foreground">
        <EmptyState message="Aucun engagement trouvé." />
      </section>
    );
  }

  return <EngagementsPanel engagements={engagements} onSelect={onSelect} />;
}
