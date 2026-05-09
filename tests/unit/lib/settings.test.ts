import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from '@/lib/settings';
import type { Settings } from '@/lib/settings';

describe('settings', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('saveSettings', () => {
    it('writes a JSON-parseable string to localStorage under the qr:settings key', () => {
      const s: Settings = { theme: 'dark', textSizeRem: 1.5, scrollIntervalMs: 2000 };
      saveSettings(s);
      const raw = localStorage.getItem('qr:settings');
      expect(raw).not.toBeNull();
      const parsed: unknown = JSON.parse(raw!);
      expect(parsed).toMatchObject(s);
    });

    it('overwrites a previous settings entry with the new value', () => {
      saveSettings({ theme: 'light', textSizeRem: 1.5, scrollIntervalMs: 2000 });
      saveSettings({ theme: 'dark', textSizeRem: 2.0, scrollIntervalMs: 3000 });
      const raw = localStorage.getItem('qr:settings');
      const parsed: unknown = JSON.parse(raw!);
      expect(parsed).toMatchObject({ theme: 'dark', textSizeRem: 2.0, scrollIntervalMs: 3000 });
    });

    it('does not propagate errors when localStorage.setItem throws', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('quota exceeded');
      });
      expect(() =>
        saveSettings({ theme: 'auto', textSizeRem: 1.5, scrollIntervalMs: 2000 }),
      ).not.toThrow();
    });
  });

  describe('loadSettings — round-trip', () => {
    it('returns the same settings that were saved', () => {
      const s: Settings = { theme: 'dark', textSizeRem: 1.75, scrollIntervalMs: 3000 };
      saveSettings(s);
      expect(loadSettings()).toEqual(s);
    });

    it('returns settings with theme auto at minimum textSizeRem and minimum scrollIntervalMs', () => {
      const s: Settings = { theme: 'auto', textSizeRem: 1.0, scrollIntervalMs: 400 };
      saveSettings(s);
      expect(loadSettings()).toEqual(s);
    });

    it('returns settings at maximum bounds', () => {
      const s: Settings = { theme: 'light', textSizeRem: 2.5, scrollIntervalMs: 10000 };
      saveSettings(s);
      expect(loadSettings()).toEqual(s);
    });
  });

  describe('loadSettings — empty storage', () => {
    it('returns DEFAULT_SETTINGS when nothing is stored', () => {
      expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
    });
  });

  describe('loadSettings — malformed JSON', () => {
    it('returns DEFAULT_SETTINGS and does not throw for invalid JSON', () => {
      localStorage.setItem('qr:settings', 'not json');
      expect(() => loadSettings()).not.toThrow();
      expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
    });
  });

  describe('loadSettings — stored value is not an object', () => {
    it('returns DEFAULT_SETTINGS when stored value is a JSON array', () => {
      localStorage.setItem('qr:settings', JSON.stringify([1, 2, 3]));
      expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
    });

    it('returns DEFAULT_SETTINGS when stored value is a JSON number', () => {
      localStorage.setItem('qr:settings', JSON.stringify(42));
      expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
    });

    it('returns DEFAULT_SETTINGS when stored value is null JSON', () => {
      localStorage.setItem('qr:settings', 'null');
      expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
    });
  });

  describe('loadSettings — missing fields', () => {
    it('returns DEFAULT_SETTINGS when theme is missing', () => {
      localStorage.setItem(
        'qr:settings',
        JSON.stringify({ textSizeRem: 1.5, scrollIntervalMs: 2000 }),
      );
      expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
    });

    it('returns DEFAULT_SETTINGS when textSizeRem is missing', () => {
      localStorage.setItem(
        'qr:settings',
        JSON.stringify({ theme: 'auto', scrollIntervalMs: 2000 }),
      );
      expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
    });

    it('returns DEFAULT_SETTINGS when scrollIntervalMs is missing', () => {
      localStorage.setItem(
        'qr:settings',
        JSON.stringify({ theme: 'auto', textSizeRem: 1.5 }),
      );
      expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
    });

    it('returns DEFAULT_SETTINGS when all fields are missing', () => {
      localStorage.setItem('qr:settings', JSON.stringify({}));
      expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
    });
  });

  describe('loadSettings — invalid theme value', () => {
    it('returns DEFAULT_SETTINGS for an unrecognised theme string', () => {
      localStorage.setItem(
        'qr:settings',
        JSON.stringify({ theme: 'solarized', textSizeRem: 1.5, scrollIntervalMs: 2000 }),
      );
      expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
    });

    it('returns DEFAULT_SETTINGS when theme is a number instead of a string', () => {
      localStorage.setItem(
        'qr:settings',
        JSON.stringify({ theme: 1, textSizeRem: 1.5, scrollIntervalMs: 2000 }),
      );
      expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
    });

    it('returns DEFAULT_SETTINGS when theme is null', () => {
      localStorage.setItem(
        'qr:settings',
        JSON.stringify({ theme: null, textSizeRem: 1.5, scrollIntervalMs: 2000 }),
      );
      expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
    });
  });

  describe('loadSettings — invalid textSizeRem', () => {
    it('returns DEFAULT_SETTINGS when textSizeRem is below the minimum (< 1.0)', () => {
      localStorage.setItem(
        'qr:settings',
        JSON.stringify({ theme: 'auto', textSizeRem: 0.9, scrollIntervalMs: 2000 }),
      );
      expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
    });

    it('returns DEFAULT_SETTINGS when textSizeRem exceeds the maximum (> 2.5)', () => {
      localStorage.setItem(
        'qr:settings',
        JSON.stringify({ theme: 'auto', textSizeRem: 2.6, scrollIntervalMs: 2000 }),
      );
      expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
    });

    it('returns DEFAULT_SETTINGS when textSizeRem is NaN (stored as null via JSON)', () => {
      localStorage.setItem(
        'qr:settings',
        '{"theme":"auto","textSizeRem":null,"scrollIntervalMs":2000}',
      );
      expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
    });

    it('returns DEFAULT_SETTINGS when textSizeRem is Infinity (stored as null via JSON)', () => {
      // JSON.stringify converts Infinity to null
      localStorage.setItem(
        'qr:settings',
        '{"theme":"auto","textSizeRem":null,"scrollIntervalMs":2000}',
      );
      expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
    });

    it('returns DEFAULT_SETTINGS when textSizeRem is a string', () => {
      localStorage.setItem(
        'qr:settings',
        JSON.stringify({ theme: 'auto', textSizeRem: '1.5', scrollIntervalMs: 2000 }),
      );
      expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
    });
  });

  describe('loadSettings — invalid scrollIntervalMs', () => {
    it('returns DEFAULT_SETTINGS when scrollIntervalMs is below the minimum (< 400)', () => {
      localStorage.setItem(
        'qr:settings',
        JSON.stringify({ theme: 'auto', textSizeRem: 1.5, scrollIntervalMs: 399 }),
      );
      expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
    });

    it('returns DEFAULT_SETTINGS when scrollIntervalMs exceeds the maximum (> 10000)', () => {
      localStorage.setItem(
        'qr:settings',
        JSON.stringify({ theme: 'auto', textSizeRem: 1.5, scrollIntervalMs: 10001 }),
      );
      expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
    });

    it('returns DEFAULT_SETTINGS when scrollIntervalMs is NaN (stored as null via JSON)', () => {
      localStorage.setItem(
        'qr:settings',
        '{"theme":"auto","textSizeRem":1.5,"scrollIntervalMs":null}',
      );
      expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
    });

    it('returns DEFAULT_SETTINGS when scrollIntervalMs is a string', () => {
      localStorage.setItem(
        'qr:settings',
        JSON.stringify({ theme: 'auto', textSizeRem: 1.5, scrollIntervalMs: '2000' }),
      );
      expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });
});
