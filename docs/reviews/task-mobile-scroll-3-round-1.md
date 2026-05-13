## Review — Task mobile-scroll-3 — Round 1
Date: 2026-05-13
Reviewer: reviewer subagent
Diff scope: git diff against HEAD (uncommitted changes)

**Verdict**
APPROVED

**Gate check**
typecheck: pass
lint: pass (0 warnings, 0 errors)
tests: pass (300 passed, 0 failed, 0 skipped)
build: pass
main chunk size: 51.60KB gz (budget: 250KB)

**Acceptance criteria**

[x] Only two files changed (useScrollEngine.ts + useScrollEngine.test.tsx) — confirmed via `git diff --stat`
[x] setScrollY assigns to both document.documentElement.scrollTop AND document.body.scrollTop — lines 29-30 of useScrollEngine.ts
[x] No window.scrollTo calls remain in the engine path — grep of src/ confirms the only scrollTo in src/ are App.tsx bookmark-restore (pre-existing, outside engine) and the stale CSS comment
[x] getScrollY uses documentElement.scrollTop || body.scrollTop || 0 — line 21 of useScrollEngine.ts; correctly handles position-0 (returns 0) and legacy iOS body-scroll root
[x] Test captures setScrollY, invokes it with 100, asserts documentElement.scrollTop === 100 and body.scrollTop === 100 — lines 146-150 of test file
[x] Test asserts window.scrollTo is NOT called — line 153 of test file
[x] All 6 useScrollEngine tests pass — confirmed via targeted run

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

None found.

**Other must-fix issues (CLAUDE.md violations, type safety, accessibility, etc.)**

None found.

**Should-fix (not blocking but address before next task)**

src/styles/global.css:55-63 — Comment describes the old `window.scrollTo({ behavior: 'instant' })` engine mechanism that was replaced by direct scrollTop assignment; the reference to `behavior: 'instant'` is now stale and will mislead future readers.
