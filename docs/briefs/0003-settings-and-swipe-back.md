# Brief: settings menu + swipe-back gesture (phone-first)

This is a v3-style brief. v1 (8 tasks) and v2 tajweed (6 tasks) are committed
on `master`. Hand this to the `planner` subagent.

It supersedes the orphaned brief at `0002-v2-settings-and-polish.md`. The
settings persistence infrastructure (Settings type, save/load, `useSettings`
hook) already shipped in v2 Task 0 (commit `c37534b`) — do NOT re-do that
work; consume the existing hook.

## What the user wants

1. **A settings menu with `+`/`-` buttons** for two controls:
   - **Scroll speed.** Display value as `X.Ys`. Default `2.0s`. Each click on
     `+` or `-` changes the interval by `200 ms`. Smaller = faster.
   - **Font size.** Scales the reader's Arabic ayah text. The `useSettings`
     hook already accepts `textSizeRem` in the range `1.0`–`2.5`. Match
     those bounds and step at `0.125rem`.

2. **Swipe-to-go-back instead of a visible "Back to surah list" button.**
   The current `ReaderView` has a `<button>` for navigation. Replace with a
   horizontal swipe gesture as the primary path back to the picker. Keep
   keyboard fallback (Esc closes the reader) for accessibility — sighted
   keyboard users must still be able to navigate.

3. **Phone-first design.** Tap targets ≥ 44 px. Sufficient padding for
   thumb reach. No hover-only affordances. Settings panel should feel
   like a phone bottom sheet or full-screen overlay rather than a desktop
   modal. Test on a narrow viewport (320 px width).

## Existing pieces you'll be building on

- `src/lib/settings.ts` — Defensive `loadSettings`/`saveSettings`,
  `DEFAULT_SETTINGS = { theme: 'auto', textSizeRem: 1.5, scrollIntervalMs: 2000 }`.
  Validates bounds, returns defaults on malformed input.
- `src/hooks/useSettings.ts` — Returns `{ settings, setTheme, setTextSize,
  setScrollInterval }`. Lazy-initialised, persists on every setter call.
- `src/hooks/useScrollEngine.ts` — Already exposes `setSpeed(pxPerFrame)`.
  The interval-to-pxPerFrame conversion happens at the hook layer; engine
  API does NOT change.
- `src/features/reader/ScrollControls.tsx` — Currently holds a `<input
  type="range">` slider for speed. The slider must be **removed** and
  replaced — speed control moves into Settings (+/-).
- `src/features/reader/ReaderView.tsx` — Currently renders a back
  `<button>`. Remove that button visually; rely on swipe + Esc.
- `src/styles/global.css` — Has `--color-bg`, `--color-fg`, `--color-muted`,
  `--color-accent`, `--color-error`. Add new tokens if needed for the
  settings panel; don't repaint existing tokens.

## What "done" looks like

A user on a phone can:

1. Open the app, see the surah picker, tap a settings button (visible from
   both picker and reader). The settings panel opens with two clearly
   labelled sections: "Scroll speed" and "Text size".

2. Tap `+` or `-` on Scroll speed. The displayed value changes by `0.2s`.
   The reader's auto-scroll (when running) speeds up or slows down
   immediately. Default value `2.0s`. Bounds: `0.4s` to `10.0s`.

3. Tap `+` or `-` on Text size. Each tap changes the ayah text size by
   `0.125 rem`. Bounds: `1.0` to `2.5 rem`. The change takes effect in the
   reader immediately.

4. Close the settings panel (tap outside, swipe down, or press Esc).
   The choices persist across reloads.

5. In the reader, **swipe right-to-left** (or left-to-right — planner
   decides which is most natural for RTL Arabic content) to return to
   the surah list. The back button is gone from the visible UI. Esc on a
   keyboard also returns to the picker.

6. Everything in v1 + v2 still works. Auto-scroll, bookmark, tajweed
   rendering, PWA install, `prefers-reduced-motion` opt-in.

## Constraints to bake into acceptance criteria

- All gates green (typecheck, lint zero-warnings, tests, build).
- 90% line coverage on `src/lib/`, 70% overall (currently 100% / 98.85% —
  don't regress).
- Main chunk under 250 KB gzipped (currently 49.89 KB — plenty of room).
- **No new dependencies.** Swipe handling can be built with the native
  Pointer Events API (`pointerdown`/`pointermove`/`pointerup`) or with
  Touch Events. Don't add `react-swipeable` or similar.
- All controls keyboard-reachable; visible focus rings (existing
  `:focus-visible` rule applies).
- `prefers-reduced-motion` still respected. The opt-in flow from v1 stays
  intact when the OS preference is set. Settings panel open/close
  animations honour the same preference.
- Settings panel must work on a 320 px-wide viewport without horizontal
  overflow.
- Swipe gesture must NOT conflict with vertical scrolling (the auto-scroll
  feature drives `window.scrollY`). Vertical gestures pass through to the
  scroll engine; horizontal gestures trigger back navigation.
- Don't modify `.claude/`, `vite.config.ts`, `tsconfig.json`,
  `.eslintrc.json`, `package.json`, `tests/setup.ts`.

## Stretch items (planner decides whether to include — flag in plan)

- **Theme toggle UI.** The `Settings` type already has a `theme: 'auto' |
  'light' | 'dark'` field and a `setTheme` setter. Wiring a three-button
  toggle into the settings panel is small; visually applying the theme
  requires CSS variables in `global.css` to respond to a `data-theme`
  attribute on `<html>`. Worth including in this round if planner can
  size it as a small task.

- **`useScrollEngine` `handleChange` test gap.** The v1 audit flagged the
  OS-level `prefers-reduced-motion` change-event handler as untested.
  Small standalone test file (`tests/unit/hooks/useScrollEngine.test.tsx`),
  fold in wherever it fits naturally.

## Things you should NOT plan

- Translations, tafsir, audio, search, multiple reciters — still out of scope.
- A heavyweight design system or modal manager.
- Animation library, icon library, web fonts.
- Real PWA icon artwork.
- Tooling changes (eslint rules, tsconfig, vite config additions).
- Backwards-compatibility for the old slider (Task 5 from the orphaned
  brief already addressed this — slider is fully replaced, no fallback
  needed).

## Output

When ready, output the plan in the format defined in
`.claude/agents/planner.md` and stop. We'll review and approve before
any code is written. Aim for 3–6 tasks, each S or M, each independently
shippable and reviewable.

Likely shape (planner decides):
- Settings panel shell (button + dialog/sheet + close behavior).
- Font-size +/- control + reader integration.
- Scroll-speed +/- control + ScrollControls slider removal + engine sync.
- Swipe-back gesture + Esc fallback + back-button removal.
- (Stretch) Theme toggle + global.css `data-theme` support.
- (Stretch) `useScrollEngine` `handleChange` test gap.
