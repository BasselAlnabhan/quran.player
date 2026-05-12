## Review — Task deploy-4 — Round 1
Date: 2026-05-12
Reviewer: reviewer subagent
Diff scope: git diff against HEAD (uncommitted changes)

**Verdict**
APPROVED

**Gate check**
typecheck: pass
lint: pass (0 warnings, 0 errors)
tests: pass (299 passed, 0 failed, 0 skipped)
build: pass
main chunk size: 52KB gz (budget: 250KB)

**Acceptance criteria**

[x] ADR 0004 created and accurate — content matches all four artifacts (Dockerfile, nginx/default.conf, deploy/docker-compose.yml, .github/workflows/deploy.yml)
[x] README.md Deployment section added between "Architecture decisions" and "Licensing" — confirmed in diff
[x] GitHub secrets table matches workflow — DEPLOY_HOST, DEPLOY_USER, DEPLOY_SSH_KEY, DEPLOY_PORT all present in both README and workflow
[x] GITHUB_TOKEN paragraph accurate — workflow uses secrets.GITHUB_TOKEN, no manual token needed
[x] DEPLOY_PORT fallback documented correctly — README says "optional, defaults to 22"; workflow uses `secrets.DEPLOY_PORT || 22` which is valid (empty string is falsy in GHA expressions)
[x] One-time VPS setup is functional — useradd -m -G docker creates home dir and grants docker group; .ssh dir setup is correct; authorized_keys chmod 600 is included
[x] Deploy directory mkdir matches workflow target — README says ~/quran-reader/, workflow uses target: ~/quran-reader/ with strip_components: 1
[x] Branch protection paragraph accurate — status check job is named `test` in the workflow
[x] CLAUDE.md layout updated — Dockerfile, .dockerignore, .github/, deploy/, nginx/ all added
[x] Internal links resolve — [ADR 0004](./docs/adr/0004-containerized-deploy.md) is correct relative path; docs/adr/ link pre-existed
[x] ADR vs Dockerfile — "node:20-alpine → nginx:1.27-alpine" matches Dockerfile lines 2 and 16
[x] ADR vs nginx/default.conf — SPA fallback (try_files $uri /index.html), immutable /assets/ caching, no-cache on sw.js/index.html/manifest.webmanifest, server_tokens off, security headers (X-Content-Type-Options, X-Frame-Options, Referrer-Policy) all confirmed
[x] ADR vs deploy/docker-compose.yml — proxy network external: true, no host ports published, confirmed
[x] ADR vs deploy.yml — GITHUB_TOKEN auth, :latest + :<sha> tags (format=short = 7-char), appleboy/scp-action + appleboy/ssh-action, all confirmed
[x] No accidental changes — diff contains exactly CLAUDE.md, README.md, and docs/adr/0004-containerized-deploy.md; no src/ or test/ changes
[x] Gates not regressed — doc-only change; all gates identical to prior round

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

README.md:92 — The `useradd` snippet does not set a login shell (`-s /bin/bash`); on some Ubuntu configurations `useradd` defaults to `/bin/sh` or `/usr/sbin/nologin`, which blocks SSH interactive and non-interactive commands. Adding `-s /bin/bash` makes the instructions unconditionally safe.
