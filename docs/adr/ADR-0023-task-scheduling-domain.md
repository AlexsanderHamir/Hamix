# ADR-0023: Task Scheduling Domain (Decide vs Apply)

> **Note** - Product renamed T2A to Hamix; identifiers below reflect the name at decision time unless updated inline.

**Date:** 2026-06-19
**Status:** Accepted
**Deciders:** Engineering

## Context

Worker readiness and enqueue-time pickup policy were scattered across [`readiness.go`](../../pkgs/tasks/store/internal/tasks/readiness.go), [`facade_tasks.go`](../../pkgs/tasks/store/facade_tasks.go), SQL [`predicates.go`](../../pkgs/tasks/store/internal/ready/predicates.go), and [`admission.go`](../../pkgs/agents/worker/admission.go). Operators debugging tasks that stay `ready` but never run had no single `failed_predicate` signal at admission defer.

[ADR-0021](ADR-0021-harness-execute-orchestration.md) and [ADR-0022](ADR-0022-task-sync-policy.md) established Decide vs Apply for harness and frontend SSE cache policy. Scheduling is the next backend fragment with the same shape: pure policy vs store/worker Apply.

## Decision

Introduce **`pkgs/tasks/scheduling/`** as the pure scheduling policy package (Decide). Existing Apply layers unchanged in boundary: store facade (notify/wake), worker admission, reconcile SQL scan.

| Export | Role |
|--------|------|
| `EvaluateWorkerReadiness` | All four worker predicates → `ReadinessResult` + `FailedPredicate` |
| `ShouldNotifyReadyNow` | Pickup-time-only enqueue gate |
| `EdgeSatisfied` | Dependency edge predicate (predecessor row) |
| `DecideNotifyAfterReadyTransition` | Post-commit notify / pickup wake / cancel wake |

**Dependency rules:**

```
domain     → stdlib only
scheduling → domain only
store      → scheduling, domain, gorm
worker     → store only
```

Production code in `scheduling/` must not import `store`, `handler`, `agents`, or `gorm`. Contract tests in `parity_test.go` may import store test helpers.

**SQL alignment:** [`applyDequeuableTaskPredicates`](../../pkgs/tasks/store/internal/ready/predicates.go) stays in `store/internal/ready`; header comment points to `store/scheduling_parity_test.go` as the Go ≡ SQL contract.

### System invariants (I1–I7)

| ID | Invariant |
|----|-----------|
| I1 | **Admission ⊆ readiness** — worker never runs harness without all four predicates on reloaded row |
| I2 | **Reconcile ⊆ SQL dequeuable** — every `ListQueueCandidates` row passes pickup, deps, gate in SQL |
| I3 | **Go evaluator ≡ SQL filter** — for `status=ready` and pickup eligible, `EvaluateWorkerReadiness` matches candidate membership |
| I4 | **Pickup enqueue gate** — immediate `notifyReadyTask` never when `pickup_not_before > now` |
| I5 | **Dependent wake ⊆ readiness** — `notifyUnblockedDependents` only when full readiness |
| I6 | **Persist beats notify** — failed notify never rolls back commit |
| I7 | **Enqueue ≠ admission** — immediate notify may enqueue not-yet-admissible rows; worker defer is safety net |

### Operability

When worker admission defers, log at Debug: `failed_predicate=<status|pickup|gate|dependencies>` on the task id.

## Consequences

### Positive

- Single module for readiness predicate order and enqueue notify decisions.
- `FailedPredicate` gives operators a searchable defer reason without reading four files.
- Parity tests block Go/SQL drift when predicates change.

### Negative / Trade-offs

- Temporary re-export shims on store facade during migration.
- SQL predicates duplicated as comment contract until a future unified reconcile Decide (out of V1).

## Alternatives Considered

| Alternative | Reason Rejected |
|-------------|-----------------|
| **A (chosen)** Pure `scheduling` + store/worker Apply | Matches ADR-0021/0022; smallest behavior risk |
| **B** Go-only reconcile (load rows, filter in memory) | Breaks FIFO keyset at scale |
| **C** Full readiness before every `notifyReadyTask` | Violates I7; more queue churn; hides deps until reconcile |
| **D** Unified scheduling FSM day one | Same deferred risk as harness Track C |

## Extension checklist (new predicate)

Update in the **same PR**:

1. `scheduling/predicates.go`
2. `store/internal/ready/predicates.go` (SQL)
3. `store/scheduling_parity_test.go`
4. [docs/data-model.md](../data-model.md)
5. [docs/domain/task-scheduling.md](../domain/task-scheduling.md)

## Related

- [docs/domain/task-scheduling.md](../domain/task-scheduling.md) — operator workflows and invariants
- [docs/domain/agent-queue.md](../domain/agent-queue.md) — in-memory queue and reconcile
- [pkgs/tasks/scheduling/README.md](../../pkgs/tasks/scheduling/README.md) — package read order
