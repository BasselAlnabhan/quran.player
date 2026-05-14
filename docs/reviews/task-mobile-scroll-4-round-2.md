## Review — Task mobile-scroll-4 — Round 2
Date: 2026-05-14
Reviewer: reviewer subagent
Diff scope: git diff against HEAD (uncommitted changes)

**Verdict**
APPROVED

**Gate check**
typecheck: pass
lint: pass (0 warnings, 0 errors)
tests: pass (34 passed, 0 failed, 0 skipped)
build: pass
main chunk size: 51.57KB gz (budget: 250KB)

**Acceptance criteria**

[x] CLAUDE.md rAF deviation is documented — src/lib/scroll-engine.ts:26-29 comment explains iOS/WebKit coalescing bug and why setInterval is used.
[x] FRAME_MS = 16 named constant — src/lib/scroll-engine.ts:29.
[x] stuckCount is closure-scoped — src/lib/scroll-engine.ts:71, inside createScrollEngine, no instance leakage.
[x] stuckCount resets to 0 in start() — src/lib/scroll-engine.ts:106.
[x] visibilityChange resume uses setInterval, not rAF — src/lib/scroll-engine.ts:142.
[x] stuckCount resets on visibility resume — src/lib/scroll-engine.ts:140.
[x] destroy() calls clearInterval — src/lib/scroll-engine.ts:154-157.
[x] getContentHeight/getViewportHeight now optional — src/lib/scroll-engine.ts:5,7; jsdoc explains why; void suppression at lines 50-51.
[x] speed=0 early-exit before stuckCount logic — src/lib/scroll-engine.ts:79; engine stays isRunning=true at speed=0.
[x] New test: "holds running state indefinitely at speed=0" — tests/unit/lib/scroll-engine.test.ts:180; advances 40 ticks (> STUCK_THRESHOLD 30), asserts isRunning()===true and setScrollY not called.
[x] New test: "resets stuckCount when resumed after tab visibility change" — tests/unit/lib/scroll-engine.test.ts:461; accumulates 10 stuck ticks, hides tab, resumes, advances 30 ticks, asserts engine stops exactly at tick 30 (proving reset occurred).
[x] Existing speed=0 tests advanced to 40 ticks — tests/unit/lib/scroll-engine.test.ts:155,174; workaround comments removed.
[x] CLAUDE.md five required engine test areas present — start (line 52), stop (line 96), speed change mid-scroll (line 209), reaching end of content (line 240), very small viewport (line 645).

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
