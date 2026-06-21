# Docker local development

Run Hamix API and web UI without installing Go or Node locally. You still provide Postgres via `DATABASE_URL` in repo-root `.env` — same as the native setup.

| | |
| --- | --- |
| **Applies to** | Local development when Go/Node are not installed |
| **Audience** | Contributors |
| **Prerequisite** | [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows/Mac) or Docker Engine + Compose v2 (Linux) |

## In this article

- [Requirements](#requirements)
- [Quick start](#quick-start)
- [How it works](#how-it-works)
- [DATABASE_URL from a container](#database_url-from-a-container)
- [Schema migrations](#schema-migrations)
- [Logs](#logs)
- [Running checks](#running-checks)
- [Rebuild the image](#rebuild-the-image)
- [Troubleshooting](#troubleshooting)
- [Known limitations](#known-limitations)
- [See also](#see-also)

## Requirements

- Docker with Compose v2 (`docker compose`)
- Repo-root `.env` with `DATABASE_URL` (copy from [.env.example](../.env.example))

Native setup (Go + Node installed locally): [CONTRIBUTING.md](../CONTRIBUTING.md).

## Quick start

1. Copy `.env.example` to `.env` and set `DATABASE_URL`.
2. If Postgres runs on your **host** machine, use `host.docker.internal` instead of `localhost` in the URL — see [below](#database_url-from-a-container).
3. Build the toolchain image once:

```bash
./scripts/docker-build.sh        # Unix
```

```powershell
.\scripts\docker-build.ps1       # Windows PowerShell
```

4. Start API + web (same on all platforms):

```bash
docker compose up
```

- API: `http://127.0.0.1:8080`
- Web: `http://localhost:5173`

Schema migrate runs when **taskapi** starts (same as native dev). See [Schema migrations](#schema-migrations).

Press Ctrl+C to stop. Run `docker compose down` to remove the container.

## How it works

| Piece | Role |
| --- | --- |
| [docker/Dockerfile.dev](../docker/Dockerfile.dev) | Toolchain image: Go 1.25, Node 20, PowerShell (for web standards check) |
| [compose.yml](../compose.yml) | Mounts the repo at `/app`, host home at `/host-home`, loads `.env`, publishes ports 8080 and 5173 |
| [docker/dev-entrypoint.sh](../docker/dev-entrypoint.sh) | Validates `DATABASE_URL`, then runs your command |
| [scripts/dev.sh](../scripts/dev.sh) | Same script as native dev; Compose passes `--host 0.0.0.0 --vite-host 0.0.0.0` so the browser on your machine can reach the servers |

You do not run those flags yourself — Compose sets them.

## DATABASE_URL from a container

Inside the container, `localhost` means the container itself, not your laptop.

| Where Postgres runs | Use in `.env` |
| --- | --- |
| On your host (local install) | `host.docker.internal` instead of `localhost` / `127.0.0.1` |
| Remote or cloud | Your URL as-is |

Example (Postgres on the host):

```
DATABASE_URL=postgres://user:pass@host.docker.internal:5432/hamix?sslmode=disable
```

`compose.yml` adds `host.docker.internal:host-gateway` for Linux; Docker Desktop provides it on Windows and Mac.

## Schema migrations

Not in the Docker entrypoint. When `docker compose up` runs `./scripts/dev.sh`, **taskapi** applies `postgres.Migrate` on startup — the same path as `.\scripts\dev.ps1` / `./scripts/dev.sh` on the host.

Optional manual migrate (schema only, no servers):

```bash
docker compose run --rm dev go run ./cmd/dbcheck -migrate
```

Full detail: [configuration.md — Schema migrations](./configuration.md).

## Logs

taskapi writes JSON lines to **`./logs/`** by default (`HAMIX_LOG_DIR` unset). In Docker that path is **`/app/logs`**, which is your repo’s `logs/` folder on the host (bind mount) — same as native dev. The directory is gitignored.

| Setting | Docker note |
| --- | --- |
| Default (no log vars) | Files appear at `logs/taskapi-*.jsonl` in your checkout |
| `HAMIX_LOG_LEVEL=debug` | More verbose JSON logs (same as native) |
| `HAMIX_DISABLE_LOGGING=1` | No JSON files; only errors on stderr. taskapi runs in the background inside `dev.sh`, so this is harder to tail than `./logs/` |
| `HAMIX_LOG_DIR=/some/other/path` | Only persists if that path is under the repo mount (`/app/...`) or you add a Compose volume. Paths outside the mount are lost when the container is removed |

`docker compose logs` shows the foreground process (mostly Vite). For taskapi request traces, open the JSON files under **`logs/`** on the host.

## Agent workspace (folder picker)

Docker bind-mounts your host home directory to **`/host-home`** (via `${HOME:-${USERPROFILE}}` in [compose.yml](../compose.yml)). In Settings → **Agent workspace** → **Choose project folder**, pick any project under **Home** (`/host-home/...`) or **Hamix checkout** (`/app`). Agent file edits under that path appear on your host immediately.

Optional: set `HAMIX_HOST_HOME` in `.env` to mount a narrower folder instead of full home — see [configuration.md](./configuration.md).

## Running checks

Same bar as [CONTRIBUTING.md § Before you open a PR](../CONTRIBUTING.md#before-you-open-a-pr), inside the container:

```bash
docker compose run --rm dev ./scripts/check.sh --install
```

Go-only or web-only flags work the same as native (`--go-only`, `--web-only`).

## Rebuild the image

After changes to [docker/Dockerfile.dev](../docker/Dockerfile.dev) or to refresh base packages:

```bash
./scripts/docker-build.sh
./scripts/docker-build.sh --no-cache
```

```powershell
.\scripts\docker-build.ps1
.\scripts\docker-build.ps1 -NoCache
```

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `DATABASE_URL is not set` | Create `.env` from `.env.example` |
| DB connection refused from container | Use `host.docker.internal` if DB is on the host |
| Port 8080 or 5173 in use | Stop native `./scripts/dev.sh` or other listeners |
| Vite hot reload stalls (Windows + Docker) | Set `CHOKIDAR_USEPOLLING=true` in `.env` |
| `workspace_repo: fail` after picking a folder | Saved `repo_root` may be a path from another environment (e.g. Windows path while running in Docker). Re-pick under **Agent workspace**. |
| Folder picker shows only `/app` | Home mount failed — check Docker file sharing and that `HOME` / `USERPROFILE` is set on the host |
| `permission denied` on entrypoint | Ensure [docker/dev-entrypoint.sh](../docker/dev-entrypoint.sh) is executable, or run `git update-index --chmod=+x docker/dev-entrypoint.sh` |

## Known limitations

- **Cursor CLI in Docker** — workspace selection and `/repo/*` work in Docker; running the execute agent still requires Cursor CLI where taskapi runs. The dev image does not include Cursor today — use native taskapi for full agent runs, or install Cursor in the container separately.

## See also

- [CONTRIBUTING.md](../CONTRIBUTING.md) — native setup and PR checklist
- [docs/configuration.md](./configuration.md) — env vars and `DATABASE_URL`
- [README.md](../README.md) — product overview
