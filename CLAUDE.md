# Quran Reader PWA — Agent Operating Manual

This file is the source of truth for every agent working on this repo. Read it
before doing anything. If something here conflicts with a user instruction,
surface the conflict — do not silently override.

## What we're building

A Progressive Web App for people who want to **read** the Quran (no audio) with
a hands-free **auto-scroll** feature so they don't have to touch the screen.

### MVP scope (v1)

1. Surah picker — list all 114 surahs, pick one, render it.
2. Auto-scroll — start/stop, adjustable speed (smooth pixel-per-frame scroll).
3. Bookmark / resume — remember the last surah and scroll position; restore on reopen.
4. Installable PWA — manifest, service worker, works offline after first load.

### Explicitly out of scope for v1

- Audio recitation / playback.
- Translations (Arabic-only display in v1; design data layer to allow later).
- Tafsir, search, multiple reciters, themes beyond light/dark.
- Accounts, sync, cloud anything.

If a task drifts into out-of-scope territory, stop and flag it.

## Stack

- **Build:** Vite
- **Language:** TypeScript (strict mode, `noUncheckedIndexedAccess`)
- **UI:** React 18 (function components + hooks only — no class components)
- **Styling:** CSS Modules (no Tailwind, no styled-components — keep deps light)
- **State:** React state + `useReducer` where needed; **no Redux, no Zustand**
- **Persistence:** `localStorage` for bookmark; IndexedDB only if we outgrow it
- **PWA:** `vite-plugin-pwa` (Workbox under the hood)
- **Tests:** Vitest + React Testing Library + jsdom
- **Lint/format:** ESLint (typescript-eslint) + Prettier
- **Package manager:** npm (lockfile committed)

Node version: 20.x LTS or newer.

## Quran data

- Source: bundled JSON, offline-first. **No network calls for Quran text.**
- Recommended dataset: Tanzil "Uthmani" plain text, ~1MB gzipped.
  - Download script lives in `scripts/fetch-quran.ts`. Do not commit the raw
    download — the script writes to `src/data/quran.json` which IS committed
    (we want the build reproducible and offline).
