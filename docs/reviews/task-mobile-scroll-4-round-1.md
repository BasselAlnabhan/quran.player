## Review — Task mobile-scroll-4 — Round 1
Date: 2026-05-14
Reviewer: reviewer subagent
Diff scope: git diff against HEAD (uncommitted changes)

**Verdict**
CHANGES REQUIRED

**Gate check**
typecheck: pass
lint: pass (0 warnings, 0 errors)
tests: fail (0 passed, 18 failed, 0 skipped) — pre-existing Windows/jsdom environment failure; identical failure reproduced on HEAD without the diff (git stash confirms). Not introduced by this change.
build: pass
main chunk size: 51.56KB gz (budget: 250KB)

**Acceptance criteria**

[x] CLAUDE.md rAF deviation is documented — src/lib/scroll-engine.ts:24-27 has a 4-line comment explaining the iOS/WebKit coalescing bug and why setInterval is used instead.
[x] FRAME_MS = 16 is a named constant — src/lib/scroll-engine.ts:27; comment says "~60fps".
[x] stuckCount is closure-scoped — declared at src/lib/scroll-engine.ts:69 inside createScrollEngine, not module scope; no instance leakage.
[x] stuckCount resets to 0 in start() — src/lib/scroll-engine.ts:99; test "resets stuckCount on start()" at tests/unit/lib/scroll-engine.test.ts:266 covers this.
[x] visibilityChange resume uses setInterval, not rAF — src/lib/scroll-engine.ts:135 calls setInterval(tick, FRAME_MS).
[x] stuckCount resets on visibility resume — src/lib/scroll-engine.ts:133 sets stuckCount = 0 before the setInterval restart.
[x] destroy() calls clearInterval — src/lib/scroll-engine.ts:147-150.
[x] _getContentHeight/_getViewportHeight suppressed with void — src/lib/scroll-engine.ts:48-49.
[x] CLAUDE.md five required engine test areas present — start (line 50), stop (line 100), speed change mid-scroll (line 187), reaching end of content (line 218), very small viewport (line 571).

**Critical showstoppers (crashes, undefined behavior, data loss)**

tests/unit/lib/scroll-engine.test.ts:154-158 — speed=0 test only advances 5 ticks and asserts isRunning()===true, but with the new no-change detection engine the engine WILL auto-stop at tick 30. No test covers what the engine does when speed remains 0 past STUCK_THRESHOLD; the documented intent "engine stays running at speed 0" is now broken — auto-stop fires at tick 30 — and the tests don't expose this because they stop at 5. If a user slows all the way to speed=0 and waits ~0.5s the engine silently stops. Callers have no callback to learn this happened, so the play/pause button stays in "playing" state while the engine is stopped.

**Duplicated or unclean code**

None found.

**Performance issues**

None found.

**Testing gaps**

***Unit tests***

scroll-engine — speed=0 sustained past STUCK_THRESHOLD (30 ticks): no test verifies whether this is intentional auto-stop or a latent bug; the current test cap of 5 ticks masks the behavior entirely.
scroll-engine — stuckCount reset on visibility resume: src/lib/scroll-engine.ts:133 resets stuckCount when the tab becomes visible, but there is no test that exercises "engine was near the bottom when tab went hidden, resumes, and gets a fresh STUCK_THRESHOLD grace period rather than immediately stopping".

***End-to-end / integration***

None found beyond what was pre-existing.

**Other must-fix issues (CLAUDE.md violations, type safety, accessibility, etc.)**

None found.

**Should-fix (not blocking but address before next task)**

src/lib/scroll-engine.ts:1-14 — getContentHeight and getViewportHeight remain in ScrollEngineOptions as required fields (not optional), forcing every caller to keep passing them even though they are dead code inside the engine. Either mark them optional (?: ) or remove them. Keeping required dead parameters is an API smell that will confuse the next agent.
tests/unit/lib/scroll-engine.test.ts:154 — comment says "We advance fewer than STUCK_THRESHOLD (30) ticks to avoid auto-stop" which implicitly acknowledges the speed=0 auto-stop behavior without deciding whether it is correct. The decision should be explicit: either guard against it in the engine (don't auto-stop when speed===0) or document it as intentional and add a test that asserts auto-stop fires at tick 30 with speed=0.
