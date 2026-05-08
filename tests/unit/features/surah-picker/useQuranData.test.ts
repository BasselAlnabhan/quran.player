import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { Quran } from '@/lib/types';

// ---------------------------------------------------------------------------
// Each test uses vi.resetModules() + dynamic re-import of the hook to get a
// fresh module scope (and thus a fresh module-level cache) per test.
// ---------------------------------------------------------------------------

function makeValidQuran(): Quran {
  const surahs = Array.from({ length: 114 }, (_, i) => ({
    number: i + 1,
    name: `سورة ${String(i + 1)}`,
    englishName: `Surah ${String(i + 1)}`,
    ayahs: [{ number: 1, text: 'test' }],
  }));
  return { surahs };
}

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useQuranData — loading state', () => {
  it('returns data=undefined and error=undefined while the import is pending', async () => {
    // A promise that never resolves, simulating an in-flight import.
    let resolveFn!: (v: { default: unknown }) => void;
    const pending = new Promise<{ default: unknown }>((r) => {
      resolveFn = r;
    });

    vi.doMock('@/data/quran.json', () => pending);

    const { useQuranData } = await import('@/hooks/useQuranData');
    const { result } = renderHook(() => useQuranData());

    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toBeUndefined();

    // Clean up the pending promise so the test can finish.
    resolveFn({ default: makeValidQuran() });
  });
});

describe('useQuranData — successful load', () => {
  it('returns the validated Quran data after the import resolves', async () => {
    const fakeData = makeValidQuran();
    vi.doMock('@/data/quran.json', () => ({ default: fakeData }));

    const { useQuranData } = await import('@/hooks/useQuranData');
    const { result } = renderHook(() => useQuranData());

    await waitFor(() => {
      expect(result.current.data).toEqual(fakeData);
      expect(result.current.error).toBeUndefined();
    });
  });
});

describe('useQuranData — error state', () => {
  it('returns an Error when the imported data fails validation', async () => {
    // Return data that fails validateQuranData (wrong surah count).
    vi.doMock('@/data/quran.json', () => ({ default: { surahs: [] } }));

    const { useQuranData } = await import('@/hooks/useQuranData');
    const { result } = renderHook(() => useQuranData());

    await waitFor(() => {
      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.data).toBeUndefined();
    });
  });

  it('returns an Error when the import itself rejects', async () => {
    vi.doMock('@/data/quran.json', () => {
      throw new Error('chunk load failed');
    });

    const { useQuranData } = await import('@/hooks/useQuranData');
    const { result } = renderHook(() => useQuranData());

    await waitFor(() => {
      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.data).toBeUndefined();
    });
  });
});

describe('useQuranData — module-level caching', () => {
  it('reuses the cached data for a second hook instance without re-importing', async () => {
    const fakeData = makeValidQuran();
    let importCount = 0;

    vi.doMock('@/data/quran.json', () => {
      importCount++;
      return { default: fakeData };
    });

    const { useQuranData } = await import('@/hooks/useQuranData');

    // First instance.
    const { result: r1 } = renderHook(() => useQuranData());
    await waitFor(() => expect(r1.current.data).toBeDefined());

    // Second instance in the same module scope.
    const { result: r2 } = renderHook(() => useQuranData());
    await waitFor(() => expect(r2.current.data).toBeDefined());

    // Both return the same object reference.
    expect(r1.current.data).toBe(r2.current.data);
    // The import factory was called exactly once.
    expect(importCount).toBe(1);
  });
});
