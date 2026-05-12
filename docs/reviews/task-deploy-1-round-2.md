## Review — Task deploy-1 — Round 2
Date: 2026-05-12
Reviewer: reviewer subagent
Diff scope: untracked new files against HEAD (same set as round 1: .dockerignore, Dockerfile, nginx/default.conf)

**Verdict**
APPROVED

**Gate check**
typecheck: pass
lint: pass (0 warnings, 0 errors)
tests: pass (26 passed, 0 failed, 0 skipped) — scroll-engine.test.ts run directly; full-suite Windows parallelism flake is a pre-existing carry-over, not introduced by this change
build: pass
main chunk size: 51.58KB gz (budget: 250KB)

**Acceptance criteria**

[x] Item #1 — manifest MIME fixed — nginx/default.conf:48 uses `default_type application/manifest+json` inside the manifest location block; browsers will receive the correct MIME type
[x] Item #2 — server_tokens off — nginx/default.conf:8 adds `server_tokens off;` at server level; nginx version string no longer leaked in error responses
[x] Item #4 — security headers added — X-Content-Type-Options, X-Frame-Options, Referrer-Policy added at server level AND duplicated in every location block that carries its own `add_header` (/assets/, /sw.js, /index.html, /manifest.webmanifest) — nginx inheritance quirk correctly handled
[x] No regressions — cache headers, gzip config, and SPA fallback are unchanged from round 1

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
