"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const STORAGE_KEY = "intothepool.searchHistory.v1";
const MAX_ITEMS = 20;

/**
 * @typedef {Object} SearchItem
 * @property {string} id
 * @property {string} label
 * @property {string} firstName
 * @property {string} lastName
 * @property {string} competition
 * @property {number} createdAt
 */

function safeJsonParse(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function buildLabel({ firstName, lastName, competition }) {
  const name = [lastName, firstName].filter(Boolean).join(" ").trim();
  if (name && competition) return `${name} — ${competition}`;
  return name || competition || "Recherche";
}

function makeId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

const SearchHistoryContext = createContext(null);

/**
 * Provider: charge l'historique depuis localStorage au montage,
 * et ré-écrit localStorage à chaque modification (add/remove/clear).
 */
export function SearchHistoryProvider({ children }) {
  const [items, setItems] = useState(/** @type {SearchItem[]} */ ([]));
  const [activeId, setActiveId] = useState("");

  // 1) Hydratation depuis localStorage (uniquement côté client)
  useEffect(() => {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (!raw) return;

    const parsed = safeJsonParse(raw, []);
    if (!Array.isArray(parsed)) return;

    const normalized = parsed
      .filter((x) => x && typeof x === "object")
      .map((x) => ({
        id: String(x.id ?? makeId()),
        label: String(x.label ?? "Recherche"),
        firstName: String(x.firstName ?? ""),
        lastName: String(x.lastName ?? ""),
        competition: String(x.competition ?? ""),
        createdAt: Number(x.createdAt ?? Date.now()),
      }));

    setItems(normalized.slice(0, MAX_ITEMS));
    setActiveId(normalized[0]?.id ?? "");
  }, []);

  // 2) Persistance locale à chaque changement
  useEffect(() => {
    try {
      globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // localStorage peut être indisponible (mode privé / quotas) : on ignore.
    }
  }, [items]);

  const addSearch = useCallback(({ firstName, lastName, competition }) => {
    const next = {
      firstName: String(firstName ?? "").trim(),
      lastName: String(lastName ?? "").trim(),
      competition: String(competition ?? "").trim(),
    };

    // Si tout est vide, on ne crée pas d'onglet.
    if (!next.firstName && !next.lastName && !next.competition) return;

    const item = {
      id: makeId(),
      label: buildLabel(next),
      createdAt: Date.now(),
      ...next,
    };

    setItems((prev) => [item, ...prev].slice(0, MAX_ITEMS));
    setActiveId(item.id);
  }, []);

  const removeSearch = useCallback((id) => {
    setItems((prev) => prev.filter((x) => x.id !== id));
    setActiveId((prevActive) => (prevActive === id ? "" : prevActive));
  }, []);

  const clearHistory = useCallback(() => {
    setItems([]);
    setActiveId("");
    try {
      globalThis.localStorage?.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  const value = useMemo(
    () => ({
      items,
      activeId,
      setActiveId,
      addSearch,
      removeSearch,
      clearHistory,
    }),
    [items, activeId, addSearch, removeSearch, clearHistory],
  );

  return (
    <SearchHistoryContext.Provider value={value}>
      {children}
    </SearchHistoryContext.Provider>
  );
}

export function useSearchHistory() {
  const ctx = useContext(SearchHistoryContext);
  if (!ctx) {
    throw new Error(
      "useSearchHistory must be used within <SearchHistoryProvider>",
    );
  }
  return ctx;
}
