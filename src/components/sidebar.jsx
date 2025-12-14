"use client";

import { PanelLeft, Plus, Trash2 } from "lucide-react";
import Link from "next/link";

import { useSearchHistory } from "@/components/search-history-provider";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

function formatRelativeTime(createdAt) {
  if (!createdAt || Number.isNaN(createdAt)) return "";

  const diffMs = createdAt - Date.now();
  const absMs = Math.abs(diffMs);

  /** @type {[Intl.RelativeTimeFormatUnit, number][]} */
  const steps = [
    ["second", 1000],
    ["minute", 60 * 1000],
    ["hour", 60 * 60 * 1000],
    ["day", 24 * 60 * 60 * 1000],
    ["week", 7 * 24 * 60 * 60 * 1000],
    ["month", 30 * 24 * 60 * 60 * 1000],
    ["year", 365 * 24 * 60 * 60 * 1000],
  ];

  let unit = "minute";
  for (let i = steps.length - 1; i >= 0; i -= 1) {
    const [candidateUnit, candidateMs] = steps[i];
    if (absMs >= candidateMs) {
      unit = candidateUnit;
      break;
    }
  }

  const unitMs = steps.find(([u]) => u === unit)?.[1] ?? 60 * 1000;
  const value = Math.round(diffMs / unitMs);

  const rtf = new Intl.RelativeTimeFormat("fr", { numeric: "auto" });
  return rtf.format(value, unit);
}

function SidebarBody() {
  const { items, activeId, removeSearch, setActiveId } = useSearchHistory();

  // L'item actif est celui sélectionné par l'utilisateur, ou le dernier ajouté.
  const value = activeId || items[0]?.id || "";
  const activeItem = items.find((x) => x.id === value) ?? null;

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground w-full">
      <div className="flex items-center justify-between gap-3 px-4 py-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">
            Intothepool
          </p>
          <h2 className="truncate text-lg font-semibold">Recherches</h2>
        </div>
      </div>
      <Separator />

      <ScrollArea className="flex-1 px-2 py-2">
        <div className="grid gap-1">
          <Button
            asChild
            type="button"
            variant="ghost"
            className="h-auto w-full justify-start gap-2 rounded-md px-3 py-2"
          >
            <Link href="/">
              <Plus className="size-4 shrink-0" />
              <span className="truncate">Nouvelle recherche</span>
            </Link>
          </Button>

          {items.length === 0 ? (
            <div className="px-3 py-3 text-sm text-muted-foreground">
              Aucune recherche pour le moment.
            </div>
          ) : (
            items.map((item) => (
              <div key={item.id} className="group relative">
                <button
                  type="button"
                  className={
                    item.id === value
                      ? "w-full truncate rounded-md bg-accent px-3 py-2 pr-10 text-left text-sm text-accent-foreground"
                      : "w-full truncate rounded-md px-3 py-2 pr-10 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                  }
                  title={item.label}
                  onClick={() => setActiveId(item.id)}
                >
                  {item.label}
                </button>

                <button
                  type="button"
                  aria-label="Supprimer la recherche"
                  className={cn(
                    "absolute right-1 top-1/2 -translate-y-1/2 rounded-md p-2",
                    "opacity-0 transition-opacity group-hover:opacity-100",
                    "hover:bg-accent hover:text-accent-foreground",
                    "focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  )}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    removeSearch(item.id);
                  }}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      <div className="px-4 pb-4">
        <div className="rounded-xl border border-border bg-card p-4 text-card-foreground">
          <div className="flex items-baseline justify-between gap-3">
            <div className="text-xs text-muted-foreground">Détails</div>
            <div className="truncate text-xs text-muted-foreground">
              {activeItem ? formatRelativeTime(activeItem.createdAt) : ""}
            </div>
          </div>

          <div className="mt-2 grid gap-2 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Nom</span>
              <span className="font-medium">{activeItem?.lastName || "—"}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Prénom</span>
              <span className="font-medium">
                {activeItem?.firstName || "—"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Compétition</span>
              <span className="font-medium">
                {activeItem?.competition || "—"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Sidebar responsive :
 * - Desktop (md+): visible en permanence à gauche.
 * - Mobile: accessible via un bouton qui ouvre un Sheet.
 */
export function Sidebar() {
  return (
    <>
      {/* Desktop */}
      <aside className="hidden h-[100dvh] w-1/5 shrink-0 border-r border-border bg-sidebar text-sidebar-foreground md:flex">
        <SidebarBody />
      </aside>

      {/* Mobile trigger + Sheet */}
      <div className="fixed left-4 top-4 z-50 md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              aria-label="Ouvrir l'historique"
            >
              <PanelLeft className="size-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80 p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Historique</SheetTitle>
            </SheetHeader>
            <SidebarBody />
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
