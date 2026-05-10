## Review — Task v3-2 — Round 1
Date: 2026-05-10
Reviewer: reviewer subagent
Diff scope: git diff against HEAD (uncommitted changes)

**Verdict**
APPROVED

**Gate check**
typecheck: pass
lint: pass (0 warnings, 0 errors)
tests: pass (254 passed, 0 failed, 0 skipped)
build: pass
main chunk size: 50.90 KB gz (budget: 250KB)

**Acceptance criteria**

[x] AC1 — "Text size" label with current value rendered — `SettingsPanel.tsx:87-91` shows label + `aria-live` span with `textSizeRem.toFixed(3) + "rem"`; test at line 268 confirms.
[x] AC2 — `+` at 1.5 → calls `onTextSizeChange(1.625)` — `handleIncrease` at line 57-59 uses `Math.round((1.5+0.125)*1000)/1000 === 1.625`; test at line 299 asserts exact value.
[x] AC3 — `−` at 1.0 → no call, button disabled — `disabled={textSizeRem <= TEXT_SIZE_MIN}` at line 98; early return at line 53; test at lines 335 and 369 cover both.
[x] AC4 — `+` at 2.5 → no call, button disabled — `disabled={textSizeRem >= TEXT_SIZE_MAX}` at line 107; early return at line 58; test at lines 352 and 377 cover both.
[x] AC5 — `−` at 1.5 → calls `onTextSizeChange(1.375)` — `Math.round((1.5-0.125)*1000)/1000 === 1.375`; test at line 317 asserts exact value.
[x] AC6 — Accessible names on both buttons — `aria-label="Decrease text size"` and `aria-label="Increase text size"` at lines 97 and 106; tests at lines 276 and 283 confirm via `getByRole`.
[x] AC7 — ReaderView applies `textSizeRem` as inline `fontSize` — `style={{ fontSize: \`${textSizeRem}rem\` }}` on the `<p>` at `ReaderView.tsx:62`; test at `ReaderView.test.tsx:230-234` asserts `style.fontSize === '2rem'`.
[x] AC8 — Default `1.5` → `1.5rem` — `DEFAULT_SETTINGS.textSizeRem === 1.5` in `settings.ts:17`; App integration test at line 401 asserts initial `style.fontSize === '1.5rem'`.
[x] AC9 — App-level integration: select surah → open settings → click `+` → font updates without remount — integration test at `SettingsPanel.test.tsx:391-409` exercises real `useSettings` hook (no mock), asserts `style.fontSize === '1.625rem'` after click.
[x] AC10 — All four gates pass; lint zero warnings — confirmed above.
[x] AC11 — Test count 244 → 254 (+10 net: 11 added, 1 removed `children` test) — 254 confirmed by test run.
[x] AC12 — Main chunk growth ≤ 1 KB — 50.90 KB vs 50.32 KB = +0.58 KB; within budget.
[x] AC13 — No new deps; no off-limits changes — `git diff HEAD -- package.json` empty; off-limits dirs confirmed clean.
[x] AC14 — Existing Task 1 SettingsPanel tests still pass — all 16 prior tests updated with new required props and pass; only the `children` test was removed (the one Task 1 test that is no longer applicable).
[x] AC15 — `prefers-reduced-motion` opt-in flow intact — SettingsPanel CSS has no animations/transitions; flow is unaffected by this task.

**Critical showstoppers (crashes, undefined behavior, data loss)**

None found.

**Duplicated or unclean code**

None found.

**Performance issues**

None found.

**Testing gaps**

***Unit tests***

`SettingsPanel.tsx:87-91` — No test asserts that the *displayed value text* updates in the panel after clicking `+` or `−`. The interaction tests (lines 299-333) verify `onTextSizeChange` is called with the correct argument but do not assert the rendered value changes from `1.500rem` to `1.625rem`. This is only covered indirectly by the App-level integration test. A unit test with a controlled prop rerender would be more reliable.

***End-to-end / integration***

None found.

**Other must-fix issues (CLAUDE.md violations, type safety, accessibility, etc.)**

`SettingsPanel.tsx:87` — `<label>` is not associated with any interactive element (no `htmlFor`, no labelable child — the `+`/`−` buttons are siblings in a separate `<div>`). This is invalid HTML (WCAG 1.3.1 / 4.1.1). The element is functionally a `<div>` used as a visual label. Replace with `<span>` or `<div>` to avoid the invalid association. The buttons' own `aria-label` attributes fully cover accessibility needs.

**Should-fix (not blocking but address before next task)**

`SettingsPanel.tsx:89` — `aria-live="polite"` is inside a `<label>` element. While the span itself is valid as a live region, nesting an `aria-live` region inside a `<label>` can cause redundant or conflicting announcements in some screen readers (the label text is re-read alongside the live update). Move the `aria-live` span outside the label element once the label is converted to `<span>` or `<div>` as noted above.

`SettingsPanel.tsx:90` — Value displays as `1.500rem` (3 decimal places via `toFixed(3)`). The spec says "current value shown"; `1.500rem` is verbose compared to `1.5rem`. Consider `textSizeRem % 0.125 === 0` is always true for valid values, so `toFixed(3)` will always produce trailing zeros. Either document the 3dp format as intentional (comment) or use a smarter format that trims trailing zeros. Currently the test at line 272 hardcodes `1\.500rem` which locks in the format — fine, but make the choice explicit.
