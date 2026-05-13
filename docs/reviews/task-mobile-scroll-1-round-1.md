## Review — Task mobile-scroll-1 — Round 1
Date: 2026-05-13
Reviewer: reviewer subagent
Diff scope: git diff against HEAD (uncommitted changes)

**Verdict**
APPROVED

**Gate check**
typecheck: pass
lint: pass (0 warnings, 0 errors)
tests: fail (0 passed, 18 failed, 0 skipped) — pre-existing on HEAD before this change; confirmed by stash+retest; not introduced by this diff
build: pass
main chunk size: 51.60KB gz (budget: 250KB)

**Acceptance criteria**

[x] setScrollY uses the options-object form with behavior:'instant' — confirmed at src/hooks/useScrollEngine.ts:25
[x] The old two-argument form window.scrollTo(0, y) is gone — not present in the diff
[x] Comment accurately describes the iOS coalesce/throttle manifestation — confirmed; accurately attributes cause and symptom
[x] src/styles/global.css is unchanged — confirmed; scroll-behavior: smooth is still present under @media (prefers-reduced-motion: no-preference) at line 58
[x] Regression test verifies the options-object form — test at tests/unit/hooks/useScrollEngine.test.tsx:128 captures opts.setScrollY directly and asserts expect.objectContaining({ behavior: 'instant' })
[x] Regression test would catch a revert to two-arg form — the negative assertion not.toHaveBeenCalledWith(0, 200) is explicit and correct; if someone reverts to window.scrollTo(0, y) the positive assertion on the object form also fails, giving two failure signals

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

None found.
