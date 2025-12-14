"use client";

import { PanelLeft } from "lucide-react";

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function SidebarBody() {
  const { items, activeId, setActiveId } = useSearchHistory();

  // L'onglet actif est celui sélectionné par l'utilisateur, ou le dernier ajouté.
  const value = activeId || items[0]?.id || "";

  return (
    <div className="flex h-full flex-col">
      <div className="px-4 py-4">
        <p className="text-sm font-medium text-muted-foreground">Historique</p>
        <h2 className="text-lg font-semibold">Recherches</h2>
      </div>
      <Separator />

      {items.length === 0 ? (
        <div className="px-4 py-6 text-sm text-muted-foreground">
          Aucune recherche pour le moment.
        </div>
      ) : (
        <Tabs value={value} onValueChange={setActiveId} className="flex-1">
          <ScrollArea className="h-28 px-4 pt-4">
            {/* TabsList en colonne pour ressembler à une liste d'onglets */}
            <TabsList className="h-auto w-full flex-col items-stretch bg-muted/50">
              {items.map((item) => (
                <TabsTrigger
                  key={item.id}
                  value={item.id}
                  className="w-full justify-start truncate"
                  title={item.label}
                >
                  {item.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </ScrollArea>

          <div className="flex-1 px-4 pb-4 pt-2">
            {items.map((item) => (
              <TabsContent key={item.id} value={item.id} className="pt-2">
                <div className="rounded-xl border border-border bg-card p-4 text-card-foreground">
                  <div className="text-xs text-muted-foreground">Détails</div>
                  <div className="mt-2 grid gap-2 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Nom</span>
                      <span className="font-medium">
                        {item.lastName || "—"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Prénom</span>
                      <span className="font-medium">
                        {item.firstName || "—"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Compétition</span>
                      <span className="font-medium">
                        {item.competition || "—"}
                      </span>
                    </div>
                  </div>
                </div>
              </TabsContent>
            ))}
          </div>
        </Tabs>
      )}
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
      <aside className="hidden h-[100dvh] w-80 shrink-0 border-r border-border bg-sidebar text-sidebar-foreground md:flex">
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
            <SheetHeader className="px-4 py-4">
              <SheetTitle>Historique</SheetTitle>
            </SheetHeader>
            <SidebarBody />
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
