# ADR 0003 — Tajweed data source, client-side parser, and rendering approach

**Status:** Superseded by ADR 0005
**Date:** 2026-05-10

## Context

The v1 reader displayed plain Uthmani Arabic from the `quran-uthmani` edition.
The v2 objective was to add tajweed colouring — visually highlighting
phonological rules (ghunnah, madda, qalqalah, etc.) by rendering each annotated
segment in its conventional colour. The alquran.cloud `quran-tajweed` edition
provides the same corpus augmented with inline annotation markers such as
`[h:1[ٱ]`. Four architectural decisions were made to deliver this feature; they
are recorded here.

## Decision

1. **Retain `src/data/quran.json` as the single data path.** Switching to a
   parallel file (`quran-tajweed.json`) would have required updating
   `vite.config.ts` `manualChunks`, `.eslintrc.json` `ignorePatterns`, and four
   existing test files. Because the app schema is unchanged (surahs → ayahs →
   `text: string`) the fetch script simply targets the new edition and writes to
   the same path. Only the content of `text` changed — it now carries annotation
   markers alongside Arabic letters.

2. **Parse markers on the client with a hand-written pure function.** Pre-parsing
   at fetch time (transforming the JSON before it is committed) was considered
   and rejected for three reasons: the source data would no longer be a faithful
   copy of the upstream corpus; a future parser improvement would require a
   re-fetch rather than just a code change; and the grammar is small enough that
   a 65-line pure function in `src/lib/tajweed.ts` covers it completely with
   100% branch coverage and no external dependency.

3. **Plain tokens render as bare text nodes — no wrapping element.** Wrapping
   unstyled Arabic in a `<span>` creates a new inline-formatting context that
   can break cursive ligature connections between adjacent glyphs. Only `rule`
   tokens receive a `<span>`; `plain` tokens are returned as raw strings from the
   `.map()` call. React allows string and element children to coexist in an
   array; only element children require `key` props, so there is no key-warning
   problem.

4. **Rule spans are `display: inline` with colour only — no padding, margin, or
   border.** The same cursive-joining constraint forbids `display: inline-block`
   (which would insert a separate inline formatting context) and any box-model
   spacing. Tajweed colour is communicated exclusively through the `color`
   property. All twelve defined colors were verified to meet WCAG AA large-text
   contrast (3:1) against both the light background (`#ffffff`) and the dark
   background (`#0f172a`), so no `prefers-color-scheme` variants are needed — a
   single palette value per rule passes on both surfaces.

## Consequences

- **Data size increase.** The quran-data chunk grew from roughly 400 KB gzipped
  (v1, plain Uthmani) to 408 KB gzipped (v2, tajweed-annotated), with the raw
  chunk at 1,223 KB. This remains well below the Workbox 6 MB
  `maximumFileSizeToCacheInBytes` guard set in ADR 0002. The main application
  chunk is 49.89 KB gzipped — within the 250 KB budget and only 0.61 KB larger
  than the v1 baseline (49.28 KB).
- **Parser coupling.** The client parser is tightly coupled to the
  `[<code>[<content>]` marker syntax. If alquran.cloud changes the annotation
  format, `src/lib/tajweed.ts` must be updated. The source data file does not
  need to change because it stores the raw markers verbatim.
- **Future translation editions.** Editions that do not contain tajweed markers
  will produce single-token `plain` output from `parseTajweed`, rendering
  correctly as unstyled text. No code change is needed to support marker-free
  text; the parser degrades gracefully.
- **No runtime cost for plain text.** Because the parser is called per-ayah at
  render time (not at data-load time), a future toggle that disables tajweed
  colouring can simply bypass `<TajweedAyah>` and render the raw string, with no
  wasted parse work.
