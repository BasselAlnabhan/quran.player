import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearBookmark, loadBookmark, saveBookmark } from '@/lib/bookmark';

describe('bookmark', () => {
  // Clear localStorage before each test so tests are independent and don't pollute each other.
  beforeEach(() => {
    localStorage.clear();
  });

  describe('saveBookmark', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('writes a JSON-parseable string to localStorage under the qr:bookmark key', () => {
      saveBookmark({ surahNumber: 2, scrollY: 300 });
      const raw = localStorage.getItem('qr:bookmark');
      expect(raw).not.toBeNull();
      const parsed: unknown = JSON.parse(raw!);
      expect(parsed).toMatchObject({ surahNumber: 2, scrollY: 300 });
    });

    it('overwrites a previous bookmark with the new value', () => {
      saveBookmark({ surahNumber: 1, scrollY: 0 });
      saveBookmark({ surahNumber: 5, scrollY: 1200 });
      const raw = localStorage.getItem('qr:bookmark');
      const parsed: unknown = JSON.parse(raw!);
      expect(parsed).toMatchObject({ surahNumber: 5, scrollY: 1200 });
    });

    it('does not propagate errors when localStorage.setItem throws', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('quota exceeded');
      });
      expect(() => saveBookmark({ surahNumber: 1, scrollY: 0 })).not.toThrow();
    });
  });

  describe('loadBookmark — round-trip', () => {
    it('returns the same bookmark that was saved', () => {
      saveBookmark({ surahNumber: 2, scrollY: 300 });
      expect(loadBookmark()).toEqual({ surahNumber: 2, scrollY: 300 });
    });

    it('returns a bookmark for the first surah at position 0', () => {
      saveBookmark({ surahNumber: 1, scrollY: 0 });
      expect(loadBookmark()).toEqual({ surahNumber: 1, scrollY: 0 });
    });

    it('returns a bookmark for the last surah (114)', () => {
      saveBookmark({ surahNumber: 114, scrollY: 5000 });
      expect(loadBookmark()).toEqual({ surahNumber: 114, scrollY: 5000 });
    });
  });

  describe('loadBookmark — empty storage', () => {
    it('returns undefined when nothing is stored', () => {
      expect(loadBookmark()).toBeUndefined();
    });
  });

  describe('loadBookmark — malformed JSON', () => {
    it('returns undefined and does not throw for invalid JSON', () => {
      localStorage.setItem('qr:bookmark', 'not json');
      expect(() => loadBookmark()).not.toThrow();
      expect(loadBookmark()).toBeUndefined();
    });
  });

  describe('loadBookmark — missing fields', () => {
    it('returns undefined when scrollY is missing', () => {
      localStorage.setItem('qr:bookmark', JSON.stringify({ surahNumber: 1 }));
      expect(loadBookmark()).toBeUndefined();
    });

    it('returns undefined when surahNumber is missing', () => {
      localStorage.setItem('qr:bookmark', JSON.stringify({ scrollY: 100 }));
      expect(loadBookmark()).toBeUndefined();
    });

    it('returns undefined when both fields are missing', () => {
      localStorage.setItem('qr:bookmark', JSON.stringify({}));
      expect(loadBookmark()).toBeUndefined();
    });
  });

  describe('loadBookmark — wrong field types', () => {
    it('returns undefined when surahNumber is a string instead of a number', () => {
      localStorage.setItem('qr:bookmark', JSON.stringify({ surahNumber: '1', scrollY: 100 }));
      expect(loadBookmark()).toBeUndefined();
    });

    it('returns undefined when scrollY is a string instead of a number', () => {
      localStorage.setItem('qr:bookmark', JSON.stringify({ surahNumber: 1, scrollY: '100' }));
      expect(loadBookmark()).toBeUndefined();
    });

    it('returns undefined when surahNumber is null', () => {
      localStorage.setItem('qr:bookmark', JSON.stringify({ surahNumber: null, scrollY: 100 }));
      expect(loadBookmark()).toBeUndefined();
    });
  });

  describe('loadBookmark — out-of-range values', () => {
    it('returns undefined for surahNumber 0', () => {
      localStorage.setItem('qr:bookmark', JSON.stringify({ surahNumber: 0, scrollY: 100 }));
      expect(loadBookmark()).toBeUndefined();
    });

    it('returns undefined for surahNumber 115', () => {
      localStorage.setItem('qr:bookmark', JSON.stringify({ surahNumber: 115, scrollY: 100 }));
      expect(loadBookmark()).toBeUndefined();
    });

    it('returns undefined for negative surahNumber', () => {
      localStorage.setItem('qr:bookmark', JSON.stringify({ surahNumber: -1, scrollY: 100 }));
      expect(loadBookmark()).toBeUndefined();
    });

    it('returns undefined for negative scrollY', () => {
      localStorage.setItem('qr:bookmark', JSON.stringify({ surahNumber: 1, scrollY: -1 }));
      expect(loadBookmark()).toBeUndefined();
    });

    it('returns undefined for non-finite scrollY (Infinity)', () => {
      // JSON.stringify converts Infinity to null, so set raw string
      localStorage.setItem('qr:bookmark', '{"surahNumber":1,"scrollY":null}');
      expect(loadBookmark()).toBeUndefined();
    });
  });

  describe('loadBookmark — stored value is not an object', () => {
    it('returns undefined when stored value is a JSON array', () => {
      localStorage.setItem('qr:bookmark', JSON.stringify([1, 2, 3]));
      expect(loadBookmark()).toBeUndefined();
    });

    it('returns undefined when stored value is a JSON primitive string', () => {
      localStorage.setItem('qr:bookmark', JSON.stringify('hello'));
      expect(loadBookmark()).toBeUndefined();
    });

    it('returns undefined when stored value is a JSON number', () => {
      localStorage.setItem('qr:bookmark', JSON.stringify(42));
      expect(loadBookmark()).toBeUndefined();
    });
  });

  describe('clearBookmark', () => {
    it('removes a previously saved bookmark so loadBookmark returns undefined', () => {
      saveBookmark({ surahNumber: 3, scrollY: 500 });
      clearBookmark();
      expect(loadBookmark()).toBeUndefined();
    });

    it('does not throw when called on empty storage', () => {
      expect(() => clearBookmark()).not.toThrow();
    });
  });
});
