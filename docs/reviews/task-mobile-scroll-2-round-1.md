## Review — Task mobile-scroll-2 — Round 1
Date: 2026-05-13
Reviewer: reviewer subagent

**Verdict**
APPROVED

**Gate check**
build: pass, main chunk 51.6 KB gz (budget 250 KB)
typecheck / lint / tests: not run — CSS-only change cannot affect them

**Scope**
Follow-up to the earlier `behavior: 'instant'` fix (commit 97b18b7) which did not resolve the mobile auto-scroll bug. This change removes the `scroll-behavior: smooth` rule from `src/styles/global.css`.

**What changed**
- `src/styles/global.css` — the `@media (prefers-reduced-motion: no-preference) { html { scroll-behavior: smooth; } }` block was replaced with a comment explaining why CSS smooth-scroll is intentionally absent (rAF-driven scrolls coalesce on iOS Safari when the rule is present).

**Risk surface**
No remaining `scrollIntoView`, anchor-jump, or `scrollTo` with `behavior: 'smooth'` calls in `src/` that would have visually regressed. The bookmark-restore `window.scrollTo(0, savedScrollY)` in App.tsx becomes instant instead of smooth — accepted as a UX-neutral or positive change.

**Findings**
None.