- Schema (frozen — don't change without an ADR):
  ```ts
  type Quran = {
    surahs: Array<{
      number: number;        // 1..114
      name: string;          // Arabic name, e.g. "البقرة"
      englishName: string;   // e.g. "Al-Baqarah"
      ayahs: Array<{
        number: number;      // 1..n within the surah
        text: string;        // Arabic text, Uthmani script
      }>;
    }>;
  };
  ```
- Always render Arabic with `dir="rtl"` and `lang="ar"`.

## Repository layout

```
quran-reader/
├── CLAUDE.md                 ← you are here
├── README.md                 ← user-facing
├── Dockerfile                ← multi-stage build (node:20-alpine → nginx:1.27-alpine)
├── .dockerignore
├── package.json
├── tsconfig.json
├── vite.config.ts
├── index.html
├── .github/
│   └── workflows/
│       └── deploy.yml        ← CI: test → build image → push GHCR → SSH deploy
├── deploy/
│   └── docker-compose.yml    ← production compose file copied to VPS on each deploy
├── nginx/
│   └── default.conf          ← SPA fallback, immutable asset caching, security headers
├── public/
│   ├── icons/                ← PWA icons (192, 512, maskable)
│   └── manifest.webmanifest
├── scripts/
│   └── fetch-quran.ts        ← one-off, run manually
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── components/           ← presentational, no business logic
│   ├── features/
│   │   ├── reader/           ← scroll engine + reader view
│   │   └── surah-picker/
│   ├── hooks/
│   ├── lib/                  ← pure utilities, no React imports
│   ├── data/
│   │   └── quran.json
│   └── styles/
├── tests/
│   ├── unit/                 ← *.test.ts(x)
│   └── setup.ts
├── docs/
│   └── adr/                  ← architecture decision records, numbered
└── .claude/
    ├── agents/               ← subagent definitions
    ├── hooks/                ← hook scripts
    └── settings.json
```

## Coding conventions

- **TypeScript strict.** No `any`. If you really need it, use `unknown` and
  narrow. `// @ts-expect-error` requires a one-line justification comment.
- **No default exports** except for React component files (one component per file).
- **Pure first.** Anything that can be a pure function in `lib/` should be.
  React components stay thin.
- **Naming:** `kebab-case` filenames, `PascalCase` components, `camelCase`
  functions/variables, `SCREAMING_SNAKE_CASE` for true constants only.
- **Comments:** explain *why*, not *what*. Don't narrate the code.
- **Imports:** absolute imports from `@/...` (configured in tsconfig).
- **No console.log** in committed code. Use a thin `lib/log.ts` wrapper that
  no-ops in production.

## Testing rules

- Every `lib/` file has a unit test. Coverage target: 90% on `lib/`, 70% overall.
- Component tests cover behavior, not implementation (no shallow rendering,
  no snapshot tests of full markup).
- Test names read as sentences: `it('resumes from the saved scroll position')`.
- The auto-scroll engine MUST have tests covering: start, stop, speed change
  mid-scroll, reaching end of content, very small viewports.

## Quality gates (these are non-negotiable — hooks enforce them)

A change is "done" only when all of these pass:

1. `npm run typecheck` — zero errors.
2. `npm run lint` — zero errors, zero warnings.
3. `npm run test` — all tests green.
4. `npm run build` — production build succeeds.
5. Bundle size for the main chunk stays under **250KB gzipped** (excluding
   the Quran JSON which is its own chunk).

If you're tempted to skip a gate, stop and ask. Don't disable lint rules
inline. Don't add `.skip` to tests. Don't use `as any` to make the typechecker
quiet.

## Performance budget

- First Contentful Paint < 1.5s on a mid-tier mobile (Lighthouse mobile preset).
- Auto-scroll holds a smooth 60fps on a 2020-era phone. Use
  `requestAnimationFrame`, not `setInterval`. Never trigger layout in the
  scroll loop — read offsets once, batch DOM mutations.
- Quran JSON is loaded **once**, lazily, and cached. Don't re-parse.

## Accessibility

- All controls keyboard-reachable; visible focus rings.
- `prefers-reduced-motion` disables auto-scroll animation by default (the user
  can opt back in — this is a feature, not a bug).
- Color contrast AA minimum for all text including Arabic.
- Auto-scroll is pausable via spacebar AND a visible button.

## What agents may NOT do without explicit user approval

- Add a new top-level dependency.
- Change the data schema in `src/data/`.
- Modify anything in `.claude/`.
- Touch `package-lock.json` directly (let npm do it).
- Create files outside the layout above.
- Run `git push`, open PRs, or anything that leaves the local machine.
- Run `npm audit fix --force` or any command that rewrites lockfiles
  destructively.

## Workflow

Each task moves through this loop:

1. **Plan.** Planner subagent produces a numbered task breakdown with
   acceptance criteria. User approves before any code is written.
2. **Implement.** Implementer takes one task, writes code + tests in the
   same change, runs gates, reports done.
3. **Review (round 1).** Reviewer subagent runs `git diff` against HEAD
   (the user has NOT committed yet), runs all gates, writes a versioned
   review file to `docs/reviews/task-<N>-round-<R>.md`. The review lists
   only issues to address — no positive findings.
4. **Decide.** User reads the review file and decides which findings the
   implementer should address (or says "no points to fix, continue").
5. **Fix.** Implementer addresses the chosen items, reports done.
6. **Review (round 2, 3, …).** Loop back to step 3 with `R` incremented.
   Old review files are never overwritten — the full audit trail stays
   in the repo.
7. **Move on.** Only when the user explicitly says to proceed (or the
   reviewer returns APPROVED with no items the user wants addressed) does
   the next task start. The user commits the change at this point.

The reviewer never advances past the user. It writes the file, summarizes
in chat, stops. The implementer never starts the next task on its own.

### Review files

`docs/reviews/task-<N>-round-<R>.md` — one file per review round per task.
Versioned, never overwritten. They are the project's quality-audit log.

## Decision log

Material decisions go in `docs/adr/NNNN-title.md` using the standard ADR
template (Context / Decision / Consequences). One file, ten minutes, saves
hours later.
