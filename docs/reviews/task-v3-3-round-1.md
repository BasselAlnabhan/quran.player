## Review — Task v3-3 — Round 1
Date: 2026-05-10
Reviewer: reviewer subagent
Diff scope: git diff against HEAD (uncommitted changes)

**Verdict**
APPROVED

**Gate check**
typecheck: pass
lint: pass (0 warnings, 0 errors)
tests: pass (276 passed, 0 failed, 0 skipped)
build: pass
main chunk size: 51.01 KB gz (budget: 250KB)

**Acceptance criteria**

[x] 1. `intervalMsToPxPerFrame` is a named export, pure, no React — confirmed: no default export, no React import, no side effects.
[x] 2. Formula returns ≈0.4 for (2000, 1.5) — test at speed.test.ts:10 uses `toBeCloseTo(0.4, 2)`.
[x] 3. Formula returns ≈0.8 for (1000, 1.5) — test at speed.test.ts:15.
[x] 4. Formula returns ≈0.8 for (2000, 3.0) — test at speed.test.ts:20.
[x] 5. ≥90% line coverage on speed.ts — coverage report shows 100%.
[x] 6. Settings panel renders "Scroll speed" with X.Ys display — SettingsPanel.tsx:117-121, test at SettingsPanel.test.tsx:447.
[x] 7. `+` calls `onScrollIntervalChange` with +200 — handleScrollIncrease at SettingsPanel.tsx:88-91, tested at SettingsPanel.test.tsx:481-498.
[x] 8. `-` calls `onScrollIntervalChange` with -200 — handleScrollDecrease at SettingsPanel.tsx:83-86, tested at SettingsPanel.test.tsx:501-518.
[x] 9. `-` disabled at 400ms, `+` disabled at 10000ms — SettingsPanel.tsx:127,133; tested at SettingsPanel.test.tsx:559-572.
[x] 10. Buttons accessibly named, ≥44px tap targets — aria-label on both buttons; `.stepButton` CSS has `min-width: 44px; min-height: 44px`.
[x] 11. `ScrollControls.tsx` no longer contains `<input type="range">` — grep confirms zero hits.
[x] 12. `ScrollControls` calls `engine.setSpeed` with prop value on mount and change — useEffect at ScrollControls.tsx:17-19; tested at ScrollControls.test.tsx:254-274.
[x] 13. Old slider tests fully deleted — `describe('ScrollControls — speed slider', ...)` block is gone; no `.skip`, no stub.
[x] 14. App-level integration: setting → engine.setSpeed wired — App.tsx:31 computes pxPerFrame, threaded through ReaderView to ScrollControls to engine.
[x] 15. All four gates pass; lint zero warnings — confirmed.
[x] 16. Test count delta: 255 → 276 (+21) — confirmed (276 passed).
[x] 17. `src/lib/` coverage 100%, overall ≥70% — lib: 100%, overall: 99.05% statements.
[x] 18. Main chunk growth ≤2KB — +0.08 KB gz.
[x] 19. No new deps; no off-limits changes — vite.config.ts, tsconfig.json, .eslintrc.json, package.json, package-lock.json, tests/setup.ts, .claude/ all unchanged.

**Critical showstoppers (crashes, undefined behavior, data loss)**

None found.

**Duplicated or unclean code**

src/features/reader/ScrollControls.tsx:13 — `reducedMotionDescId` changed from `useId()` to a hardcoded string `'sc-reduced-motion-desc'`. This is safe because only one ScrollControls exists per page, but the hardcoded string is fragile if a second instance is ever added. The original `useId()` was the correct pattern for a reusable component.

**Performance issues**

None found.

**Testing gaps**
***Unit tests***

tests/unit/components/settings/SettingsPanel.test.tsx:580-606 — The App-level integration test (`App — scroll-speed control wired end-to-end`) does not assert the new pxPerFrame is strictly less than the pre-click value. The comment says "Confirm it's < original" but the assertion is only `expect(newSpeed).toBeGreaterThan(0)`. The task spec requires asserting the value is *different*, not just positive.

tests/unit/lib/speed.test.ts — No test for degenerate inputs (`intervalMsToPxPerFrame(0, 1.5)` → `Infinity`; `intervalMsToPxPerFrame(2000, 0)` → `0`). These inputs are outside validated bounds but the function returns garbage silently. A boundary note or guard comment would close the question.

***End-to-end / integration***

None found.

**Other must-fix issues (CLAUDE.md violations, type safety, accessibility, etc.)**

None found.

**Should-fix (not blocking but address before next task)**

tests/unit/components/settings/SettingsPanel.test.tsx:602-604 — Integration test asserts `newSpeed > 0` but not `newSpeed < originalSpeed`. Capture the initial pxPerFrame before the click and assert the relationship to verify directional correctness.

src/features/reader/ScrollControls.tsx:13 — Hardcoded `'sc-reduced-motion-desc'` ID replaces the prior `useId()` call. Restore `useId()` to keep the component safe for multiple instances and consistent with the existing pattern.
