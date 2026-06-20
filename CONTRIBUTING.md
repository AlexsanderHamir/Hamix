# Contributing to T2A

Set up the repo, verify your change, and find the right documentation for learning or editing.

| | |
| --- | --- |
| **Applies to** | First-time setup, pull requests, finding docs |
| **Audience** | Human contributors and agents |
| **Prerequisite** | None — start here after cloning |

## In this article

- [Requirements](#requirements)
- [Setup](#setup)
- [Before you open a PR](#before-you-open-a-pr)
- [Where to go next](#where-to-go-next)
- [Stuck?](#stuck)
- [Security](#security)
- [See also](#see-also)

## Requirements

- **Go** 1.25+
- **Node** 20+ (for `web/`; see `web/package.json` `engines.node`)
- **Postgres** — connection string in repo-root `.env` (copy from [.env.example](.env.example))
- **Never commit** `.env` or secrets

> **Warning** — Workspace repo path, agent worker settings, cursor binary, and run timeout are configured in the SPA **Settings** page (`/settings`), not in `.env`. See [docs/configuration.md](docs/configuration.md).

## Setup

1. Copy `.env.example` to `.env` and set `DATABASE_URL`.
2. Apply schema: `go run ./cmd/dbcheck -migrate`
3. Run API + web together (recommended):

```bash
./scripts/dev.sh        # Unix — chmod +x once if needed
.\scripts\dev.ps1       # Windows
```

API: `http://127.0.0.1:8080` · Web: `http://localhost:5173`

Run pieces individually: see [README.md](README.md) Get started.

## Before you open a PR

Run tests before you open a PR. Pick the path that matches what you changed:

**Changed both, or not sure** — full check (same as CI):

```bash
(cd web && npm ci)      # first time, or after web dependencies changed
.\scripts\check.ps1     # Windows — use ./scripts/check.sh on Mac/Linux
```

**Web only** — from the `web/` folder:

```bash
cd web
npm ci                  # first time, or after dependencies changed
npm test -- --run
npm run lint
npm run check:standards
npm run build
```

**Go only** — skip the web steps:

```bash
$env:CHECK_SKIP_WEB='1'; .\scripts\check.ps1    # Windows
CHECK_SKIP_WEB=1 ./scripts/check.sh             # Mac/Linux
```

Also:

- [ ] Changed an API endpoint → update [docs/api.md](docs/api.md) in the same PR
- [ ] New behavior → add or update a test
- [ ] User-visible change → update the relevant doc

Coding conventions (where to put API calls, how the live UI updates, etc.): [AGENTS.md](AGENTS.md).

## Where to go next

Pick **one** row. Do not read the whole tree.

| I want to… | Start here |
| --- | --- |
| **Learn the project** — how docs fit together | [docs/guide.md](docs/guide.md) |
| **Use T2A** — create tasks, write checklist criteria | [docs/execute-and-verify.md](docs/execute-and-verify.md) |
| **Edit code** — find a file or doc for a specific task | [AGENTS.md](AGENTS.md) § [Where to find X](AGENTS.md#where-to-find-x) |
| **Edit code** — pick reading order for my kind of change | [AGENTS.md](AGENTS.md) § [Scoped paths](AGENTS.md#scoped-paths) |
| **Look up routes, schema, or env vars** | [docs/api.md](docs/api.md), [docs/data-model.md](docs/data-model.md), [docs/configuration.md](docs/configuration.md) |
| **Find any doc by topic** | [docs/README.md](docs/README.md) |
| **Subsystem code paths** | [docs/agent-map.md](docs/agent-map.md) |

Vertical slice (domain → store → handler → optional web): follow [AGENTS.md](AGENTS.md) scoped paths, then `pkgs/tasks/handler/README.md` and [docs/domain/persistence.md](docs/domain/persistence.md).

## Stuck?

| Symptom | Fix |
| --- | --- |
| Full reload on `/tasks/<id>` shows raw JSON | Restart Vite; see `web/vite.config.ts` HTML bypass for `/tasks` proxy |
| SSE connected but Updates timeline empty | `T2A_SSE_TEST=1` in `.env`, restart `taskapi` — [docs/configuration.md](docs/configuration.md) |
| Fetch / EventSource errors | Confirm `taskapi` on `:8080` and dev script running |
| No repository for file search | Set **Workspace repository** in SPA Settings — [docs/domain/workspace-repo.md](docs/domain/workspace-repo.md) |
| Tests fail with database errors | Use `internal/tasktestdb/` (SQLite); gate real Postgres with `//go:build integration` |
| Match API error to logs | `request_id` in JSON body / `X-Request-ID` header on access logs |
| Still failing local checks | Re-run `go test ./... -count=1`; compare [CI](.github/workflows/ci.yml); full bar above |

More edit lookups: [AGENTS.md](AGENTS.md#where-to-find-x).

## Security

For **undisclosed vulnerabilities**, use [SECURITY.md](SECURITY.md) (private GitHub advisory, not a public issue).

## See also

- [README.md](README.md) — product overview and quick start
- [docs/guide.md](docs/guide.md) — documentation map and learning paths
- [AGENTS.md](AGENTS.md) — scoped paths, Where to find X, verify commands
