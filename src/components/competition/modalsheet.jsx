"use client";

/**
 * Right modal (style GitHub) : à terme, remplacer ce placeholder par
 * un composant complet (scrap + détails + actions).
 * On utilise Radix `Dialog` directement ("modal") pour coller au comportement GitHub.
 */

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { XIcon } from "lucide-react";

import { EngagementTab } from "@/components/competition/engagement-tab";
import { ResultTab } from "@/components/competition/result-tab";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export function EngagementDetailsSheet({ open, onOpenChange, engagement }) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-50",
            "bg-foreground/20 backdrop-blur-sm",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
          )}
        />

        <DialogPrimitive.Content
          className={cn(
            "fixed z-50 flex flex-col bg-background",
            "border border-border shadow-lg",
            // Mobile: bottom modal ~90% height
            "inset-x-0 bottom-0 h-[90dvh] w-full rounded-t-xl",
            // Desktop+: right panel ~2/3 viewport width, with margins + rounded corners
            "sm:inset-x-auto sm:bottom-4 sm:top-4 sm:right-4 sm:h-auto sm:w-[66vw] sm:rounded-xl",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom",
            "sm:data-[state=open]:slide-in-from-right sm:data-[state=closed]:slide-out-to-right",
            "data-[state=open]:duration-500 data-[state=closed]:duration-300",
          )}
        >
          <div className="flex items-start justify-between gap-3 p-4">
            <div className="min-w-0">
              <DialogPrimitive.Title className="truncate text-base font-semibold text-foreground">
                Détails épreuve
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="mt-1 text-sm text-muted-foreground">
                {engagement
                  ? "Consultation de l’épreuve sélectionnée."
                  : "Sélectionnez une épreuve dans la timeline."}
              </DialogPrimitive.Description>
            </div>

            <DialogPrimitive.Close
              className={cn(
                "inline-flex h-9 w-9 items-center justify-center rounded-md",
                "hover:bg-accent hover:text-accent-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              )}
            >
              <XIcon className="size-4" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          </div>

          <Separator />

          {/*
            Contenu en tabs:
            - "Engagement": infos de l'épreuve sélectionnée
            - "Résultat": placeholder + graphe (mock) en bas
          */}
          <div className="min-h-0 flex-1 overflow-auto p-4">
            <Tabs defaultValue="engagement" className="gap-4">
              <TabsList className="w-full justify-start">
                <TabsTrigger value="engagement">Engagement</TabsTrigger>
                <TabsTrigger value="resultat">Résultat</TabsTrigger>
              </TabsList>

              <TabsContent value="engagement" className="min-h-0">
                <EngagementTab engagement={engagement} />
              </TabsContent>

              <TabsContent value="resultat" className="min-h-0">
                <ResultTab engagement={engagement} />
              </TabsContent>
            </Tabs>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
