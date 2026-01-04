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
      <div className="relative h-screen text-foreground">
        {/* Background image for the whole app */}
        <div
          className="pointer-events-none fixed inset-0 z-0 bg-cover bg-center opacity-40"
          aria-hidden="true"
          style={{ backgroundImage: 'url(/background.webp)' }}
        />

        {/* Global blur overlay (applies across sidebar + navbar + pages)
        <div
          className="pointer-events-none fixed inset-0 z-10 bg-background/20 backdrop-blur-md"
          aria-hidden="true"
        /> */}

        <div className="relative z-20 h-screen md:flex">
          <Sidebar />

          <div className="flex min-w-0 flex-1 flex-col">
            <header className="sticky top-0 z-40 shrink-0 border-b border-border bg-background/60 backdrop-blur-md">
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

            <div className="relative min-h-0 min-w-0 flex-1 overflow-auto">{children}</div>
          </div>
        </div>
      </div>
    </SearchHistoryProvider>
  );
}
