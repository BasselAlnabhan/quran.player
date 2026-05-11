## Review — Task v3-5 — Round 1
Date: 2026-05-11
Reviewer: reviewer subagent
Diff scope: git diff against HEAD (uncommitted changes)

**Verdict**
APPROVED

**Gate check**
typecheck: pass
lint: pass (0 warnings, 0 errors)
tests: pass (294 passed, 0 failed, 0 skipped)
build: pass
main chunk size: 51.46 KB gz (budget: 250 KB)

**Acceptance criteria**

[x] AC1 — `global.css` adds `[data-theme="light"]` and `[data-theme="dark"]` blocks defining all 5 tokens (`--color-bg`, `--color-fg`, `--color-muted`, `--color-accent`, `--color-error`).
[x] AC2 — Original `:root {}` block (lines 2-8) and `@media (prefers-color-scheme: dark)` block (lines 10-19) are unchanged; new blocks inserted at line 24 after the media query.
[x] AC3 — `App.tsx` `useEffect` keyed on `[settings.theme]`; auto mode uses `delete document.documentElement.dataset.theme`; light/dark set the attribute directly.
[x] AC4 — `SettingsPanel` Props type includes `theme: Theme` and `onThemeChange: (theme: Theme) => void`, both required; `Theme` imported from `@/lib/settings`.
[x] AC5 — Three `<button type="button">` elements rendered via a `.map` over `['auto', 'light', 'dark'] as const`; labels are Auto, Light, Dark.
[x] AC6 — `aria-pressed={theme === t}` produces `"true"` on the active button and `"false"` on the others; verified by three test assertions per state.
[x] AC7 — Click handlers call `onThemeChange(t)` with the correct literal; tests verify all three values.
[x] AC8 — `.themeButton` has `min-width: 44px; min-height: 44px`.
[x] AC9 — App integration tests verify `dataset.theme === 'dark'` and `=== 'light'` after clicking respective buttons.
[x] AC10 — `afterEach(() => { delete document.documentElement.dataset.theme; })` scoped to `describe('App — theme toggle wired end-to-end')` runs after every test in that suite.
[x] AC11 — All existing SettingsPanel renders updated with `theme="auto" onThemeChange={vi.fn()}`; 285 prior tests still pass.
[x] AC12 — All four gates pass.
[x] AC13 — 294 tests (was 285; +9 net).
[x] AC14 — Main chunk +0.22 KB gz (well within 1 KB budget).
[x] AC15 — No new dependencies; no off-limits files changed (vite.config.ts, tsconfig.json, .eslintrc.json, package.json, package-lock.json, tests/setup.ts, .claude/, src/lib/, src/hooks/, src/features/ all clean).
[x] AC16 — `id="app-shell"` still present on App's root div (line 109 of App.tsx).

**Critical showstoppers (crashes, undefined behavior, data loss)**

None found.

**Duplicated or unclean code**

None found.

**Performance issues**

None found.

**Testing gaps**

***Unit tests***

tests/unit/components/settings/SettingsPanel.test.tsx — No test for the "theme='light'" aria-pressed state (only auto and dark states are explicitly tested); the symmetry hole is minor but leaves one leg of the tri-state untested at the unit level.

***End-to-end / integration***

None found.

**Other must-fix issues (CLAUDE.md violations, type safety, accessibility, etc.)**

None found.

**Should-fix (not blocking but address before next task)**

tests/unit/components/settings/SettingsPanel.test.tsx:648-665 — Theme-button rendering tests only assert aria-pressed for `theme="auto"` and `theme="dark"`; add a matching `theme="light"` case to complete the tri-state coverage.
