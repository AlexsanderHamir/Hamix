# Resume continuation bundle

Cross-cycle **Resume from failure** loads one `ContinuationBundle` from the parent cycle instead of ad-hoc checkpoint fields.

## Loader

`loadContinuationBundle(parentCycleID)` classifies the parent outcome, checks sufficiency, routes resume entry, and assembles prompt blocks.

| Field | Purpose |
|-------|---------|
| `entry` | `execute` or `verifyOnly` |
| `failureClass` | runner, executeGate, verify, infrastructure, operator |
| `scopeFiles` | Paths from `git diff --name-only cycle_base..HEAD` |
| `commits` | Task-wide index with status |
| `executeFeedback` | Harness gate remediation (parallel to verify feedback) |
| `verifyFeedback` | Last verify attempt failures |
| `previouslyPassed` | Locked verify passes |

## Routing

- Parent execute **succeeded**, verify **failed**, parent has **eligible** commits → `verifyOnly` (`skipFirstExecute`)
- Otherwise → `execute` with continuation prompt (scope lock, status-grouped commits, anti-discovery)

## Prompt order

Lineage → failure explanation → scope lock → commits by status → execute/runner feedback → verify feedback → original prompt → git policy.

Insufficient data → `retry_checkpoint_failed` (no hollow resume).

See [retry-resume.md](retry-resume.md) and [ADR-0016](../adr/ADR-0016-observe-vs-admit-commits.md).
