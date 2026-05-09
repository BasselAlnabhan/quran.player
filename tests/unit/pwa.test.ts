import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// __dirname is the tests/unit directory; dist sits at the repo root.
const distDir = resolve(__dirname, '../../dist');
const manifestPath = resolve(distDir, 'manifest.webmanifest');

describe('PWA manifest', () => {
  it.skipIf(!existsSync(manifestPath))(
    'is generated and references valid icons',
    () => {
      const raw = readFileSync(manifestPath, 'utf8');
      const manifest: unknown = JSON.parse(raw);

      // Top-level shape checks.
      expect(manifest !== null && typeof manifest === 'object').toBe(true);
      const m = manifest as Record<string, unknown>;
      expect(Array.isArray(m['icons'])).toBe(true);

      const icons = m['icons'] as unknown[];
      expect(icons.length).toBeGreaterThanOrEqual(3);

      // Every icon src must resolve to a file that exists in dist.
      // vite-plugin-pwa writes relative paths (no leading /), e.g. "icons/icon-192.png".
      for (const icon of icons) {
        expect(icon !== null && typeof icon === 'object').toBe(true);
        const entry = icon as Record<string, unknown>;
        expect(typeof entry['src']).toBe('string');

        const src = entry['src'] as string;
        // Strip a leading "/" if present (defensive — Workbox may change this).
        const iconPath = resolve(distDir, src.replace(/^\//, ''));
        expect(existsSync(iconPath)).toBe(true);
      }
    },
  );
});
