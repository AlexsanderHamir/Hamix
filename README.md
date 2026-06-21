# T2A

The control plane for AI-driven software development.

Think of T2A as [n8n](https://n8n.io) for engineering work: you define tasks and dependencies, and the system coordinates execution and verification. You focus on goals, review, and decisions — the rest runs automatically.

## Get started

**Requirements:** Go 1.25+, Node 20+, and `DATABASE_URL` in a repo-root `.env`.

1. Copy `.env.example` to `.env` and set `DATABASE_URL`.
2. Apply the schema: `go run ./cmd/dbcheck -migrate`
3. Start the API and web UI:

```bash
./scripts/dev.sh        # Unix — chmod +x once if needed
.\scripts\dev.ps1       # Windows
```

API at `http://127.0.0.1:8080` · Web at `http://localhost:5173`. Ctrl+C stops both.

4. Verify your setup: `./scripts/check.sh` or `.\scripts\check.ps1` (add `--install` / `-Install` on first run)

Contributing? See [CONTRIBUTING.md](CONTRIBUTING.md). Agent and workspace settings are in the web UI at `/settings` — see [docs/configuration.md](docs/configuration.md).

## Before you run tasks

Read [docs/execute-and-verify.md](docs/execute-and-verify.md) before creating tasks or writing done criteria.

- Every task runs an **execute** agent and a **verify** agent.
- The worker runs **one task at a time** — you can queue many, but they run sequentially.
- Do not edit, commit, or checkout files in the workspace repo during **verify**. Git changes there end the cycle as `verify_tampered` (no retry).
- Point **Workspace repository** at a **dedicated git worktree** so you can keep working in your main checkout — [details](docs/execute-and-verify.md#dedicated-worktree-recommended).

## Docs

- [docs/guide.md](docs/guide.md) — how documentation fits together
- [CONTRIBUTING.md](CONTRIBUTING.md) — setup and PR checklist
- [AGENTS.md](AGENTS.md) — code paths when editing the repo

## License

[MIT](LICENSE)
