import { useCallback, useState } from 'react';
import { loadSettings, saveSettings } from '@/lib/settings';
import type { Settings, Theme } from '@/lib/settings';

export type UseSettingsResult = {
  settings: Settings;
  setTheme: (t: Theme) => void;
  setTextSize: (rem: number) => void;
  setScrollInterval: (ms: number) => void;
};

export function useSettings(): UseSettingsResult {
  // Lazy initializer ensures loadSettings is called exactly once per hook instance.
  const [settings, setSettings] = useState<Settings>(() => loadSettings());

  const setTheme = useCallback((t: Theme) => {
    const next: Settings = { ...settings, theme: t };
    saveSettings(next);
    setSettings(next);
  }, [settings]);

  const setTextSize = useCallback((rem: number) => {
    const next: Settings = { ...settings, textSizeRem: rem };
    saveSettings(next);
    setSettings(next);
  }, [settings]);

  const setScrollInterval = useCallback((ms: number) => {
    const next: Settings = { ...settings, scrollIntervalMs: ms };
    saveSettings(next);
    setSettings(next);
  }, [settings]);

  return { settings, setTheme, setTextSize, setScrollInterval };
}
