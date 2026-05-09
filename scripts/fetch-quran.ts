/**
 * One-off script: downloads the Tanzil Uthmani tajweed-annotated Quran and
 * transforms it into the schema declared in CLAUDE.md.
 *
 * Run with: npm run fetch-quran
 *
 * Writes to src/data/quran.json. Commit the result — we want builds
 * reproducible and offline.
 *
 * Source: https://api.alquran.cloud/v1/quran/quran-tajweed
 * (CC BY 4.0, see https://alquran.cloud)
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

type ApiAyah = { numberInSurah: number; text: string };
type ApiSurah = {
  number: number;
  name: string;
  englishName: string;
  ayahs: ApiAyah[];
};
type ApiResponse = { data: { surahs: ApiSurah[] } };

const SOURCE = 'https://api.alquran.cloud/v1/quran/quran-tajweed';

async function main() {
  const here = dirname(fileURLToPath(import.meta.url));
  const out = resolve(here, '../src/data/quran.json');

  console.warn(`Fetching from ${SOURCE} ...`);
  const res = await fetch(SOURCE);
  if (!res.ok) {
    throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
  }
  const json = (await res.json()) as ApiResponse;

  const surahs = json.data.surahs.map((s) => ({
    number: s.number,
    name: s.name,
    englishName: s.englishName,
    ayahs: s.ayahs.map((a) => ({
      number: a.numberInSurah,
      text: a.text,
    })),
  }));

  if (surahs.length !== 114) {
    throw new Error(`Expected 114 surahs, got ${surahs.length}`);
  }

  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, JSON.stringify({ surahs }), 'utf8');

  const totalAyahs = surahs.reduce((n, s) => n + s.ayahs.length, 0);
  console.warn(`Wrote ${out}`);
  console.warn(`  ${surahs.length} surahs, ${totalAyahs} ayahs total`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
