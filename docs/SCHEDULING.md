# Task scheduling — agent pickup deferral

Operators defer when the worker may pick up a task using `tasks.pickup_not_before` (RFC3339 UTC). This doc is the durable reference for wire shape, runtime paths, and invariants. REST field semantics: [API-HTTP.md](./API-HTTP.md).

## Substrate

- `domain.Task.PickupNotBefore *time.Time` → column `pickup_not_before` (indexed). `nil` means pick up as soon as the worker is free.
- Wire: RFC3339 UTC string or JSON `null` to clear on `PATCH` (see API-HTTP for create vs patch rules).
- Default deferral on create: `app_settings.agent_pickup_delay_seconds` is applied when creating `status=ready` and the client omits `pickup_not_before`.

## Three paths to the worker

Eligibility in SQL: `status='ready'` AND `(pickup_not_before IS NULL OR pickup_not_before <= now())` — see `pkgs/tasks/store/internal/ready/ready.go` (`ListQueueCandidates`).

1. **Immediate notify** — When the row is ready now, `Store.notifyReadyTask` pushes onto the in-process `MemoryQueue` (`Create` / `Update` / `ApplyDevTaskRowMirror` when due).
2. **Pickup wake** — Future `pickup_not_before`: `PickupWakeScheduler` schedules a wake; startup `Hydrate` reloads deferred rows. See [AGENT-QUEUE.md](./AGENT-QUEUE.md).
3. **Reconcile** — `RunReconcileLoop` backstops missed notifies (fixed 2m tick).

**Invariant:** the memory queue must never contain a task the SQL filter would reject; `ShouldNotifyReadyNow` matches `pickup_not_before <= now()` with the same semantics as the query.

**Latency:** pickup wake fires near the deadline; reconcile bounds worst-case delay to one tick if the wake path misses.

## UI and API

Schedules are edited from the SPA (create flow, task detail, bulk actions) and via `POST`/`PATCH /tasks` as documented in API-HTTP.

## Multi-replica, clock skew, packages

`MemoryQueue` and `PickupWakeScheduler` are **single-process**. Today: one `taskapi` per database that runs the queue consumer, or equivalent exclusivity.

Horizontal HTTP scale without a single consumer requires **distributed claiming** (row locks, leases, external broker, etc.); reconcile does not provide cross-replica mutual exclusion.

`PickupWakeScheduler` uses the **process clock**; SQL uses **database `now()`** at query time — keep **NTP** aligned on app hosts and Postgres.

`store.PickupWake` lives in `pkgs/tasks/store` and is implemented in `pkgs/agents` to avoid import cycles; extract a neutral package only if the graph forces it.

## Invariants worth preserving

- `shouldNotifyReadyNow` stays aligned with the SQL predicate (strict `After` vs `<=` pairing).
- On `PATCH`, empty string and JSON `null` both clear `pickup_not_before`; on `POST`, empty string for this field is rejected.
- Clearing a future schedule on an already-`ready` task must notify immediately (not only on status transitions).
- Schedule-only changes do not append a dedicated `task_events` row; they still surface through normal `task_updated` / list invalidation.
- Autosave drafts intentionally omit the ephemeral schedule choice (wall-clock anchor); reopening clears it.

Older long-form dated implementation notes were removed from this file to reduce churn; see **git history** for `docs/SCHEDULING.md` before 2026-05-09 if you need the original narrative.
