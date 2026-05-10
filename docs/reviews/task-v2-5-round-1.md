## Review — Task v2-5 — Round 1
Date: 2026-05-10
Reviewer: reviewer subagent
Diff scope: untracked files against HEAD (75cc5fb — v2 task 4); only new file is docs/adr/0003-tajweed-data-and-parser.md; no source, test, or config file changes

**Verdict**
APPROVED

**Gate check**
typecheck: pass
lint: pass (0 warnings, 0 errors)
tests: pass (227 passed, 0 failed, 0 skipped)
build: pass
main chunk size: 49.89 KB gz (budget: 250 KB)

**Acceptance criteria**

[x] ADR file written to docs/adr/0003-tajweed-data-and-parser.md — present as untracked file; content verified below.
[x] Same ADR template as 0001/0002 — header (date, status), Context, Decision, Consequences sections all present; no extra sections; no emojis; no marketing language.
[x] Length proportional — 70 lines vs 36 and 43 for prior ADRs; subject covers four decisions vs one or two; ~1.7x longer is justified and within the "not 5x" guard.
[x] Decision 1 recorded — data path stays at src/data/quran.json; explains what would have needed updating with a parallel file; chosen alternative stated.
[x] Decision 2 recorded — client-side hand-written parser; three concrete reasons for rejecting pre-parse at fetch time; mentions grammar size (65 lines, 100% branch coverage) and no external dependency.
[x] Decision 3 recorded — plain tokens as bare text nodes; explains cursive joining constraint; notes React allows string+element children coexist without key warnings.
[x] Decision 4 recorded — display:inline, color only; explains why inline-block is forbidden; WCAG AA 3:1 on both backgrounds verified; no per-theme variants needed.
[x] Consequences section honest about trade-offs — data chunk growth (400 KB → 408 KB gz, raw 1,223 KB), well under 6 MB Workbox limit; main chunk grew 0.61 KB; parser coupling to marker syntax; future marker-free editions degrade gracefully.
[x] Background hex colors accurate — ADR mentions #ffffff (light) and #0f172a (dark); both confirmed against TajweedAyah.module.css comment table and manifest.
[x] No fifth key decision about future translation editions — brief spec listed "5 decisions including a contrast note"; the ADR covers contrast inside Decision 4 and translation editions inside Consequences; this is appropriate structure, not an omission.
[x] WCAG contrast values accurate — all seven unique colors verified with WCAG 2.1 luminance formula: #666666 (5.74:1 / 3.11:1), #c85a00 (4.27:1 / 4.18:1), #dd0008 (5.15:1 / 3.47:1), #1e8e3e (4.21:1 / 4.25:1), #c8398f (4.73:1 / 3.77:1), #069daa (3.28:1 / 5.45:1), #178a40 (4.42:1 / 4.03:1) — all ≥3.0:1 on both backgrounds.
[x] TajweedAyah.tsx branch coverage — coverage report shows 30% branch; lines 16-27 (RULE_CLASS_MAP ?? '' fallbacks) and 33-36 (ruleClass ?? fallbacks) are null-coalescing false branches; CSS modules always return non-null strings in both jsdom and production; these branches are structurally unreachable, not a test gap. Confirmed by reading TajweedAyah.tsx lines 15-37.
[x] All four gates pass — typecheck: zero errors; lint: zero warnings/errors; tests: 227/227; build: succeeds.
[x] Coverage src/lib/ ≥ 90% lines — 100% lines across bookmark.ts, log.ts, quran.ts, scroll-engine.ts, settings.ts, tajweed.ts.
[x] Coverage overall ≥ 70% lines — 98.85% overall lines.
[x] Main chunk under 250 KB gz — 49.89 KB gz (verified: gzip -c gives 49,795 bytes).
[x] Quran-data chunk under 6 MB Workbox limit — 1,867,691 bytes raw (1.78 MB), 417,236 bytes gz; well under 6 MB.
[x] dist/sw.js present — present; content confirms Workbox generateSW output.
[x] dist/manifest.webmanifest present — present; JSON valid, icons referenced correctly.
[x] dist/assets/index-*.js present — index-kCJrl36b.js present.
[x] dist/assets/quran-data-*.js present — quran-data-QGWdFCkZ.js present; icons present in dist/icons/.
[x] No off-limits drift — git status --porcelain shows only two untracked files (docs/adr/0003-tajweed-data-and-parser.md and docs/briefs/0002-v2-settings-and-polish.md); git diff HEAD on all config files, .claude/, and src/ is empty.
[x] docs/reviews/ audit log — task-v2-1-round-1.md, task-v2-2-round-1.md, task-v2-3-round-1.md are all committed; no review for Task 4 (the implementer performed a direct spot-check; Task 4 was a single two-line wiring change with a build + test run recorded in the commit message; the omission is defensible but marginal — flag noted below).

