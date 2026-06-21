# T2A

The control plane for AI-driven software development.

---

## What is T2A

Chat-based agent UIs are good for exploration, but they make software work hard to repeat: every session starts fresh, acceptance is implicit, and you re-explain the same goals. T2A sits above CLI agents (Cursor, Claude Code, and others) as a **control plane** that turns that work into structured, reviewable tasks.

You define what needs to happen and what “done” means — checklist criteria, not open-ended conversation. A background worker runs an **execute** agent to implement the work and a separate **verify** agent to judge each criterion. A task finishes only when verify accepts every item, not when execute claims success. Every run is recorded as an attempt you can inspect and retry.

Think of T2A as [n8n](https://n8n.io) for engineering work: tasks, dependencies, and scheduling form a workflow; agents do the implementation and review loops inside your git workspace while you focus on defining work, reviewing outcomes, and making decisions.

Use it through the **web UI** (task board, checklists, cycle history) or the **REST API** (same contract for scripts, CI, and other agents). Postgres holds authoritative state; the UI stays live via SSE hints and refetches.

**Jump to** [execute and verify](docs/execute-and-verify.md) · [architecture](docs/architecture.md) · [API reference](docs/api.md)

---

## Features

**Execute & verify** — Two-agent review on every task with done criteria. Execute implements and self-reports; verify independently judges each checklist item. Optional per-criterion shell commands for read-only checks. [Details](docs/execute-and-verify.md)

**Done criteria** — Checklist items are the acceptance contract. Stable IDs, readable text, and verify commands up to five per item. [Writing criteria](docs/domain/done-criteria.md)

**Task queue** — Create as many tasks as you need; the worker runs one at a time and picks the next eligible task. Retry with **Start over** or **Resume from failure** when a run fails. [Queue & scheduling](docs/domain/agent-queue.md)

**Dependencies & gates** — Model multi-step work as sibling tasks linked by `depends_on`. Optional manual release gates pause pickup until an operator approves. [Data model](docs/data-model.md)

**Task templates** — Save reusable task definitions and instantiate them in batch from the UI or API. [Templates](docs/web.md)

**Execution cycles** — Every attempt is recorded: execute → verify phases, commits, verdicts, and an append-only audit trail. [Cycles](docs/data-model.md#execution-cycles-and-phases)

**Live UI** — Browsers subscribe to `GET /events` (SSE); mutations invalidate the React Query cache so the board updates without polling. [Web architecture](docs/web.md)

**Workspace repo** — Agents run against a dedicated git checkout (worktree recommended). Commit diffs, `@`-mention validation, and tamper detection during verify. [Workspace repo](docs/domain/workspace-repo.md)

**Runner adapters** — Pluggable CLI runners (Cursor in production today; registry for more). Separate execute and verify runner/model in Settings. [Runners](docs/domain/runner-adapters.md)

**REST + SSE API** — Full CRUD for tasks, checklists, cycles, drafts, templates, and settings. Same surface for humans and automation. [API reference](docs/api.md)

---

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
