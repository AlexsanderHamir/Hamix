# ADR-0010: Remove Subtasks

> **Note** - Product renamed T2A to Hamix; identifiers below reflect the name at decision time unless updated inline.

**Date:** 2026-06-13
**Status:** Accepted
**Supersedes:** [ADR-0002](ADR-0002-flatten-task-hierarchy.md) (subtask-related rows), [ADR-0008](ADR-0008-dependency-satisfies-epic-scheduling.md), [ADR-0009](ADR-0009-awaiting-subtasks-status.md)
**Deciders:** T2A maintainers

## Context

After ADR-0002 collapsed goal/step hierarchy, T2A kept **depth-1 subtasks** via `parent_id`, checklist inheritance, tree-shaped HTTP responses, and epic scheduling rules (ADR-0008, ADR-0009). That second hierarchy duplicated what `depends_on` already expresses: execution order among tasks the worker dequeues.

The subtask model added persistent complexity without matching operator workflows:

- Two overlapping ways to group work (`parent_id` tree vs `depends_on` DAG).
- Epic lifecycle states (`awaiting_subtasks`, parent rollup, auto-parent-done) that confused UI, stats, and API consumers.
- Checklist inheritance and parent-criteria guards tied to tree shape.
- Per-edge `criteria_complete` predicates that existed mainly to unblock parent→child scheduling deadlocks.

Every task is already the unit the agent worker executes. Operators who need ordered work should link tasks with explicit `depends_on` edges.

## Decision

1. **Remove the subtask model.** Drop `tasks.parent_id` and `tasks.checklist_inherit`. Delete subtask-specific store, handler, harness, and validation paths.
2. **Flat task API.** `GET /tasks`, `GET /tasks/{id}`, and SSE task payloads return a single `domain.Task` JSON object — no nested `children[]` tree.
3. **Remove `awaiting_subtasks`.** Promote any legacy rows to `ready` at migrate; shrink the status enum to the seven user/agent-writable values plus system transitions among them.
4. **Simplify dependencies.** `task_dependencies.satisfies` is `done` only. Legacy `criteria_complete` edges normalize to `done` at migrate. Worker readiness checks predecessor `status = done` exclusively.
5. **Simplify completion.** A task reaches `done` when its own checklist is complete (when criteria exist). No subtask rollup, auto-parent-done, or parent-criteria guards.
6. **Stats.** Remove `by_scope` from `GET /tasks/stats` — all tasks are peers; `total` and `by_status` suffice.
7. **Audit events.** Stop emitting `subtask_added`; historical rows may remain in `task_events` but are no longer written.
8. **Migration.** `migrateRemoveSubtasks` (idempotent `AutoMigrate` hook): clear `parent_id`, promote `awaiting_subtasks → ready`, normalize dependency satisfies, drop columns and tighten Postgres check constraints.

## Consequences

### Positive

- One scheduling primitive (`depends_on`) aligned with worker dequeue semantics.
- Flat list/detail JSON and SSE payloads — simpler clients and cache invalidation.
- Smaller status enum and harness — no parent epic lifecycle special cases.
- Reduced store/checklist/handler surface area.

### Negative / Trade-offs

- Breaking API change: clients must stop sending `parent_id`, `checklist_inherit`, and tree assumptions; recreate multi-step work as sibling tasks with explicit dependencies.
- Historical ADR-0008/0009 epic semantics are retired; workflow engines must use flat tasks + `depends_on`.
- `criteria_satisfied_at` remains on the task row as a checklist-complete cache but no longer drives dependency predicates.

## Alternatives Considered

| Alternative | Reason Rejected |
|-------------|-----------------|
| Keep depth-1 subtasks, drop only `awaiting_subtasks` | Still two hierarchy mechanisms; tree API and inheritance remain |
| Replace subtasks with project-scoped task groups | Projects already answer shared context; another grouping layer adds schema without worker benefit |
| Keep `criteria_complete` edges without subtasks | Predicate existed for parent→child scheduling; with flat tasks, `done` is sufficient |