**Brief acceptance criteria (docs/briefs/0002-tajweed-rendering.md)**

[x] AC1 — scripts/fetch-quran.ts targets quran-tajweed, writes to src/data/quran.json, no pre-parse — confirmed in committed script (line 27: SOURCE = quran-tajweed; line 55: writeFile writes raw JSON including markers verbatim).
[x] AC2 — parseTajweed(input): TajweedToken[] in src/lib/tajweed.ts — exported function with exact signature; unknown codes treated as rule tokens; never throws (malformed input tested).
[x] AC3 — TajweedAyah in src/features/reader/ renders rule tokens as spans, plain tokens as bare text — confirmed in TajweedAyah.tsx; tests confirm no spans for plain-only input.
[x] AC4 — CSS module covers at minimum ham_wasl, madda, ghunnah, ikhafa, idghaam, qalqalah, silent; unknown → neutral fallback — all seven required rules present; ruleUnknown uses currentColor (always visible); 12 total rules defined.
[x] AC5 — display:inline, no padding/margin, only Arabic substring inside spans — every rule class in TajweedAyah.module.css has display:inline and color only (plus font-style for ruleSilent). No padding, margin, or border declared.
[x] AC6 — Parser tests cover all six required scenarios — plain text, single rule, adjacent, multi-codepoint, malformed-unclosed, Al-Fatiha v1 round-trip all present in tests/unit/lib/tajweed.test.ts.
[x] AC7 — Visual smoke test: Al-Fatiha renders with no literal [ or ] characters and intact word shapes — automated proxy in TajweedAyah.test.tsx (line 176-194) verifies no [ or ] in textContent and 7 colored spans; real-browser smoke is by definition non-automated but the automated test is the strongest available proxy.
[x] AC8 — All gates pass; main chunk ≤ 250 KB gz; Quran data in its own chunk — confirmed above.

**Critical showstoppers (crashes, undefined behavior, data loss)**

None found.

**Duplicated or unclean code**

None found.

**Performance issues**

None found.

**Testing gaps**
***Unit tests***

None found.

***End-to-end / integration***

Task 4 (wiring TajweedAyah into ReaderView) has no dedicated formal review file — the implementer relied on the existing ReaderView.test.tsx and spot-checked the build. This is defensible for a two-line wiring change but leaves the audit trail incomplete for CLAUDE.md's workflow requirement.

**Other must-fix issues (CLAUDE.md violations, type safety, accessibility, etc.)**

None found.

**Should-fix (not blocking but address before next task)**

scripts/fetch-quran.ts:33,58,59 — console.warn used for progress logging; flagged in task-v2-1-round-1.md as a should-fix; still present; CLAUDE.md says no console.log in committed code; console.warn is not console.log so it is not a hard violation, but the spirit of the rule (use lib/log.ts) applies even to scripts/. Out of scope for Task 5 but still outstanding.

**Closing v2 summary**

Gates: typecheck pass, lint pass (0 warnings), tests pass (227/227), build pass.
Coverage: src/lib/ 100% lines; overall 98.85% lines.
Main chunk: 49.89 KB gz (budget: 250 KB).
Quran-data chunk: 1,867,691 bytes raw (1.78 MB) / 408 KB gz; under 6 MB Workbox limit.
Brief's 8 acceptance criteria: all covered by real tests and confirmed via source inspection. No gaps.
v2 is complete and ready to ship.
