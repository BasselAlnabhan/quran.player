## Review — Task deploy-5 — Round 1
Date: 2026-05-12
Reviewer: reviewer subagent
Diff scope: git diff against HEAD (uncommitted changes)

**Verdict**
APPROVED

**Gate check**
typecheck: pass
lint: pass (0 warnings, 0 errors)
tests: fail (0 passed, 18 failed — pre-existing Windows parallelism flake, out of scope per review brief)
build: pass
main chunk size: 51.58KB gz (budget: 250KB)

**Acceptance criteria**

[x] New step is inside the `deploy` job, not `test` — confirmed at deploy.yml line 96–101; test job is untouched.
[x] Step is positioned after image build and before first VPS contact (scp) — image push ends at line 94; Tailscale step at line 96–101; scp step begins at line 103.
[x] Action pinned to `@v3` (current major, not `@main`, not unpinned) — `tailscale/github-action@v3` at line 97.
[x] Inputs match expected: `oauth-client-id`, `oauth-secret`, `tags: tag:ci-github` — lines 99–101; no extra inputs present.
[x] YAML indentation is consistent spaces (no tabs) — visually confirmed in full file read.
[x] Secrets table has 6 rows — confirmed: DEPLOY_HOST, DEPLOY_USER, DEPLOY_SSH_KEY, DEPLOY_PORT, TS_OAUTH_CLIENT_ID, TS_OAUTH_SECRET.
[x] `DEPLOY_HOST` description explicitly states Tailscale IP requirement — README line 61.
[x] "### Tailscale" subsection is between "### GitHub Actions secrets" and "### One-time VPS setup" — README lines 71–86.
[x] Tag name `tag:ci-github` is identical in workflow (line 101), README (line 82, 65), and ADR (line 49) — cross-doc consistent.
[x] Secret names `TS_OAUTH_CLIENT_ID` and `TS_OAUTH_SECRET` are identical in workflow (lines 99–100), README (lines 65–66, 86), — cross-doc consistent.
[x] OAuth scope `auth_keys` matches across README (line 65, 83) and ADR (line 49) — consistent.
[x] ADR Decision #5 accurately describes ephemeral, tagged, auth-key-from-OAuth runtime behavior — ADR lines 45–55 match workflow and README.
[x] ADR Consequences bullet correctly notes control-plane dependency and clarifies end-user traffic is unaffected — ADR lines 79–82.

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
