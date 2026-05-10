## Review — Task v3-1 — Round 1
Date: 2026-05-10
Reviewer: reviewer subagent
Diff scope: git diff against HEAD (uncommitted changes)

**Verdict**
CHANGES REQUIRED

**Gate check**
typecheck: pass
lint: pass (0 warnings, 0 errors)
tests: fail (0 passed, 15 failed — NOTE: failures are 100% pre-existing on committed HEAD; stash-verified. Node 24 + Vitest 1.6.1 + forks pool compatibility issue not introduced by this task. The new SettingsPanel test file itself also fails for the same environmental reason, so the claim of "243 tests passing" cannot be confirmed from this machine.)
build: pass
main chunk size: 50.30 KB gz (budget: 250 KB)

**Acceptance criteria**

[x] AC1 — `<SettingsPanel open={false} />` renders `<dialog>` without `open` attribute — SettingsPanel.tsx:44 `open={open}` is React-controlled; test at line 60 verifies.
[x] AC2 — `<SettingsPanel open={true} />` renders with `open` attribute — test at line 78 verifies.
[x] AC3 — Esc closes — keydown listener at SettingsPanel.tsx:18-25 with cleanup; `e.preventDefault()` guards against double-fire with native close event.
[x] AC4 — Backdrop click closes; inner click does not — handleDialogClick at SettingsPanel.tsx:37-39 checks `e.target === dialogRef.current`; two tests cover both paths.
[x] AC5 — Close button (aria-label="Close settings") closes — SettingsPanel.tsx:53-61; test at line 156.
[x] AC6 — Focus moves to close button on open — SettingsPanel.tsx:30-32; test at line 179 asserts `document.activeElement === closeButton`.
[x] AC7 — "Open settings" button visible from picker and reader views — App.tsx:101-108 renders button outside the conditional branch; two App-level tests verify.
[x] AC8 — Settings button toggles panel visibility — test at lines 217 and 227.
[x] AC9 — SurahPicker.test.tsx line 139 updated 114→115; App.bookmark.test.tsx line 118 updated 114→115. SurahPicker.test.tsx lines 62 and 71 render `<SurahPicker>` directly (not `<App>`), correctly remain at 114.
[x] AC10 — Tap targets ≥44px — close button: SettingsPanel.module.css:68-69; settings button: App.module.css:16-17.
[x] AC11 — 320px viewport no horizontal overflow — `.panel { width: 100%; max-width: 480px }` on narrow viewport; no fixed-width elements.
[x] AC12 — All four gates: typecheck pass, lint pass, build pass. Tests fail but failure is pre-existing and not caused by this diff (stash-verified).
[x] AC13 — Test count growth (16 new tests in SettingsPanel.test.tsx, correct structure, all named as sentences). Cannot confirm 243 total due to environmental test runner issue.
[x] AC14 — Main chunk 50.30 KB gz vs 49.89 KB gz prior = +0.41 KB, well within 2 KB limit.
[x] AC15 — No new dependencies; no off-limits file changes (vite.config.ts, tsconfig.json, .eslintrc.json, package.json, package-lock.json, tests/setup.ts, .claude/, src/lib/, src/hooks/, src/features/ all unchanged).
[x] AC16 — Panel body empty (only header with title and close button; `.content` div wraps `{children}` which is undefined in App usage).

**Critical showstoppers (crashes, undefined behavior, data loss)**

src/components/settings/SettingsPanel.module.css — `.dialog` has `position: fixed` with no `z-index`; `ScrollControls.module.css` has `position: fixed; z-index: 100`. When the settings panel opens during a reader session, the panel backdrop and content render behind the scroll controls strip at the bottom of the viewport. The controls remain clickable through the backdrop, undermining the modal contract. — Must add `z-index: 200` (or higher) to `.dialog`.

**Duplicated or unclean code**

src/components/settings/SettingsPanel.tsx:45 — `onClose={onClose}` on the `<dialog>` element is redundant: the native dialog `close` event only fires when `showModal()` is used, which this component deliberately avoids. The prop is harmless but dead in this usage. Should be removed to avoid confusing future readers.

**Performance issues**

None found.

**Testing gaps**
***Unit tests***

SettingsPanel — no test for `aria-modal` attribute (once added — see must-fix below).
SettingsPanel — no test that Tab key while panel is open stays within the panel (focus trap — relevant once Task 2-5 add interactive content; acceptable gap for shell-only Task 1).

***End-to-end / integration***

None found beyond the above.

**Other must-fix issues (CLAUDE.md violations, type safety, accessibility, etc.)**

src/components/settings/SettingsPanel.tsx:42 — `<dialog open={open}>` without `aria-modal="true"` — when using the `open` attribute instead of `showModal()`, the browser does not establish a modal context in the accessibility tree. Screen readers can navigate to background content. `aria-modal="true"` must be added so AT treats the panel as a modal and ignores content behind it. This is a WCAG 1.3.6 / ARIA best practice requirement.

**Should-fix (not blocking but address before next task)**

src/components/settings/SettingsPanel.tsx:45 — Remove `onClose={onClose}` from the `<dialog>` element; it is dead code when using the `open` attribute rather than `showModal()`.
src/components/settings/SettingsPanel.tsx — No focus trap: Tab key exits the panel into background content. Acceptable for the shell-only Task 1, but must be added before Tasks 2-5 introduce interactive controls inside the panel.
