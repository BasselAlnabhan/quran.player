# Brief: switch reader to tajweed-colored Arabic

## Context

Current `src/data/quran.json` is sourced from `quran-uthmani` (plain text).
We want to switch to `quran-tajweed`, which returns the same Arabic text
augmented with inline annotation markers like `[h:1[ٱ]` for tajweed rules.
The reader currently shows these markers as literal characters because no
parser is in place. Goal: render them as colored spans per the standard
alquran.cloud tajweed CSS classes.

## What this changes — and what it doesn't

- Data source: switch the fetch script from edition `quran-uthmani` to
  `quran-tajweed`. Still bundled, still offline. Schema unchanged from the
  app's perspective (surahs → ayahs → text), but `text` now contains
  annotation markers in addition to Arabic letters.
- Storage: still `src/data/quran.json`. No runtime API calls. Bookmark
  format unchanged.
- Out of scope: word-by-word display, tajweed legend/key UI, per-rule
  toggle (e.g. "show only ghunnah"). Maybe v2.

## Acceptance criteria for v1 of this feature

1. `scripts/fetch-quran.ts` downloads `quran-tajweed` and writes the same
   schema. Annotation markers are preserved verbatim in `ayah.text` — do
   NOT pre-parse at fetch time. Parsing belongs in the client so the JSON
   stays a faithful copy of the source.
2. A pure parser in `src/lib/tajweed.ts` converts an ayah's annotated text
   into a structured token stream:
```ts
   type TajweedToken =
     | { kind: 'plain'; text: string }
     | { kind: 'rule'; ruleCode: string; text: string };
   function parseTajweed(input: string): TajweedToken[];
```
   The marker syntax is: opening `[<code>[` ... closing `[`. Codes seen in
   the data include `h` (hamzat ul wasl), `n` (ghunnah), `p`, `s`, `m`,
   `l`, `i` and a colon-suffixed numeric ID after some codes (e.g. `h:1`,
   `h:2`). The parser does not need to know what each rule means — it
   just needs to identify the boundaries and pass `ruleCode` through.
   Treat unknown codes as 'rule' tokens with their literal code string;
   never throw.
3. A React component `<TajweedAyah text={...} />` in
   `src/features/reader/` renders the token stream. Each rule token is a
   `<span class={ruleClass(ruleCode)}>` wrapping the Arabic substring.
   Plain tokens render as bare text (NOT wrapped in spans — wrapping
   plain text in spans risks breaking Arabic shaping).
4. CSS module maps each rule code to a color, matching the alquran.cloud
   default palette as documented at https://alquran.cloud/tajweed-guide.
   At minimum: ham_wasl, madda, ghunnah, ikhafa, idghaam, qalqalah,
   silent. Unknown codes get a neutral fallback color (don't fail-closed
   into invisible text).
5. The rendered spans use `display: inline` (NEVER `inline-block`), no
   inner padding/margin, and contain only the Arabic substring — no
   whitespace, no zero-width chars. This is to preserve cursive joining.
6. Tests for `parseTajweed`:
   - Plain text with no markers → single 'plain' token.
   - Single rule marker → 'plain', 'rule', 'plain'.
   - Adjacent rule markers → no plain token between them.
   - Marker spanning multiple Arabic codepoints (combining marks).
   - Malformed input (unclosed marker) → recovers by treating remainder
     as plain; never throws.
   - Real fixture: Surah Al-Fatiha ayah 1 round-trips correctly.
7. Visual smoke test in browser: Surah Al-Fatiha renders with no visible
   `[`, `]`, or rule codes. Letters within colored regions remain
   correctly joined (no broken word shapes).
8. All existing gates pass. Bundle size does not exceed 250KB main chunk
   gz; the Quran JSON grows (estimate ~3-4MB unparsed) but lives in its
   own chunk.

## What planner should NOT do

- Do not introduce a runtime parsing library — write the parser by hand.
  The grammar is small and a 50-line parser is better than a dependency.
- Do not add `dangerouslySetInnerHTML`. The PHP reference parser produces
  HTML strings; we produce React elements directly from a token stream.
  Safer, type-checked, no XSS surface.
- Do not pre-parse the JSON at fetch time. Keep the source data as-is so
  we can swap parsers later without re-fetching.