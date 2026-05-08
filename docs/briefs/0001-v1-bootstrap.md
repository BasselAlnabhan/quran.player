# Brief: bootstrap the v1 reader

This is the first brief for the project. Hand it to the `planner` subagent.

---

We're starting from a freshly scaffolded repo. `package.json`, configs, and
agent definitions are in place; `node_modules` is not yet installed and
`src/` only has whatever the planner finds (probably nothing).

Produce a plan that takes us from "empty src/" to a working v1 MVP as
described in `CLAUDE.md`. The plan should be ordered so each task is
independently shippable and reviewable. Aim for roughly 6–10 tasks, each
sized S or M.

## What "done" looks like for v1

A user can:

1. Open the app on a phone, see a list of all 114 surahs in Arabic with
   English transliterated names.
2. Tap a surah; the full Arabic text loads, RTL, readable.
3. Tap "play"; the page auto-scrolls smoothly. A slider adjusts speed live.
   Spacebar pauses/resumes (also a visible button for touch).
4. Close the app, reopen it, land back on the same surah at the same scroll
   position.
5. Install it as a PWA from the browser; it works offline after first load.
6. `prefers-reduced-motion` users get a static reader by default with an
   opt-in to auto-scroll.

## Constraints to bake into your acceptance criteria

- All gates green (typecheck, lint zero-warnings, tests, build).
- Main chunk under 250KB gzipped.
- 90% line coverage on `src/lib/`, 70% overall.
- No new dependencies beyond what's in `package.json`. If you think we need
  one, flag it in Assumptions and stop.
- Auto-scroll engine has tests for: speed=0, speed change mid-scroll,
  reaching end, prefers-reduced-motion, tab hidden.

## Things you should NOT plan

- Translations, tafsir, audio, search, multiple reciters.
- Login, sync, cloud anything.
- Theming beyond a basic light/dark that respects `prefers-color-scheme`.
- Tooling changes (linter rules, tsconfig) — they're set.

When you're ready, output the plan in the format defined in
`.claude/agents/planner.md` and stop. We'll review and approve before any
code is written.
