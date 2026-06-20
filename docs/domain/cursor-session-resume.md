# Cursor session resume

ADR-0031 adds **CLI session continuity** on top of the existing harness phase ledger. A new phase row is still created for every `runner.Run`; continuing a Cursor chat does not reuse a phase row.

| | |
| --- | --- |
| **Applies to** | Cursor CLI `--resume`, harness phase ledger, `cursor_session_resume_enabled` |
| **Audience** | Contributors touching `pkgs/agents/harness/cursor_resume.go` or cursor adapter |
| **Prerequisite** | [harness.md](./harness.md) — cycle loop and phase model |
| **Decision record** | [ADR-0031](../adr/ADR-0031-cursor-session-resume-default.md) |

## In this article

- [Two resume layers](#two-resume-layers)
- [Session chains](#session-chains)
- [Policy chokepoint](#policy-chokepoint)
- [Storage](#storage)
- [Operator grep examples](#operator-grep-examples)
- [Configuration](#configuration)
- [See also](#see-also)

## Two resume layers

| Layer | Mechanism | Authority |
|-------|-----------|-----------|
| **Harness resume** | Checkpoint, continuation bundle, git state | DB + phase ledger |
| **Cursor resume** | `cursor-agent --resume <session_id>` | Optimization; falls back to full prompt |

## Session chains

Execute and verify maintain **separate** `session_id` chains. Never pass an execute session id to a verify run.

Typical in-cycle pattern:

```text
phase 1  execute  →  session E1 (new)
phase 2  verify   →  session V1 (new)
phase 3  execute  →  resume E1
phase 4  verify   →  fresh V2 (new execute since last verify)
phase 5  verify   →  resume V2 (verify-only retry)
```

## Policy chokepoint

[`pkgs/agents/harness/cursor_resume.go`](../../pkgs/agents/harness/cursor_resume.go) implements `resolveCursorResume` and returns `CursorResumeDecision` with:

| `cursor_resume_mode` | Meaning |
|----------------------|---------|
| `fresh` | No `--resume`; full `composeExecutePrompt` / `buildVerifyPrompt` |
| `resume` | `--resume` + `ComposeRecoveryDelta` stdin |
| `resume_fallback` | Resume failed once; retried with full prompt |

## Storage

- **Write:** `task_cycle_phases.details_json.session_id` on phase complete (cursor adapter).
- **Read:** `store.LastSessionID(ctx, cycleID, phase)` — latest **terminal** row for that phase in the cycle.

Cross-cycle **Resume from failure** reads the **parent** cycle's session for the entry phase when the child cycle has no prior phase of that type yet.

## Operator grep examples

```text
cursor_resume_mode=resume recovery_hint_kind=verify_implementation_fail
deny_reason=head_drift cursor_resume_mode=fresh
cursor_resume_mode=resume_fallback
```

## Configuration

`app_settings.cursor_session_resume_enabled` (default `true`). When `false`, behavior matches pre-ADR-0031 (always fresh chat). See [configuration.md](../configuration.md).

## See also

- [harness.md](./harness.md) — cycle loop and worker boundary
- [retry-resume.md](./retry-resume.md) — operator Resume from failure
- [ADR-0031](../adr/ADR-0031-cursor-session-resume-default.md)
