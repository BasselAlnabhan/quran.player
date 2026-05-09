## Review — Task v2-1 — Round 1
Date: 2026-05-10
Reviewer: reviewer subagent
Diff scope: git diff against HEAD (c37534b — v2 Task 0), uncommitted changes

**Verdict**
CHANGES REQUIRED

**Gate check**
typecheck: pass
lint: pass (0 warnings, 0 errors)
tests: fail — pre-existing environment failure: ALL 12 suites fail with "No test suite found" / "Cannot read properties of undefined (reading 'on')" on BOTH HEAD and working tree; Task 1 changes did not introduce or worsen this. The implementer's claim of "176 passing" cannot be verified in this environment. This is a blocking gate regression that pre-dates this task but must be resolved before Task 1 is considered DONE.
build: pass
main chunk size: 49.28 KB gz (budget: 250KB) — pass
quran-data chunk: 1,223 KB raw / 408 KB gz — under 6 MB Workbox limit — pass

**Acceptance criteria**

[x] 1. `src/data/quran-tajweed.json` no longer exists — confirmed: not in working tree, not tracked, not untracked.
[x] 2. `src/data/quran.json` contains tajweed markers — confirmed: all 7 Al-Fatiha ayahs contain `[`, and no ayah starts with `[` (plain Arabic start confirmed).
[x] 3. Schema sanity: 114 surahs, Al-Fatiha 7 ayahs, Al-Baqara 286 ayahs, `englishName === 'Al-Baqara'` — all confirmed via Node one-liner.
[x] 4. Hook + script point at `quran.json` — `scripts/fetch-quran.ts` writes to `../src/data/quran.json`; `src/hooks/useQuranData.ts` import path was already `@/data/quran.json` at HEAD and is UNCHANGED in this diff.
[✗] 5. 176 tests passing — cannot verify: test runner fails on this machine (Node 24 + Vitest 1.6.x environment crash, pre-existing from HEAD, not introduced by Task 1). Implementer must resolve the test environment before this criterion is checkable.
[x] 6. All gates pass except tests (pre-existing); main chunk 49.28 KB gz under 250 KB; quran-data 408 KB gz under 6 MB Workbox limit.
[✗] 7. Test count unchanged at 176 — unverifiable for same reason as criterion 5.

**Critical showstoppers (crashes, undefined behavior, data loss)**

tests/unit/* — The entire test suite crashes with jsdom environment initialization failures on Node 24.13.1 + Vitest 1.6.x + pool=forks on Windows. This was present at HEAD (c37534b) and is not introduced by Task 1, but `npm run test` is a non-negotiable quality gate per CLAUDE.md. The implementer's reported "176 passing" cannot be confirmed and the gate is red. The root cause must be diagnosed and fixed (or the pool/environment config adjusted) before any v2 task is mergeable.

**Duplicated or unclean code**

None found.

**Performance issues**

None found.

**Testing gaps**

None attributable to Task 1 (no test changes required in scope; Task 1 is a data/path-only change).

**Other must-fix issues (CLAUDE.md violations, type safety, accessibility, etc.)**

None found in the Task 1 diff itself. The test environment failure is a pre-existing issue that is nonetheless blocking the "tests: pass" gate.

**Should-fix (not blocking but address before next task)**

scripts/fetch-quran.ts:33 — `console.warn` used for normal progress logging; CLAUDE.md says no `console.log` in committed code; a `lib/log.ts` wrapper is prescribed. `console.warn` is not `console.log` so this is technically not a violation of the exact letter, but the spirit of the rule applies. This predates Task 1 and is not introduced here — flagging for awareness only.
