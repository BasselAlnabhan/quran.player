#!/usr/bin/env node
// Post-build asset pre-compression. Walks dist/ and writes a .gz alongside
// every text asset that's worth compressing. nginx serves the .gz directly
// via `gzip_static on` so it doesn't have to gzip on every request — and at
// level 9 the resulting file is ~5% smaller than nginx's default level 6.
// woff2 / images / pre-compressed JSON are skipped (already compressed).

import { readdir, stat, readFile, writeFile } from 'node:fs/promises';
import { gzipSync, constants } from 'node:zlib';
import { join, extname } from 'node:path';

const ROOT = 'dist';
const MIN_BYTES = 1024;
const COMPRESS_EXT = new Set([
  '.js',
  '.css',
  '.html',
  '.json',
  '.svg',
  '.webmanifest',
  '.txt',
  '.map',
]);

let totalIn = 0;
let totalOut = 0;
let count = 0;

async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(path);
      continue;
    }
    if (!COMPRESS_EXT.has(extname(entry.name))) continue;

    const buf = await readFile(path);
    if (buf.length < MIN_BYTES) continue;

    const gz = gzipSync(buf, { level: constants.Z_BEST_COMPRESSION });
    if (gz.length >= buf.length) continue;

    await writeFile(`${path}.gz`, gz);
    totalIn += buf.length;
    totalOut += gz.length;
    count++;
  }
}

await walk(ROOT);
const saved = totalIn - totalOut;
const pct = totalIn > 0 ? ((saved / totalIn) * 100).toFixed(1) : '0.0';
console.log(
  `compressed ${count} files: ${(totalIn / 1024).toFixed(1)} KB -> ${(totalOut / 1024).toFixed(1)} KB (-${pct}%)`,
);
