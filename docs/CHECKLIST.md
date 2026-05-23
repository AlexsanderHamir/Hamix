# Task done criteria (checklist)

Authoritative contract for per-task **done criteria** (`task_checklist_items`, `task_checklist_completions`). REST surface: [API-HTTP.md](./API-HTTP.md) (Checklist section). Agent enforcement: [AGENT-WORKER.md](./AGENT-WORKER.md). Execution substrate: [EXECUTION-CYCLES.md](./EXECUTION-CYCLES.md).

## Purpose

Done criteria are acceptance requirements the operator attaches to a task. The agent worker must **prove** each criterion before the task may transition to `done`. A completion row without evidence is not sufficient.

## Data model

| Table | Role |
|-------|------|
| `task_checklist_items` | Definition rows: `id`, `task_id`, `sort_order`, `text`, optional `check` (shell command) |
| `task_checklist_completions` | Per-subject ledger: `task_id`, `item_id`, `at`, `done_by`, `evidence`, `verified_by`, `verifier_reasoning`, `cycle_id` |

**Inheritance:** When `checklist_inherit` is true on a task, definitions live on the nearest ancestor that does not inherit. `done` is tracked per subject task.

**Verifier kinds** (`verified_by`):

| Value | Meaning |
|-------|---------|
| `agent_self` | Execute agent claimed done in criteria report (not sufficient alone for mark-done when verify is enabled) |
| `verify_agent` | Adversarial verify phase accepted the criterion |
| `deterministic_check` | Optional `check` shell command exited 0 |
| `human_override` | Reserved; schema only in V1.1 |
| `legacy` | Pre-V1.1 rows; backfilled at migrate; never written by new worker |

## Edit locks

| State | Add | Edit text/check | Delete | Agent mark done |
|-------|-----|-----------------|--------|-----------------|
| Open (no running cycle) | yes | yes | yes* | yes |
| Cycle running | no (409) | no (409) | no (409) | yes |
| Verified (completion exists) | yes | no (409) | no (409) | yes |

\*Delete blocked if any subject has marked the item done.

## Worker verification loop (V1.1)

When `app_settings.verify_enabled` is true (default):

1. **Execute** — prompt includes all criteria with stable IDs; agent writes `.t2a/<cycle_id>/criteria-report.json`.
2. **Deterministic checks** — for each item with non-empty `check`, worker runs the command in the execute working dir (timeout from settings).
3. **Verify** — separate git worktree; verify runner reads diff + execute report; writes `.t2a/<cycle_id>/verify-report.json`.
4. **Decision** — all criteria pass → atomic `SetDoneWithEvidence` + `status=done`; any fail → retry execute (up to `verify_max_retries`, hard cap 10) or terminate `verification_failed` with **no** completion rows.

When `verify_enabled` is false, worker uses the legacy bulk-mark path (empty evidence, `verified_by` not required for new rows — existing `legacy` rows remain valid).

## File contracts

Paths are under `WorkingDir` (repo root from settings).

| File | Writer | Schema |
|------|--------|--------|
| `.t2a/<cycle_id>/criteria-report.json` | Execute agent | `{ "criteria": [{ "id", "claimed_done", "evidence" }] }` |
| `.t2a/<cycle_id>/verify-report.json` | Verify agent | `{ "criteria": [{ "id", "verified", "reasoning" }] }` |

**Limits:** 256 KB per report file; `evidence` and `reasoning` ≤ 16 KB each; verify `reasoning` ≥ 40 chars when `verified=true`. Duplicate IDs in a report → invalid. Symlinks rejected.

`.t2a/.gitignore` contains `*` so reports are not committed.

## Security

- Check commands run with **worker process privileges** on an **operator-owned host**. Not suitable for untrusted multi-tenant use without a separate hardening proposal.
- Env: `T2A_*` and `DATABASE_URL` stripped from check subprocesses (same policy as runner adapters).
- Evidence and reasoning are visible to all SSE subscribers on shared browsers.

## Configuration

See [SETTINGS.md](./SETTINGS.md): `verify_enabled`, `verify_max_retries`, `verify_runner_name`, `verify_runner_model`, `check_command_timeout_seconds`.

Values are snapshotted into `task_cycles.meta_json` at cycle start (`criteria_snapshot`, `verify_max_retries`, etc.).

## Related

- Project step/goal criteria (`project_steps.criteria`) are a **separate** JSON model gating project gates, not this checklist.
