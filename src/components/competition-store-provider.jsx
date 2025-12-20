"use client";

/**
 * Store côté client pour partager les IDs de la recherche courante
 * (competId, clubCode, license, etc.) entre tous les composants.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

/**
 * @typedef {Object} CompetitionStoreState
 * @property {string | null} competId - ID FFN de la compétition
 * @property {string | null} clubCode - Code du club sélectionné
 * @property {string | null} license - Numéro de licence du nageur
 * @property {string | null} firstName - Prénom du nageur
 * @property {string | null} lastName - Nom du nageur
 * @property {string | null} swimmerName - Nom complet du nageur (firstName + lastName)
 * @property {string | null} engagementId - ID de l'engagement sélectionné
 * @property {string | null} eventId - ID de l'épreuve sélectionnée
 * @property {string | null} race - Race ID pour les séries/résultats
 * @property {string | null} meta - Meta info pour les séries
 */

/**
 * @typedef {Object} CompetitionStoreActions
 * @property {(updates: Partial<CompetitionStoreState>) => void} set - Met à jour le store
 * @property {() => void} reset - Réinitialise le store
 * @property {(competId: string, firstName?: string, lastName?: string, clubCode?: string) => void} initSearch - Initialise une recherche
 */

/**
 * @typedef {CompetitionStoreState & CompetitionStoreActions} CompetitionStoreContext
 */

const initialState = {
  competId: null,
  clubCode: null,
  license: null,
  firstName: null,
  lastName: null,
  swimmerName: null,
  engagementId: null,
  eventId: null,
  race: null,
  meta: null,
};

const CompetitionStoreContext = createContext(
  /** @type {CompetitionStoreContext | null} */ (null)
);

/**
 * Provider pour le store de compétition.
 * Wrap l'application ou la page pour partager les IDs entre composants.
 */
export function CompetitionStoreProvider({ children, initialValues = {} }) {
  const [state, setState] = useState(() => ({
    ...initialState,
    ...initialValues,
  }));

  const set = useCallback((updates) => {
    setState((prev) => {
      const next = { ...prev, ...updates };
      // Recalcule swimmerName si firstName ou lastName changent
      if ("firstName" in updates || "lastName" in updates) {
        const fn = updates.firstName ?? prev.firstName ?? "";
        const ln = updates.lastName ?? prev.lastName ?? "";
        next.swimmerName = [fn, ln].filter(Boolean).join(" ") || null;
      }
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  const initSearch = useCallback(
    (competId, firstName = null, lastName = null, clubCode = null, license = null) => {
      const swimmerName = [firstName, lastName].filter(Boolean).join(" ") || null;
      setState({
        ...initialState,
        competId,
        firstName,
        lastName,
        swimmerName,
        clubCode,
        license,
      });
    },
    []
  );

  const value = useMemo(
    () => ({
      ...state,
      set,
      reset,
      initSearch,
    }),
    [state, set, reset, initSearch]
  );

  return (
    <CompetitionStoreContext.Provider value={value}>
      {children}
    </CompetitionStoreContext.Provider>
  );
}

/**
 * Hook pour accéder au store de compétition.
 * @returns {CompetitionStoreContext}
 */
export function useCompetitionStore() {
  const ctx = useContext(CompetitionStoreContext);
  if (!ctx) {
    throw new Error(
      "useCompetitionStore must be used within <CompetitionStoreProvider>"
    );
  }
  return ctx;
}

/**
 * Hook pour construire une URL d'API avec les paramètres du store.
 * @param {string} baseUrl - URL de base (ex: "/api/swimmer")
 * @param {Object} [overrides] - Paramètres à ajouter/surcharger
 * @returns {string | null} - URL complète ou null si competId manquant
 */
export function useApiUrl(baseUrl, overrides = {}) {
  const store = useCompetitionStore();

  return useMemo(() => {
    const params = new URLSearchParams();

    // CompetId est généralement requis
    const competId = overrides.competId ?? store.competId;
    if (competId) params.set("competId", competId);

    // Autres paramètres optionnels
    const mappings = {
      code: overrides.code ?? overrides.clubCode ?? store.clubCode,
      license: overrides.license ?? store.license,
      firstName: overrides.firstName ?? store.firstName,
      lastName: overrides.lastName ?? store.lastName,
      engagementId: overrides.engagementId ?? store.engagementId,
      eventId: overrides.eventId ?? store.eventId,
      race: overrides.race ?? store.race,
      meta: overrides.meta ?? store.meta,
    };

    for (const [key, value] of Object.entries(mappings)) {
      if (value != null && value !== "") {
        params.set(key, value);
      }
    }

    const queryString = params.toString();
    return queryString ? `${baseUrl}?${queryString}` : baseUrl;
  }, [baseUrl, overrides, store]);
}

/**
 * Hook pour vérifier si le store a les données requises pour un fetch.
 * @param {...string} requiredFields - Champs requis
 * @returns {boolean}
 */
export function useStoreReady(...requiredFields) {
  const store = useCompetitionStore();

  return useMemo(() => {
    return requiredFields.every((field) => {
      const value = store[field];
      return value != null && value !== "";
    });
  }, [store, requiredFields]);
}
