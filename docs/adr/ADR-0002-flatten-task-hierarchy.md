# ADR-0002: Flatten Task Hierarchy

> **Note** - Product renamed T2A to Hamix; identifiers below reflect the name at decision time unless updated inline.

**Date:** 2026-05-26
**Status:** Superseded by [ADR-0010](ADR-0010-remove-subtasks.md) (subtask-related rows)
**Deciders:** T2A maintainers

## Context

T2A originally modeled long-running work as **Project → Goal → Step → Task** with recursive subtasks. The agent worker dequeues **tasks** only; goal/step gates blocked assignment to steps, not worker dispatch. Three overlapping mechanisms expressed dependencies (goal DAG, step ordering, parent_id depth) without matching how agents pick up work.

Operators need dependency-aware workflows on the unit the worker executes: explicit `depends_on`, optional per-task gates, tags, milestones, and depth-1 subtasks only.

Existing `project_goals` / `project_steps` data was throwaway dev data with no production backfill requirement.

## Decision

Collapse organizational hierarchy to **Project → Task** with:

| Concept | Storage | Worker rule |
|---------|---------|-------------|
| `depends_on` | `task_dependencies` join table | All predecessors must be `done` |
| `gate` | JSONB on `tasks` | Null or `released` only |
| `tags` / `milestone` | JSONB array / nullable string on `tasks` | Filtering and UI only |
| `parent_id` | existing column | Depth 1 at write time |

Remove `project_goals`, `project_steps`, and `Task.project_step_id`. Rename step gate status enum to `GateStatus` for task gates. Expose scheduling via task CRUD, `/tasks/{id}/dependencies`, and `PATCH /tasks/{id}/gate`. Emit `task_dependency_changed` and `task_gate_changed` SSE events.

## Consequences

### Positive

- Single scheduling model aligned with worker dequeue semantics.
- Simpler HTTP surface and SPA (no goals/steps routes or UI).
- DAG cycle detection reuses established store patterns.

### Negative / Trade-offs

- No first-class milestone registry (free-form strings only in V1).
- Gate auto-release from `pending_release` is operator-driven only.
- Breaking change: goal/step HTTP API and tables removed without migration.

## Alternatives Considered

| Alternative | Reason Rejected |
|-------------|-----------------|
| Keep goals/steps as read-only labels | Duplicated gate state machines and confused worker readiness |
| Backfill step gates onto tasks | Data was disposable; backfill added complexity without user value |
| Unbounded `parent_id` + `depends_on` | Depth-1 subtasks keep trees inspectable; siblings use DAG edges |
