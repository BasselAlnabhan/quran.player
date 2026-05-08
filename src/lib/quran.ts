import type { Quran, Surah } from '@/lib/types';

export type SurahSummary = Pick<Surah, 'number' | 'name' | 'englishName'>;

export function getSurahList(data: Quran): SurahSummary[] {
  return data.surahs.map(({ number, name, englishName }) => ({
    number,
    name,
    englishName,
  }));
}

export function getSurah(data: Quran, number: number): Surah | undefined {
  // Array.prototype.find avoids the noUncheckedIndexedAccess issue with direct indexing.
  return data.surahs.find((s) => s.number === number);
}

export function validateQuranData(data: unknown): asserts data is Quran {
  if (typeof data !== 'object' || data === null) {
    throw new Error('validateQuranData: data must be a non-null object');
  }

  if (!('surahs' in data)) {
    throw new Error('validateQuranData: missing required field "surahs"');
  }

  const { surahs } = data as { surahs: unknown };

  if (!Array.isArray(surahs)) {
    throw new Error('validateQuranData: "surahs" must be an array');
  }

  if (surahs.length !== 114) {
    throw new Error(
      `validateQuranData: expected 114 surahs, got ${String(surahs.length)}`,
    );
  }

  for (let i = 0; i < surahs.length; i++) {
    const surah: unknown = surahs[i];

    if (typeof surah !== 'object' || surah === null) {
      throw new Error(`validateQuranData: surah at index ${String(i)} is not an object`);
    }

    const s = surah as Record<string, unknown>;

    if (typeof s['number'] !== 'number') {
      throw new Error(`validateQuranData: surah at index ${String(i)} missing numeric "number"`);
    }

    if (typeof s['name'] !== 'string') {
      throw new Error(`validateQuranData: surah at index ${String(i)} missing string "name"`);
    }

    if (typeof s['englishName'] !== 'string') {
      throw new Error(`validateQuranData: surah at index ${String(i)} missing string "englishName"`);
    }

    if (!Array.isArray(s['ayahs'])) {
      throw new Error(`validateQuranData: surah at index ${String(i)} missing array "ayahs"`);
    }

    const ayahs = s['ayahs'] as unknown[];

    for (let j = 0; j < ayahs.length; j++) {
      const ayah: unknown = ayahs[j];

      if (typeof ayah !== 'object' || ayah === null) {
        throw new Error(
          `validateQuranData: ayah at surah ${String(i)} index ${String(j)} is not an object`,
        );
      }

      const a = ayah as Record<string, unknown>;

      if (typeof a['number'] !== 'number') {
        throw new Error(
          `validateQuranData: ayah at surah ${String(i)} index ${String(j)} missing numeric "number"`,
        );
      }

      if (typeof a['text'] !== 'string') {
        throw new Error(
          `validateQuranData: ayah at surah ${String(i)} index ${String(j)} missing string "text"`,
        );
      }
    }
  }
}
