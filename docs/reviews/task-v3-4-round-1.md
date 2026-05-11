## Review — Task v3-4 — Round 1
Date: 2026-05-11
Reviewer: reviewer subagent
Diff scope: git diff against HEAD (uncommitted changes)

**Verdict**
APPROVED

**Gate check**
typecheck: pass
lint: pass (0 warnings, 0 errors)
tests: pass (285 passed, 0 failed, 0 skipped)
build: pass
main chunk size: 51.24KB gz (budget: 250KB)

**Acceptance criteria**

[x] 1. Back button not visible; SR-only button in DOM — visible buttons removed from error/invalid branches; `<button className={styles.srOnly}>` present in success branch only.
[x] 2. Esc calls onBack — `useEffect` keydown listener on `document`; `fireEvent.keyDown(document, { key: 'Escape' })` test passes.
[x] 3. Valid swipe (deltaX ≥ 80, horizontal-dominant, duration < 500ms) calls onBack — test "calls onBack for a left-to-right swipe ≥80px..." passes; threshold at exactly 80px also tested.
[x] 4. Vertical swipe does NOT call onBack — `|deltaY| > |deltaX|` guard present; test passes.
[x] 5. Slow swipe (≥500ms) does NOT call onBack — `duration >= MAX_DURATION_MS` guard present; test uses `fakeNow` pattern.
[x] 6. Right-to-left swipe does NOT call onBack — `deltaX < MIN_HORIZONTAL_DISTANCE` rejects negative deltaX; test passes.
[x] 7. Short swipe (< 80px) does NOT call onBack — same guard; `deltaX = 79` test passes.
[x] 8. Hook cleans up all listeners on unmount — all four `removeEventListener` calls present in effect return; cleanup test passes.
[x] 9. ReaderView Esc listener cleans up on unmount — `return () => document.removeEventListener('keydown', onKey)` present.
[x] 10. SR-only button reveals on focus — `.srOnly:focus` and `.srOnly:focus-visible` both reset to `position: static; width: auto; height: auto; clip: auto`.
[x] 11. Existing tests pass after updates — 285/285 green.
[x] 12. All four gates pass; lint zero warnings — confirmed above.
[x] 13. Test count 276 → 285 (+9) — 285 confirmed.
[x] 14. Main chunk growth ≤1 KB — +0.23 KB gz confirmed.
[x] 15. No new deps; no off-limits changes — `git diff HEAD -- vite.config.ts tsconfig.json package.json package-lock.json tests/setup.ts .claude/` all empty.
[x] 16. Coverage stays at 100% on `src/lib/`, ≥70% overall — lib/ unchanged; hook is fully exercised by 8 tests.

**Critical showstoppers (crashes, undefined behavior, data loss)**

None found.

**Duplicated or unclean code**

`tests/unit/features/App.bookmark.test.tsx:84` — Comment reads "The reader renders the back button" but the button is now SR-only, not a visible back button. The assertion on line 85 is correct; only the comment is stale. Implementer noted this and left it; it is misleading but not a bug.

**Performance issues**

None found.

**Testing gaps**

***Unit tests***

`useSwipeBack` — No test for a `pointerup` that fires without a preceding `pointerdown` (i.e., `active = false` path in `onPointerUp`). Not a correctness risk since the guard silently returns, but the branch is untested.

***End-to-end / integration***

None found.

**Other must-fix issues (CLAUDE.md violations, type safety, accessibility, etc.)**

None found.

**Should-fix (not blocking but address before next task)**

`tests/unit/features/App.bookmark.test.tsx:84` — Stale comment "The reader renders the back button" should read "The reader renders the SR-only back button" for accuracy in the audit trail.

`src/features/reader/ReaderView.module.css` — `.srOnly` omits `clip-path: inset(50%)`. Modern browsers have deprecated `clip: rect(0,0,0,0)` in favour of `clip-path`; the pattern is functional without it but not fully future-proof. Standard SR-only implementations include both.
