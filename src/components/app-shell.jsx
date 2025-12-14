"use client";

import Link from "next/link";

import { SearchHistoryProvider } from "@/components/search-history-provider";
import { MobileSidebarTrigger, Sidebar } from "@/components/sidebar";

/**
 * AppShell = Provider + layout.
 * On garde ce composant isolé pour éviter de polluer `layout.js`.
 */
export function AppShell({ children }) {
  return (
    <SearchHistoryProvider>
      <div className="h-screen bg-background text-foreground md:flex">
        <Sidebar />

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-40 shrink-0 border-b border-border bg-background/80 backdrop-blur">
            <div className="flex h-14 items-center gap-3 px-4">
              <div className="md:hidden max-md:mr-4">
                <MobileSidebarTrigger />
              </div>

              <Link href="/" className="min-w-0">
                <div className="truncate text-sm font-semibold tracking-tight">
                  Intothepool
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  A la recherche de performance
                </div>
              </Link>
            </div>
          </header>

          <div className="min-h-0 min-w-0 flex-1 overflow-auto">{children}</div>
        </div>
      </div>
    </SearchHistoryProvider>
  );
}
