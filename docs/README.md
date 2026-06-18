# Documentation

Contributor reference for T2A. The root [README.md](../README.md) covers product framing and `npm` / `go run` commands.

| Doc | Read when |
| --- | --- |
| [architecture.md](./architecture.md) | You need to understand how `taskapi`, the store, the agent worker, and SSE fit together. |
| [data-model.md](./data-model.md) | You are touching tasks, projects, execution cycles/phases, dependencies, gates, or checklists. |
| [domain/](./domain/) | Behavioral deep-dives (scheduling, persistence, SSE, queue, supervisor, harness, …). Start with [harness.md](./domain/harness.md) for cycles, [task-scheduling.md](./domain/task-scheduling.md) for “stuck ready”, or [persistence.md](./domain/persistence.md) for store writes. Schema and routes stay in data-model and api. |
| [api.md](./api.md) | You need the REST + SSE endpoint surface. Handler code is the authoritative reference for status codes and error strings. |
| [configuration.md](./configuration.md) | You are changing env vars, app settings, or anything in `pkgs/agents`. |
| [web.md](./web.md) | You are working on the `web/` SPA. |
| [contributing.md](./contributing.md) | You are adding a feature, splitting a handler, or debugging a local failure. |
| [adr/](./adr/) | Historical architectural decisions. |
