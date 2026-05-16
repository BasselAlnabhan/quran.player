import { describe, expect, it } from 'vitest';
import type { Quran } from '@/lib/types';
import { BASMALA, getSurah, getSurahList, splitBasmala, validateQuranData } from '@/lib/quran';
import realQuranData from '@/data/quran.json';

// Cast the imported JSON to Quran — the validator tests confirm the shape at runtime.
const quranData = realQuranData as Quran;

// Minimal valid stub for unit-testing validation logic without loading the full dataset.
function makeStubQuran(surahCount: number): Quran {
  const surahs = Array.from({ length: surahCount }, (_, i) => ({
    number: i + 1,
    name: `سورة ${String(i + 1)}`,
    englishName: `Surah ${String(i + 1)}`,
    ayahs: [{ number: 1, text: 'test' }],
  }));
  return { surahs };
}

describe('getSurahList', () => {
  it('returns an array of length 114 for the real quran data', () => {
    const list = getSurahList(quranData);
    expect(list).toHaveLength(114);
  });

  it('each item contains only number, name, and englishName — no ayahs', () => {
    const list = getSurahList(quranData);
    for (const item of list) {
      expect(item).toHaveProperty('number');
      expect(item).toHaveProperty('name');
      expect(item).toHaveProperty('englishName');
      expect(item).not.toHaveProperty('ayahs');
    }
  });

  it('preserves the number, name, and englishName values from the source', () => {
    const list = getSurahList(quranData);
    const first = list[0];
    expect(first).toBeDefined();
    expect(first!.number).toBe(1);
    expect(first!.englishName).toBe('Al-Faatiha');
  });

  it('returns a new array (does not expose the internal surahs reference)', () => {
    const list = getSurahList(quranData);
    expect(list).not.toBe(quranData.surahs);
  });
});

describe('getSurah', () => {
  it('returns the second surah with 286 ayahs for number 2', () => {
    const surah = getSurah(quranData, 2);
    expect(surah).toBeDefined();
    // The dataset uses "Al-Baqara" (Tanzil Uthmani transliteration).
    expect(surah!.englishName).toBe('Al-Baqara');
    expect(surah!.ayahs).toHaveLength(286);
  });

  it('returns the surah with all required fields', () => {
    const surah = getSurah(quranData, 1);
    expect(surah).toBeDefined();
    expect(surah).toHaveProperty('number', 1);
    expect(surah).toHaveProperty('name');
    expect(surah).toHaveProperty('englishName');
    expect(surah).toHaveProperty('ayahs');
  });

  it('returns undefined for number 0', () => {
    expect(getSurah(quranData, 0)).toBeUndefined();
  });

  it('returns undefined for number 115', () => {
    expect(getSurah(quranData, 115)).toBeUndefined();
  });

  it('returns undefined for negative numbers', () => {
    expect(getSurah(quranData, -1)).toBeUndefined();
  });

  it('returns the last surah (114) correctly', () => {
    const surah = getSurah(quranData, 114);
    expect(surah).toBeDefined();
    expect(surah!.number).toBe(114);
  });
});

