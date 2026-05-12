# ADR 0004 — Containerized deploy via Docker, GHCR, and SSH

**Status:** Accepted
**Date:** 2026-05-12

## Context

v1 of the reader ran as a Vite dev preview or a manual `vite build` deployed by
hand. The user owns a single VPS (Ubuntu 24) with Docker, Docker Compose, and
Nginx Proxy Manager already running. The repo is public on GitHub. The goal is
for every push to `main` to deploy automatically with no manual steps.
Constraints: free tooling only; no third-party PaaS; deploy must respect the
CLAUDE.md quality gates.

## Decision

1. **Container image is the deploy artifact.** A multi-stage Docker build
   (`node:20-alpine` builder → `nginx:1.27-alpine` runtime) produces a
   self-contained image that ships only the compiled `dist/` folder. The nginx
   configuration handles SPA fallback (`try_files $uri /index.html`), immutable
   long-term caching on `/assets/` (content-hashed filenames), `no-cache` on
   `sw.js`, `index.html`, and `manifest.webmanifest` (files that must re-validate
   on each visit), `server_tokens off` to suppress the nginx version header, and
   per-location security headers (`X-Content-Type-Options`, `X-Frame-Options`,
   `Referrer-Policy`).

2. **Registry: GHCR (GitHub Container Registry).** GHCR is free for public repos
   with no storage or bandwidth cap. Authentication uses the workflow-scoped
   `GITHUB_TOKEN` that GitHub Actions injects automatically — no personal access
   token to create or rotate. Images are tagged `:latest` plus `:<7-char sha>`
   on every push.

3. **Deploy via SSH + docker compose, not Ansible or a PaaS.** For a single host
   running a single service, Ansible is overkill; a PaaS adds cost and
   complexity. The workflow uses `appleboy/scp-action` to copy
   `deploy/docker-compose.yml` to `~/quran-reader/` on the VPS, then
   `appleboy/ssh-action` to run `docker compose pull && docker compose up -d`.
   Ansible was explicitly considered and rejected for this single-host case.

4. **TLS termination upstream at Nginx Proxy Manager.** The app container exposes
   port 80 internally on the `proxy` Docker network and publishes no host ports.
   NPM holds the Let's Encrypt certificate for `quran.basselalnabhan.se` and
   proxies HTTPS inbound to the container over that shared network.

5. **Deploy network access via Tailscale, not public-internet SSH.** The VPS
   firewall blocks port 22 to all non-tailnet IPs. GitHub Actions runners are
   not on the tailnet by default. The workflow adds a `tailscale/github-action@v3`
   step before the scp/ssh steps; the runner joins the tailnet as an ephemeral
   node authenticated via a short-lived auth key minted from an OAuth client
   (scope `auth_keys`, tag `tag:ci-github`). The ephemeral node disappears when
   the job ends — no long-lived runner identity on the tailnet. The trade-off is
   one external network dependency (Tailscale's control plane) during deploys,
   and the OAuth client credentials replace a static SSH-key-only trust chain;
   both are acceptable given the security upside of never exposing port 22
   publicly.

## Consequences

- GHCR is free for public repos; private repos incur cost gated on repo
  visibility, not seat count.
- Image retention: named tags persist indefinitely on GHCR; untagged (dangling)
  layers can be pruned by a retention policy. No policy is configured yet — this
  is a candidate future task.
- The `:latest` + `:<sha>` tag strategy means rollbacks are
  `docker compose pull <repo>:<sha> && docker compose up -d` on the VPS —
  no rebuild required.
- The deploy workflow authenticates with `GITHUB_TOKEN`, not a long-lived PAT,
  so credential rotation is automatic per workflow run.
- The SSH user is currently `root`. This is acceptable short-term; the README
  documents the one-time migration to a `deploy` user. Because the workflow reads
  `DEPLOY_USER` from a secret, the cutover requires only a secret edit — no code
  change.
- `nginx:1.27-alpine` is pinned by major tag, not by digest. Security patches
  to the nginx base flow in automatically on rebuild — an accepted trade-off
  against the operational burden of manually bumping image digests.
- The CI `test` job runs on all `push` and `pull_request` events, including from
  forks. Fork workflows cannot read repository secrets, so the deploy step never
  fires for fork PRs — the standard correct posture for public repos.
- The deploy now has a hard dependency on Tailscale's control plane
  (`controlplane.tailscale.com`) being reachable for the OAuth → auth-key
  exchange. A Tailscale outage blocks deploys but does NOT block end-user
  traffic, which is served by NPM + the already-running container.
