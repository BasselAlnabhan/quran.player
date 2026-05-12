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

## Deployment

Pushes to `main` automatically build a Docker image, push it to GHCR, and
redeploy on the VPS via SSH. See [ADR 0004](./docs/adr/0004-containerized-deploy.md).

### GitHub Actions secrets

The following secrets must be set in the GitHub repository settings before the
deploy workflow will succeed:

| Secret | Purpose |
|---|---|
| `DEPLOY_HOST` | VPS's **Tailscale IP** (e.g. `100.x.y.z`) — public IP/hostname won't work because port 22 is tailnet-only |
| `DEPLOY_USER` | SSH username (currently `root`; see one-time setup below) |
| `DEPLOY_SSH_KEY` | Private SSH key (PEM format) for the SSH user |
| `DEPLOY_PORT` | SSH port — optional, defaults to 22 |
| `TS_OAUTH_CLIENT_ID` | Tailscale OAuth client ID (scope `auth_keys`, tag `tag:ci-github`) |
| `TS_OAUTH_SECRET` | Tailscale OAuth client secret matching the above ID |

`GITHUB_TOKEN` is provided automatically by GitHub Actions for the GHCR push
and does not need to be created manually.

### Tailscale

Port 22 on the VPS is firewalled to the tailnet only — public-internet SSH is
closed. The deploy workflow uses `tailscale/github-action@v3` to join the
tailnet as an ephemeral, tagged node for the duration of the deploy job; the
node auto-deletes after the job ends.

One-time Tailscale admin steps:

1. In the ACL editor (<https://login.tailscale.com/admin/acls>), add
   `"tagOwners": { "tag:ci-github": ["autogroup:admin"] }` and an `acls` rule
   accepting `src: ["tag:ci-github"]` → `dst: ["<vps-tailscale-ip>:22"]`.
2. In OAuth clients (<https://login.tailscale.com/admin/settings/oauth>),
   generate a new client with scope `auth_keys` (write) and the `tag:ci-github`
   tag attached. Save the client ID and secret to GitHub secrets
   `TS_OAUTH_CLIENT_ID` / `TS_OAUTH_SECRET`.

### One-time VPS setup

These steps are required before the first deploy will succeed.

1. **Verify the `proxy` Docker network exists** — this is the network Nginx
   Proxy Manager uses to communicate with upstream containers:
   ```
   docker network ls | grep proxy
   ```
   If the network is absent, either NPM's own compose file creates it on
   startup or you can create it manually:
   ```
   docker network create proxy
   ```

2. **(Recommended) Create a least-privilege `deploy` user instead of using
   root:**
   ```
   sudo useradd -m -G docker -s /bin/bash deploy
   sudo mkdir -p /home/deploy/.ssh
   sudo chown deploy:deploy /home/deploy/.ssh
   sudo chmod 700 /home/deploy/.ssh
   # Append the deploy public key:
   sudo -u deploy tee -a /home/deploy/.ssh/authorized_keys < deploy.pub
   sudo chmod 600 /home/deploy/.ssh/authorized_keys
   ```
   After this, update the GitHub secret `DEPLOY_USER` to `deploy` (replacing
   `root`). No code change is required — the workflow reads the username from
   the secret.

3. **Create the deploy directory** (the workflow copies files to
   `~/quran-reader/`):
   ```
   mkdir -p ~/quran-reader
   ```

### Branch protection

Configure in GitHub repository settings → Branches → add a rule for `main`.
At minimum, enable "Require status checks to pass before merging" with the
`test` job selected. If working solo, also enable "Require a pull request
before merging" — still useful because it ensures the CI gate fires before
code lands on `main`.

## Licensing

Code: MIT (or your choice — pick before publishing).
Quran text from [alquran.cloud](https://alquran.cloud) is CC BY 4.0;
attribution belongs in the About screen.
