# ADR-0009: `awaiting_subtasks` Status for Parent Epic Lifecycle

**Date:** 2026-06-12
**Status:** Superseded by [ADR-0010](ADR-0010-remove-subtasks.md)
**Supersedes:** [ADR-0008](ADR-0008-dependency-satisfies-epic-scheduling.md) item #6 (harness transition)
**Deciders:** T2A maintainers

## Context

ADR-0008 kept parent `status=ready` after verify with open subtasks and blocked re-dequeue via `ParentAwaitingSubtasks`. Operators saw "Ready" in the UI while the parent agent had finished and subtasks were still running — the stored state did not match observable epic progress. Stats and API consumers also counted those parents as ready work.

## Decision

1. Add persisted status `awaiting_subtasks` (`domain.StatusAwaitingSubtasks`).
2. **Harness:** on successful verify with open subtasks, transition `running → awaiting_subtasks` (not `ready`).
3. **Checklist sync:** when criteria become complete on a `ready` parent with open subtasks, transition to `awaiting_subtasks` in the same transaction.
4. **Client writes:** reject `POST`/`PATCH` of `awaiting_subtasks` for `X-Actor: user`; only the agent path may set it today. Block `awaiting_subtasks → ready`; allow `awaiting_subtasks ↔ on_hold`. Resuming from `on_hold` with open subtasks restores `awaiting_subtasks` instead of `ready`.
5. **Backfill:** at migrate, set `awaiting_subtasks` for rows with `criteria_satisfied_at` set, `status=ready`, and at least one non-`done` child.
6. **Worker queue:** unchanged — only `status=ready` enters the queue; `ParentAwaitingSubtasks` remains defense-in-depth for legacy rows until backfill.
7. **Auto-parent-done:** unchanged — last subtask `done` still cascades parent to `done` when checklist complete.
8. **UI label:** "Subtasks in progress" (distinct from `running` / "In progress").

## Consequences

### Positive

- Stored status, stats, and operator UI agree during epic execution.
- No new worker queue predicate beyond excluding non-`ready` statuses.
- Clear separation: `running` = open agent cycle; `awaiting_subtasks` = criteria done, children still open.

### Negative / Trade-offs

- Enum + migration surface area ADR-0008 deliberately avoided.
- Clients must accept the new status on reads and must not attempt to write it.

## Alternatives Considered

| Alternative | Reason Rejected |
|-------------|-----------------|
| Keep `ready` + UI-only relabel | Stats/API remain misleading |
| Reuse `running` | Implies open cycle; blocks checklist edits and confuses reconcile |
| Reuse `review` | Already means user/agent review input |
