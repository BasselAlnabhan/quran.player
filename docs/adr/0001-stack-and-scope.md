# ADR 0001 — Stack and scope baseline

**Status:** Accepted
**Date:** 2026-05-08

## Context

Greenfield project. Need to lock in the foundational choices so subsequent
work is decisive and the agents have a clear contract.

## Decision

- **Stack:** Vite + React 18 + TypeScript (strict). Vitest + RTL for tests.
  CSS Modules for styles.
- **State:** Local React state. No external state library.
- **Quran data:** Bundled as JSON in `src/data/quran.json`, sourced via
  `scripts/fetch-quran.ts` from alquran.cloud (Tanzil Uthmani). Offline-first.
- **PWA:** `vite-plugin-pwa` with autoUpdate; main bundle budget 250KB gzipped
  (Quran data is its own chunk).
- **MVP scope:** surah picker, auto-scroll with adjustable speed, bookmark/resume,
  installable PWA. No audio, no translations, no tafsir, no accounts in v1.
- **Quality gates:** typecheck, lint (zero warnings), test, build — enforced by
  `.claude/hooks/run-gates.sh`.

## Consequences

- Vendoring the Quran adds ~1MB gzipped to the install footprint, but makes
  the app fully usable offline from first run, which is the whole point of
  bundling it locally.
- No state library means we'll lift state up by hand. With this scope (one
  reader screen, a picker, a settings panel) that's correct; revisit if the
  app grows.
- Strict TypeScript with `noUncheckedIndexedAccess` will surface real bugs
  in ayah/surah indexing early. It also means more `if (x === undefined)`
  checks; that's the cost of correctness.
- The 250KB budget rules out heavy UI libraries. CSS Modules keep us honest.
