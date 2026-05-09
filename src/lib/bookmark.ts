import { log } from '@/lib/log';

const STORAGE_KEY = 'qr:bookmark';

export type Bookmark = {
  surahNumber: number;
  scrollY: number;
};

export function saveBookmark(bookmark: Bookmark): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmark));
  } catch (err) {
    // Safari private mode and quota-full storage both throw here — swallow
    // silently so a debounced scroll handler doesn't surface an uncaught error.
    log('saveBookmark failed:', err);
  }
}

export function loadBookmark(): Bookmark | undefined {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return undefined;

    const parsed: unknown = JSON.parse(raw);

    if (typeof parsed !== 'object' || parsed === null) return undefined;

    const obj = parsed as Record<string, unknown>;

    if (typeof obj['surahNumber'] !== 'number') return undefined;
    if (typeof obj['scrollY'] !== 'number') return undefined;

    const { surahNumber, scrollY } = obj as { surahNumber: number; scrollY: number };

    // Reject out-of-range or non-finite values — they can't represent a valid position.
    if (surahNumber < 1 || surahNumber > 114) return undefined;
    if (!isFinite(scrollY) || scrollY < 0) return undefined;

    return { surahNumber, scrollY };
  } catch {
    return undefined;
  }
}

export function clearBookmark(): void {
  localStorage.removeItem(STORAGE_KEY);
}
