# Quran Reader PWA

A Progressive Web App for reading the Quran with adjustable, hands-free
auto-scroll. Offline-first. No audio.

## Quick start

```bash
npm install
npm run fetch-quran   # one-off: downloads Quran JSON to src/data/
npm run dev
```

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | Production build |
| `npm run preview` | Preview the production build locally |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint, fails on any warning |
| `npm run test` | Vitest in watch mode |
| `npm run test -- --run` | Vitest single run (what CI/hooks use) |
| `npm run fetch-quran` | Downloads Quran text into `src/data/quran.json` |

## Working with agents

This repo is set up for [Claude Code](https://code.claude.com/) with a
small pool of subagents:

- `planner` — turns a brief into a numbered task list with acceptance criteria
- `implementer` — does the actual code edits, one task at a time
- `test-author` — fills coverage gaps, writes regression tests for bugs
- `reviewer` — read-only check against acceptance criteria before merging

Definitions live in `.claude/agents/`. Project rules and scope live in
[`CLAUDE.md`](./CLAUDE.md) — read it before starting.

Quality gates (typecheck, lint, test, build) are wired into a `Stop` hook
at `.claude/hooks/run-gates.sh`. An agent cannot declare a task done while
any gate is red.

## Architecture decisions

See [`docs/adr/`](./docs/adr/). Each material decision gets a short
numbered Markdown file using the standard ADR template.

## Licensing

Code: MIT (or your choice — pick before publishing).
Quran text from [alquran.cloud](https://alquran.cloud) is CC BY 4.0;
attribution belongs in the About screen.
