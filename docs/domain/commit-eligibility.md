# Commit eligibility (observe vs admit)

ADR-0016 splits **observation** (always persist SHAs after runner exit) from **admission** (execute gates before verify).

## Status enum

| Status | Meaning | Verify-ready |
|--------|---------|--------------|
| `eligible` | Passed all execute gates | Yes |
| `observed` | In ancestry but gates failed (`gate_reason` set) | No |
| `inherited` | Copied from parent on zero-new-commit resume | Promoted to `eligible` on re-admission |
| `superseded` | Dropped from current ancestry | No |

## Ingest pipeline

1. Runner exits OK → `git rev-list cycle_base_sha..HEAD`
2. Upsert rows with status assigned after gate evaluation
3. Publish SSE (`task_cycle_changed`) so UI refetches commits
4. Execute may still fail with the same machine reasons as before

## Consumers

| Consumer | Filter |
|----------|--------|
| Verify LLM git block | `ListEligibleCommitsForCycle` |
| Cross-cycle resume | `ListCommitsForTask` (dedupe by status rank) |
| Task detail panel | `GET /tasks/{id}/commits` |
| Verdicts API | All statuses on cycle rows |

See [ADR-0016](../adr/ADR-0016-observe-vs-admit-commits.md) and [cycle-commits.md](cycle-commits.md).
