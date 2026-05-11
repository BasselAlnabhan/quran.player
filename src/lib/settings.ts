import { log } from '@/lib/log';

const STORAGE_KEY = 'qr:settings';

export type Theme = 'auto' | 'light' | 'dark';

export type Settings = {
  theme: Theme;
  textSizeRem: number;
  scrollIntervalMs: number;
};

// Settings always have sensible defaults, unlike bookmarks where "no saved
// position yet" is a meaningful state. The call site never needs a null branch.
export const DEFAULT_SETTINGS: Settings = {
  theme: 'auto',
  textSizeRem: 1.5,
  scrollIntervalMs: 1400,
};

const VALID_THEMES: ReadonlySet<string> = new Set(['auto', 'light', 'dark']);

function isValidTheme(value: unknown): value is Theme {
  return typeof value === 'string' && VALID_THEMES.has(value);
}

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (err) {
    // Safari private mode and quota-full storage both throw here — swallow
    // so callers (e.g. in-render setters) don't surface uncaught errors.
    log('saveSettings failed:', err);
  }
}

// Returns DEFAULT_SETTINGS rather than undefined because settings always have
// a valid default state; there is no meaningful "no settings" case for callers.
// Whole-object fallback on any invalid field: simpler than per-field fallback
// and avoids partially-corrupt persisted state being silently accepted.
export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return DEFAULT_SETTINGS;

    const parsed: unknown = JSON.parse(raw);

    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return DEFAULT_SETTINGS;
    }

    const obj = parsed as Record<string, unknown>;

    if (!isValidTheme(obj['theme'])) return DEFAULT_SETTINGS;

    const textSizeRem = obj['textSizeRem'];
    if (
      typeof textSizeRem !== 'number' ||
      !isFinite(textSizeRem) ||
      textSizeRem < 1.0 ||
      textSizeRem > 2.5
    ) {
      return DEFAULT_SETTINGS;
    }

    const scrollIntervalMs = obj['scrollIntervalMs'];
    if (
      typeof scrollIntervalMs !== 'number' ||
      !isFinite(scrollIntervalMs) ||
      scrollIntervalMs < 400 ||
      scrollIntervalMs > 10000
    ) {
      return DEFAULT_SETTINGS;
    }

    return {
      theme: obj['theme'],
      textSizeRem,
      scrollIntervalMs,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}
