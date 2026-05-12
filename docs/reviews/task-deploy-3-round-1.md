## Review — Task deploy-3 — Round 1
Date: 2026-05-12
Reviewer: reviewer subagent
Diff scope: .github/workflows/deploy.yml (untracked, not yet committed)

**Verdict**
CHANGES REQUIRED

**Gate check**
typecheck: pass
lint: pass (0 warnings, 0 errors)
tests: pass (299 passed, 0 failed, 0 skipped)
build: pass
main chunk size: 51KB gz (budget: 250KB)

**Acceptance criteria**

[x] Workflow triggers on push to main and pull_request — on.push.branches:[main] and on.pull_request both present (line 10-12)
[x] test job runs typecheck, lint, unit tests, build, bundle-size gate — all five steps present (lines 29-47)
[x] deploy job runs only on direct push to main, never on PRs or forks — `if: github.event_name == 'push' && github.ref == 'refs/heads/main'` (line 53)
[x] deploy job needs test job — `needs: [test]` (line 51)
[x] GHCR login uses auto GITHUB_TOKEN — `password: ${{ secrets.GITHUB_TOKEN }}` (line 70)
[x] permissions block is correct — `contents: read, packages: write` (lines 55-58)
[x] Image tagged with `latest` and short SHA — metadata-action type=raw,value=latest and type=sha,format=short (lines 79-81)
[x] Layer cache configured — `cache-from/cache-to: type=gha` (lines 91-92)
[x] docker-compose.yml copied to VPS — scp-action step present (lines 94-105)
[x] VPS deploy script pulls, restarts, prunes — `docker compose pull && up -d && image prune -f` (lines 116-118)
[x] Concurrency block prevents cancel on main pushes — `cancel-in-progress: ${{ github.event_name == 'pull_request' }}` (line 7)
[✗] Action pins are current — scp-action@v0.1.7 is two major versions behind (v1.0.0 released 2025-04-27); ssh-action@v1.0.3 is four minor versions behind (v1.2.5 is latest); build-push-action@v6 is one major behind (v7.1.0 released 2026-04-10)

**Critical showstoppers (crashes, undefined behavior, data loss)**

None found.

**Duplicated or unclean code**

deploy.yml:97-100 and deploy.yml:110-113 — host/username/key/port repeated verbatim across scp-action and ssh-action steps — no consolidation possible without a composite action; acceptable at this scale, but a DEPLOY_PORT default-22 fallback is done inline twice with the same expression.

**Performance issues**

None found.

**Testing gaps**

None found.

**Other must-fix issues (CLAUDE.md violations, type safety, accessibility, etc.)**

deploy.yml:95 — `appleboy/scp-action@v0.1.7` is two major versions stale (v1.0.0 released 2025-04-27 with an updated drone-scp 1.8.x base); the newer major version ships with drone-scp 1.8.1 (vs 1.6.14 in v0.1.7) which includes several bug fixes and security patches in the underlying SSH/SCP implementation. Given this action gates production deploys, running an outdated major is a must-fix.

deploy.yml:108 — `appleboy/ssh-action@v1.0.3` is four minor versions behind v1.2.5 (released 2026-01-28). Four minor releases in the same major is a should-fix not a blocker, but combined with the scp-action major version gap, the pattern of stale action pins is worth addressing in the same pass.

**Should-fix (not blocking but address before next task)**

deploy.yml:84 — `docker/build-push-action@v6` is one major version behind v7 (v7.1.0 released 2026-04-10). The Docker action family (login, setup-buildx, metadata, build-push) should be pinned consistently; all the others are already on their current major (v3, v3, v5), but build-push is one major back.

deploy.yml:108 — `appleboy/ssh-action@v1.0.3` → upgrade to v1.2.5 (same pass as scp-action upgrade).

deploy.yml:118 — `docker image prune -f` removes all dangling images host-wide, not just quran-reader's. Running container images (including Nginx Proxy Manager) are safe because they are never dangling. However if NPM was recently updated and the old image stopped before pruning, that old image gets removed. Flag for the operator's awareness; acceptable on a single-app VPS but worth a comment explaining the scope.

deploy.yml:43 — `find dist/assets -maxdepth 1 -name 'index-*.js' | head -n1` relies on there being exactly one `index-*.js` file. Vite's current output confirms this, but if a future dependency causes Vite to split an additional entry-point chunk named `index-*`, the gate would silently measure the wrong file. Consider renaming the pattern to match the known entry pattern more tightly, or assert `wc -l` of the find result equals 1.
