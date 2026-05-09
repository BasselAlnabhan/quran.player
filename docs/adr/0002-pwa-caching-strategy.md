# ADR 0002 — PWA caching strategy

**Status:** Accepted
**Date:** 2026-05-09

## Context

Brief item 5 requires the app to be installable and work offline after first
load. Everything the app needs at runtime is bundled: the app shell (HTML, JS,
CSS, icons) and the Quran text itself (~1 MB as a separate JS chunk). There are
no runtime network calls — all Quran data is imported at build time and split
via `manualChunks` so the JSON has its own cache entry independent of the app
shell.

## Decision

Use Workbox `generateSW` mode (the default for `vite-plugin-pwa`) to precache
the entire production output on first install:

- **App shell** (HTML, JS, CSS, icons): precached automatically. On a code
  change the new service worker activates; users get the updated shell on the
  next page load (via the `autoUpdate` register strategy).
- **Quran data chunk** (`quran-data-*.js`): also precached. The data is
  immutable for v1 — no scenario where the JSON changes between deploys without
  a corresponding code change, so precaching the whole file is correct.
- `maximumFileSizeToCacheInBytes` is set to 6 MB to accommodate the ~850 KB
  minified JSON chunk without triggering Workbox's default 2 MB guard.
- `globPatterns` covers `**/*.{js,css,html,png,svg,woff2,json}` — all static
  assets.
- **Runtime caching: none.** Nothing comes from the network at runtime, so
  stale-while-revalidate and similar strategies add complexity with no benefit.

## Consequences

- **First load cost:** the full ~1 MB JSON chunk is downloaded and cached once.
  After that every navigation is offline-capable with no further network cost.
- **Update cost:** any change to the Quran JSON re-precaches the entire chunk.
  Acceptable for v1; if we later add on-demand translations, runtime caching
  with a cache-first strategy would replace this.
- **Storage:** ~1 MB per origin in the SW cache — well within the typical 50 MB+
  browser quota.
- **Simplicity:** a single precache list, no runtime routing rules, no cache
  expiration logic to maintain.