describe('validateQuranData', () => {
  it('does not throw for valid real quran data', () => {
    expect(() => validateQuranData(quranData)).not.toThrow();
  });

  it('throws when given an empty surahs array', () => {
    expect(() => validateQuranData({ surahs: [] })).toThrow(
      'expected 114 surahs, got 0',
    );
  });

  it('throws when given a non-object', () => {
    expect(() => validateQuranData(null)).toThrow(
      'data must be a non-null object',
    );
  });

  it('throws when given a string', () => {
    expect(() => validateQuranData('invalid')).toThrow(
      'data must be a non-null object',
    );
  });

  it('throws when surahs field is missing', () => {
    expect(() => validateQuranData({})).toThrow('missing required field "surahs"');
  });

  it('throws when surahs is not an array', () => {
    expect(() => validateQuranData({ surahs: 'not an array' })).toThrow(
      '"surahs" must be an array',
    );
  });

  it('throws when a surah is not an object', () => {
    const stub = makeStubQuran(114);
    // Replace one surah with a non-object
    (stub.surahs as unknown[])[0] = 'bad';
    expect(() => validateQuranData(stub)).toThrow('is not an object');
  });

  it('throws when a surah is missing the number field', () => {
    const stub = makeStubQuran(114);
    const first = stub.surahs[0];
    if (first) {
      (first as unknown as Record<string, unknown>)['number'] = 'bad';
    }
    expect(() => validateQuranData(stub)).toThrow('missing numeric "number"');
  });

  it('throws when a surah is missing the name field', () => {
    const stub = makeStubQuran(114);
    const first = stub.surahs[0];
    if (first) {
      (first as unknown as Record<string, unknown>)['name'] = 42;
    }
    expect(() => validateQuranData(stub)).toThrow('missing string "name"');
  });

  it('throws when a surah is missing the englishName field', () => {
    const stub = makeStubQuran(114);
    const first = stub.surahs[0];
    if (first) {
      (first as unknown as Record<string, unknown>)['englishName'] = null;
    }
    expect(() => validateQuranData(stub)).toThrow('missing string "englishName"');
  });

  it('throws when a surah has a non-array ayahs field', () => {
    const stub = makeStubQuran(114);
    const first = stub.surahs[0];
    if (first) {
      (first as unknown as Record<string, unknown>)['ayahs'] = 'bad';
    }
    expect(() => validateQuranData(stub)).toThrow('missing array "ayahs"');
  });

  it('throws when an ayah is not an object', () => {
    const stub = makeStubQuran(114);
    const first = stub.surahs[0];
    if (first) {
      (first.ayahs as unknown[])[0] = 'bad';
    }
    expect(() => validateQuranData(stub)).toThrow('is not an object');
  });

  it('throws when an ayah is missing a numeric number', () => {
    const stub = makeStubQuran(114);
    const first = stub.surahs[0];
    const ayah = first?.ayahs[0];
    if (ayah) {
      (ayah as unknown as Record<string, unknown>)['number'] = 'bad';
    }
    expect(() => validateQuranData(stub)).toThrow('missing numeric "number"');
  });

  it('throws when an ayah is missing a string text', () => {
    const stub = makeStubQuran(114);
    const first = stub.surahs[0];
    const ayah = first?.ayahs[0];
    if (ayah) {
      (ayah as unknown as Record<string, unknown>)['text'] = 99;
    }
    expect(() => validateQuranData(stub)).toThrow('missing string "text"');
  });
});

describe('splitBasmala', () => {
  const quranData = realQuranData as Quran;

  it('extracts Basmala from Surah 1 ayah 1 (just the Basmala with BOM prefix)', () => {
    // Surah 1 ayah 1 is the Basmala alone, prefixed with U+FEFF in the dataset.
    const text = quranData.surahs[0]?.ayahs[0]?.text ?? '';
    const result = splitBasmala(text);
    expect(result.basmala).toBe(BASMALA);
    expect(result.rest).toBe('');
  });

  it('extracts Basmala from Surah 2 ayah 1 (Basmala prepended to ayah text)', () => {
    // Surah 2 ayah 1 starts with the Basmala followed by the actual first ayah.
    const text = quranData.surahs[1]?.ayahs[0]?.text ?? '';
    const result = splitBasmala(text);
    expect(result.basmala).toBe(BASMALA);
    expect(result.rest).toBe('الٓمٓ');
  });

  it('returns basmala=null for Surah 9 ayah 1 (no Basmala)', () => {
    // Surah 9 (At-Tawbah) has no Basmala — unique among the 114 surahs.
    const text = quranData.surahs[8]?.ayahs[0]?.text ?? '';
    const result = splitBasmala(text);
    expect(result.basmala).toBeNull();
    expect(result.rest).toBe(text);
  });

  it('returns basmala=null when Basmala appears mid-text (Surah 27:30)', () => {
    // Surah 27:30 is Solomon's letter, which contains the Basmala inside the verse.
    // The helper must not extract it — only the caller scopes extraction to ayah 1.
    const text = quranData.surahs[26]?.ayahs[29]?.text ?? '';
    const result = splitBasmala(text);
    expect(result.basmala).toBeNull();
    expect(result.rest).toBe(text);
  });
});
