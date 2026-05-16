# ADR 0005 — Revert to plain Uthmani data, remove tajweed parser and renderer

**Status:** Accepted
**Date:** 2026-05-14

## Context

ADR 0003 introduced the `quran-tajweed` edition from alquran.cloud, a client-side
parser (`src/lib/tajweed.ts`), and a coloured renderer (`TajweedAyah`) that
highlighted phonological rules (ghunnah, madda, qalqalah, etc.) in conventional
colours. The pedagogical intent was to help readers identify tajweed rules
visually while reading.

After shipping, the tradeoffs were re-evaluated:

- **Bundle size.** The tajweed-annotated JSON is ~380 KB larger raw than the
  plain Uthmani edition (1.87 MB vs ~1.44 MB). Even gzipped, this adds
  meaningful transfer weight for a reading-focused app.
- **Complexity.** The parser adds ~70 lines of non-trivial code with a
  bespoke grammar, an 18-test suite, and a CSS class map for 13 rule codes.
  Every future edit to the data layer must account for the annotation format.
- **Misaligned scope.** The app is explicitly positioned as a **reading** tool,
  not a **learning** tool (CLAUDE.md: "out of scope for v1 — Translations,
  Tafsir, search"). Tajweed colouring serves learners studying pronunciation
  rules; casual readers gain little from it and may find the coloured text
  distracting.
- **Maintenance coupling.** The parser is tightly coupled to the
  `[<code>[<content>]` marker syntax. Any upstream format change requires a
  coordinated parser update.

## Decision

Switch the fetch source back to `quran-uthmani` (plain Uthmani script, no
annotation markers). Delete the tajweed parser (`src/lib/tajweed.ts`), the
coloured renderer (`TajweedAyah.tsx` + `TajweedAyah.module.css`), and their
tests. Render ayah text directly as `{ayah.text}` in `ReaderView`.

## Consequences

- **~380 KB smaller raw JSON** (1.87 MB → ~1.44 MB). Gzipped bundle for the
  quran-data chunk is reduced proportionally.
- **Simpler render path.** `ReaderView` renders a bare string per ayah; no
  component indirection, no token map, no key-warning edge cases.
- **Simpler tests.** The 18 parser unit tests and the TajweedAyah component
  tests are deleted. The ReaderView test no longer needs to verify marker
  stripping.
- **Lost tajweed colouring.** Users who benefited from the visual rule
  highlighting lose that feature. It can be re-introduced as an opt-in overlay
  in a future version if there is clear demand.
- **ADR 0003 superseded.** That record is retained as historical context; its
  status is updated to "Superseded by ADR 0005".
