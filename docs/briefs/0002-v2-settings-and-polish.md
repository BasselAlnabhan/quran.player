# Brief: v2 settings and polish

This is the v2 brief. v1 is complete and merged on `master` (eight commits,
`task 1` through `task 8`). Hand this to the `planner` subagent.

---

v1 delivered the core reading + auto-scroll + bookmark + PWA experience.
v2 expands the user's control over the reading experience: theming, text
size, and a more deliberate scroll-speed control. We're also closing two
known test gaps from the v1 audit.

## What the user wants

1. **Theme toggle.** Today the app respects `prefers-color-scheme` passively
   via CSS variables in `src/styles/global.css`. v1 had no manual override.
   v2 adds an explicit toggle with three modes: auto (follow system), light,
   dark. The choice persists across reloads.

2. **Text size adjustment.** The reader's Arabic ayah text is currently
   fixed at `1.5rem` with `line-height: 2`. v2 adds `+`/`-` buttons that
   scale the text up and down within sensible bounds. The choice persists.

3. **Scroll-speed control redesign.** Today's slider exposes "pixels per
   frame" via a 0-3 range with 0.25 step. The mental model is wrong —
   users don't think in pixels-per-frame. Replace with `+`/`-` buttons
   that adjust an *interval* value displayed in seconds, stepping by
   200 ms. Default value: 2.0 seconds.

   The interval represents how long it takes the auto-scroll to advance
   one natural unit (one line of ayah text is the obvious candidate, but
   pick whichever maps cleanly). Smaller interval = faster scroll. The
   engine in `src/lib/scroll-engine.ts` still operates internally on
   pixels-per-frame; the UI converts. Don't change the engine's API.

4. **Settings affordance.** Theme, text size, and the redesigned
   scroll-speed control should live behind a single Settings UI — a
   button plus a panel, drawer, or popover. Don't scatter unrelated
   toggles across the reader chrome.

   Spacebar play/pause stays in the bottom scroll-controls bar where it
   is today; only the *speed* control may migrate into Settings if that
   reads cleaner. Either way, the play/pause button must remain visible
   and operable without opening Settings.

5. **Two test gaps from v1.** The v1 final review flagged these as
   should-fixes; close them in v2 wherever they fit:

   - `src/hooks/useScrollEngine.ts` — the `handleChange` listener for
     the OS-level `prefers-reduced-motion` change event is wired up but
     never triggered in tests. Add a test that fires the change event
     and asserts the engine is rebuilt with the new flag value.

   - `src/lib/bookmark.ts` — `saveBookmark`'s `try/catch` around
     `localStorage.setItem` (the Safari private-mode quota path) is not
     exercised. Add a test that mocks `setItem` to throw and asserts the
     function does not propagate the error.

## What "done" looks like for v2

A user can:

1. Open the app, find a Settings button (visible from picker and reader).
   Toggle theme between auto / light / dark. The choice sticks across
   reloads. Auto matches the system preference; light and dark override.

2. From Settings, increase or decrease the Arabic text size with `+`/`-`
   buttons. Bounds prevent unreadably small or absurdly large values.
   The choice sticks across reloads.

3. From Settings (or wherever the redesigned control lives), adjust the
   auto-scroll interval with `+`/`-` buttons. The current value is shown
   as `X.Ys` and adjusts in 200 ms steps. Default is 2.0 s. Smaller =
   faster.

4. Everything in v1 still works. All 138 existing tests stay green. The
   two coverage gaps are closed.

## Constraints to bake into your acceptance criteria

- All gates green (typecheck, lint zero-warnings, tests, build).
- Main chunk under 250 KB gzipped (current: 49.28 KB — plenty of headroom).
- 90% line coverage on `src/lib/`, 70% overall (current: 98.57% / 97.97%).
  Don't regress these numbers.
- **No new dependencies.** Plain React state for transient UI;
  `localStorage` for persisted settings (same defensive load pattern as
  `loadBookmark`).
- All theme / text-size / speed-interval changes must take effect
  immediately — no reload required.
- Keyboard accessibility: settings UI is reachable and operable from the
  keyboard. Esc closes any open panel. Buttons inside have visible focus
  rings (the global `:focus-visible` rule already provides this).
- `prefers-reduced-motion` still respected. The opt-in flow from v1
  stays intact when the OS preference is set.
- Persisted settings storage must defensively handle malformed data
  (return defaults on parse failure or shape mismatch), matching
  `loadBookmark`'s pattern.

## Things you should NOT plan

- Real artwork for icons (Task 8 punted on this; still out of scope).
- Server-side anything — no sync, no accounts.
- Translations, tafsir, audio, search, multiple reciters — out of scope
  per CLAUDE.md.
- A full design system. Settings can be a simple panel with sections.
- Animation library, icon library, web fonts. Use HTML, CSS, system
  glyphs.
- Tooling changes (eslint rules, tsconfig, vite config additions).
- Touching anything in `.claude/`.

## Output

When ready, output the plan in the format defined in
`.claude/agents/planner.md` and stop. We'll review and approve before
any code is written. Aim for 4-7 tasks, each sized S or M, each
independently shippable and reviewable.
