## Review — Task deploy-1 — Round 1
Date: 2026-05-11
Reviewer: reviewer subagent
Diff scope: untracked new files against HEAD (git status shows .dockerignore, Dockerfile, nginx/default.conf)

**Verdict**
CHANGES REQUIRED

**Gate check**
typecheck: pass
lint: pass (0 warnings, 0 errors)
tests: fail (0 passed, 18 failed, 0 skipped) — pre-existing failure on HEAD; identical result with and without the new files; not introduced by this change
build: pass
main chunk size: 51.58KB gz (budget: 250KB) — quran-data chunk 408KB gz, exempted per CLAUDE.md

**Acceptance criteria**

Per task brief this is chunk 1 of 4; no formal acceptance criteria list was provided. Assessment is against Docker and nginx best practices as scoped.

[✗] manifest.webmanifest served with correct MIME type — nginx:1.27-alpine mime.types has no entry for `.webmanifest`; the file will be served as `application/octet-stream`, causing browsers to silently ignore it and breaking PWA installability
[x] Hashed assets cached immutably — `/assets/` location sets `Cache-Control: public, max-age=31536000, immutable`
[x] SPA fallback present — `try_files $uri $uri/ /index.html` in catch-all location
[x] Build artifacts excluded from image — multi-stage build; only `dist/` copied to final stage
[✗] Non-root user in final stage — nginx:alpine runs as root by default; no `USER` directive in Dockerfile

**Critical showstoppers (crashes, undefined behavior, data loss)**

None found.

**Duplicated or unclean code**

None found.

**Performance issues**

None found.

**Testing gaps**
***Unit tests***

None found. (No tests are expected for Docker/nginx config files.)

***End-to-end / integration***

None found.

**Other must-fix issues (CLAUDE.md violations, type safety, accessibility, etc.)**

nginx/default.conf:27-30 — `manifest.webmanifest` is served as `application/octet-stream` because `application/manifest+json` is absent from nginx:1.27-alpine's default mime.types; fix by adding `types { application/manifest+json webmanifest; }` block or an explicit `add_header Content-Type "application/manifest+json"` on the manifest location — browsers reject a webmanifest with a wrong MIME type, breaking PWA install

nginx/default.conf:1 — no `server_tokens off` directive; nginx version string is exposed in error responses — security hygiene, must fix before any public-facing deploy

**Should-fix (not blocking but address before next task)**

Dockerfile:16 — base image pinned to `nginx:1.27-alpine` by tag only, not by digest; a tag can be repointed silently — pin to `nginx:1.27-alpine@sha256:65645c7bb6a0661892a8b03b89d0743208a18dd2f3f17a54ef4b76fb8e2f2a10` (already pulled) or document the intentional choice to rely on tag

nginx/default.conf — no `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, or `Referrer-Policy` headers; standard PWA hardening, low effort

nginx/default.conf:27 — the manifest location has `try_files $uri =404` but no explicit `default_type` or `types` override; once the MIME issue is fixed confirm the directive order is correct (the `types {}` override must precede or be inside the location block)

vite.config.ts:45-54 — the `quran-data` chunk produces a 1223KB / 408KB gz Rollup warning at build time; CLAUDE.md correctly exempts it from the 250KB budget, and leaving `chunkSizeWarningLimit` alone is the right call — the warning is cosmetic noise but does not affect correctness; a future task may bump the limit to silence it
