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
./scripts/docker-build.sh
```

4. Start API + web:

```bash
docker compose up
```

- API: `http://127.0.0.1:8080`
- Web: `http://localhost:5173`

The container runs `go run ./cmd/dbcheck -migrate` automatically before starting dev servers (idempotent).

Press Ctrl+C to stop. Run `docker compose down` to remove the container.

## How it works

| Piece | Role |
| --- | --- |
| [docker/Dockerfile.dev](../docker/Dockerfile.dev) | Toolchain image: Go 1.25, Node 20, PowerShell (for web standards check) |
| [compose.yml](../compose.yml) | Mounts the repo, loads `.env`, publishes ports 8080 and 5173 |
| [docker/dev-entrypoint.sh](../docker/dev-entrypoint.sh) | Validates `DATABASE_URL`, migrates on dev start, runs your command |
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

## Running checks

Same bar as [CONTRIBUTING.md § Before you open a PR](../CONTRIBUTING.md#before-you-open-a-pr), inside the container:

```bash
docker compose run --rm dev ./scripts/check.sh --install
```

Go-only or web-only flags work the same as native (`--go-only`, `--web-only`).

One-off migrate:

```bash
docker compose run --rm dev go run ./cmd/dbcheck -migrate
```

## Rebuild the image

After changes to [docker/Dockerfile.dev](../docker/Dockerfile.dev) or to refresh base packages:

```bash
./scripts/docker-build.sh
./scripts/docker-build.sh --no-cache
```

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `DATABASE_URL is not set` | Create `.env` from `.env.example` |
| DB connection refused from container | Use `host.docker.internal` if DB is on the host |
| Port 8080 or 5173 in use | Stop native `./scripts/dev.sh` or other listeners |
| Vite hot reload stalls (Windows + Docker) | Set `CHOKIDAR_USEPOLLING=true` in `.env` |
| `permission denied` on entrypoint | Ensure [docker/dev-entrypoint.sh](../docker/dev-entrypoint.sh) is executable, or run `git update-index --chmod=+x docker/dev-entrypoint.sh` |

## Known limitations

- **Agent execution** (Cursor CLI, workspace repo path) is configured in the SPA **Settings** page and runs against paths on your **host**. Docker covers API/web development and PR checks, not running Cursor inside the container unless you configure that separately.
- **Windows shell:** run `./scripts/docker-build.sh` from Git Bash or WSL, or use `docker compose build dev` directly from PowerShell.

## See also

- [CONTRIBUTING.md](../CONTRIBUTING.md) — native setup and PR checklist
- [docs/configuration.md](./configuration.md) — env vars and `DATABASE_URL`
- [README.md](../README.md) — product overview
