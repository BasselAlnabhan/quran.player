import { useEffect, useState } from 'react';
import type { Quran } from '@/lib/types';
import { validateQuranData } from '@/lib/quran';

// Module-level cache so the JSON is parsed exactly once across the app's
// lifetime, even when multiple components call this hook.
let cachedData: Quran | undefined;
let cachedError: Error | undefined;

// Subscribers waiting for the in-flight import to settle.
type Listener = () => void;
const listeners: Listener[] = [];
let loading = false;

function notifyListeners(): void {
  for (const fn of listeners) fn();
}

function loadQuranData(): void {
  if (loading || cachedData !== undefined || cachedError !== undefined) return;
  loading = true;

  // Dynamic import keeps quran.json in its own Rollup chunk (configured in
  // vite.config.ts manualChunks) and out of the main bundle.
  import('@/data/quran.json')
    .then((mod: { default: unknown }) => {
      validateQuranData(mod.default);
      cachedData = mod.default;
    })
    .catch((err: unknown) => {
      cachedError = err instanceof Error ? err : new Error(String(err));
    })
    .finally(() => {
      loading = false;
      notifyListeners();
    });
}

export type QuranDataState = {
  data: Quran | undefined;
  error: Error | undefined;
};

export function useQuranData(): QuranDataState {
  const [state, setState] = useState<QuranDataState>({
    data: cachedData,
    error: cachedError,
  });

  useEffect(() => {
    // If already resolved from a previous mount, nothing to do.
    if (cachedData !== undefined || cachedError !== undefined) {
      setState({ data: cachedData, error: cachedError });
      return;
    }

    const listener: Listener = () => {
      setState({ data: cachedData, error: cachedError });
    };

    listeners.push(listener);

    // Kick off the import (no-op if already in flight).
    loadQuranData();

    return () => {
      const idx = listeners.indexOf(listener);
      if (idx !== -1) listeners.splice(idx, 1);
    };
  }, []);

  return state;
}
