import type { Quran, Surah } from '@/lib/types';

export type SurahSummary = Pick<Surah, 'number' | 'name' | 'englishName'>;

export const BASMALA = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ';

/**
 * If `text` starts with the Basmala (optionally preceded by a Unicode BOM or
 * whitespace), returns the Basmala separately and the leading-trimmed remainder.
 * Otherwise returns the input unchanged with basmala=null. Caller must scope
 * this to the FIRST ayah only — the Basmala appears mid-text in Surah 27:30
 * (Solomon's letter) and must not be extracted there.
 */
export function splitBasmala(text: string): { basmala: string | null; rest: string } {
  // Strip the Unicode BOM that prefixes Al-Faatiha ayah 1, then leading whitespace.
  // String.fromCharCode avoids embedding an irregular whitespace character in source.
  const bomStripped = text.startsWith(String.fromCharCode(0xfeff)) ? text.slice(1) : text;
  const trimmed = bomStripped.trimStart();
  if (trimmed.startsWith(BASMALA)) {
    return { basmala: BASMALA, rest: trimmed.slice(BASMALA.length).trimStart() };
  }
  return { basmala: null, rest: text };
}

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
