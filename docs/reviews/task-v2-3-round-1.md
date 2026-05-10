## Review — Task v2-3 — Round 1
Date: 2026-05-10
Reviewer: reviewer subagent
Diff scope: untracked files against HEAD (TajweedAyah.tsx, TajweedAyah.module.css, TajweedAyah.test.tsx)

**Verdict**
CHANGES REQUIRED

**Gate check**
typecheck: pass
lint: pass (0 warnings, 0 errors)
tests: pass (225 passed, 0 failed, 0 skipped)
build: pass
main chunk size: 49.28KB gz (budget: 250KB)

**Acceptance criteria**

[x] 1. Plain tokens render as bare text nodes — no spans for plain-only input confirmed by test and source (token.kind === 'plain' returns token.text bare).
[x] 2. Rule tokens render as `<span className={ruleClass(code)}>` — confirmed in TajweedAyah.tsx:74-78.
[x] 3. Empty input renders nothing — test at line 56-61 passes.
[x] 4. Adjacent rule markers produce no phantom plain between them — test at line 67-95 verifies no text nodes between sibling spans.
[x] 5. Unknown rule codes fall back to ruleUnknown class — TajweedAyah.tsx:48 uses `?? styles.ruleUnknown!`; test at line 101-109 confirms.
[x] 6. Known codes map to non-empty CSS classes with declared colors — all 12 codes present in RULE_CLASS_MAP and CSS module.
[x] 7. No `dangerouslySetInnerHTML` — confirmed by source inspection; test at line 163-169 also exercises this.
[x] 8. Spans use `display: inline` — every rule class in the CSS has only `display: inline` and `color` (plus `font-style` for .ruleSilent). No padding, margin, or border.
[x] 9. Rule colors documented in a comment at top of CSS file — lines 1-36 contain the full mapping table.
[x] 10. Al-Fatiha verse 1 smoke test renders with no literal `[` or `]` — tests at line 176-193 pass.
[x] 11. No React key warning — verified by running tests with --reporter=verbose; no "key prop" output.
[x] 12. All four gates green, lint zero warnings — confirmed above.
[x] 13. Reasonable coverage on TajweedAyah.tsx — implementer reports 100% statements/functions/lines, 85.71% branches.
[x] 14. Test count 194 → 225 (31 new tests) — confirmed.
[x] 15. Main chunk unchanged at 49.28KB gz — confirmed.
[x] 16. No new dependencies, no off-limits file modifications — `git diff HEAD -- package.json package-lock.json` is empty; untracked files are only the three expected new files plus the unrelated `docs/briefs/0002-v2-settings-and-polish.md`.
[✗] Color contrast AA for all colors against both backgrounds — TWO colors fail WCAG AA large-text (3:1) against the light background (#ffffff). See must-fix below.

**Critical showstoppers (crashes, undefined behavior, data loss)**

None found.

**Duplicated or unclean code**

None found.

**Performance issues**

None found.

**Testing gaps**
***Unit tests***

TajweedAyah.test.tsx — No test for `ruleSilent` (code `s`) class application specifically. The parametric loop at line 200-227 covers it, but the earlier per-code tests (lines 131-155) skip `s`, `u`, `f`, `a`, `w`, `c`. The parametric loop compensates, so this is minor.

TajweedAyah.test.tsx — No test that verifies `font-style: italic` is applied to `.ruleSilent` spans (silent letter should be visually distinguished).

***End-to-end / integration***

None found beyond what was expected for this tree-shaken component.

**Other must-fix issues (CLAUDE.md violations, type safety, accessibility, etc.)**

src/features/reader/TajweedAyah.module.css:48-50 — `#ff7e1e` (Ghunnah, code `n`) has a contrast ratio of 2.54:1 against `#ffffff` (light background), failing WCAG AA for large text (3:1 threshold). This is a CLAUDE.md violation ("Color contrast AA minimum for all text including Arabic") and the task spec acceptance criterion. Five grey codes (`#aaaaaa`, codes h/l/s/a/w) also fail at 2.32:1 as the implementer documented — the spec required fixing or explicit user acceptance, not unilateral deferral.

src/features/reader/TajweedAyah.module.css:32 — The CSS comment at line 32-35 explicitly states "All other palette entries (#ff7e1e, #dd0008, ...) achieve ≥3:1 against #ffffff" — this is factually incorrect. #ff7e1e achieves only 2.54:1 against #ffffff. The comment is a false compliance claim.

**Should-fix (not blocking but address before next task)**

src/features/reader/TajweedAyah.tsx:14-39 — The thirteen `// eslint-disable-next-line @typescript-eslint/no-non-null-assertion` suppressions could be replaced with a single typed helper that accesses the CSS module with a type assertion at the point of assignment (e.g. `const s = styles as Record<string, string>`), reducing noise.

src/features/reader/TajweedAyah.tsx:75 — Using array index `i` as React key is acceptable here (tokens are stable for a given `text` prop value and not reordered), but a key derived from `token.ruleCode + ':' + i` would be more descriptive.
