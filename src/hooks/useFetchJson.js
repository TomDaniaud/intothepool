"use client";

import { useEffect, useMemo, useState } from "react";

export function useFetchJson(url, options) {
  const _optionsKey = useMemo(() => {
    if (!options) return "";
    try {
      return JSON.stringify(options);
    } catch {
      return "";
    }
  }, [options]);

  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(Boolean(url));

  useEffect(() => {
    if (!url) {
      setData(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    let didCancel = false;

    async function run() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
          headers: {
            Accept: "application/json",
            ...(options?.headers || {}),
          },
        });

        if (!response.ok) {
          const text = await response.text().catch(() => "");
          const message = text
            ? `HTTP ${response.status}: ${text}`
            : `HTTP ${response.status}`;
          throw new Error(message);
        }

        const json = await response.json();
        if (!didCancel) setData(json);
      } catch (fetchError) {
        if (controller.signal.aborted) return;
        if (!didCancel) setError(fetchError);
      } finally {
        if (!didCancel) setIsLoading(false);
      }
    }

    run();

    return () => {
      didCancel = true;
      controller.abort();
    };
  }, [url, options]);

  return { data, error, isLoading };
}
