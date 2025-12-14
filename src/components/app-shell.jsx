"use client";

import { SearchHistoryProvider } from "@/components/search-history-provider";
import { Sidebar } from "@/components/sidebar";

/**
 * AppShell = Provider + layout.
 * On garde ce composant isolé pour éviter de polluer `layout.js`.
 */
export function AppShell({ children }) {
  return (
    <SearchHistoryProvider>
      <div className="min-h-[100dvh] bg-background text-foreground md:flex">
        <Sidebar />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </SearchHistoryProvider>
  );
}
