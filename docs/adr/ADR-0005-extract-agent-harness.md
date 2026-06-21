# ADR-0005: Extract Agent Harness Package

> **Note** - Product renamed T2A to Hamix; identifiers below reflect the name at decision time unless updated inline.

**Date:** 2026-06-11
**Status:** Accepted
**Deciders:** Engineering

## Context

The in-process agent worker (`pkgs/agents/worker`) mixes two concerns:

1. **Queue consumer** — receive from `MemoryQueue`, admission checks, ack ordering, startup orphan sweep.
2. **Harness** — execute/verify phase choreography, prompt injection, report-file contracts, adversarial verification, git integrity checks, and crash/shutdown recovery of in-flight cycle state.

Roughly two-thirds of the worker package is harness logic, but it has no name — it is implicit in `processOne`. That makes the boundary hard to find, hard to test in isolation, and hard to extend (new phases, strategies, per-cycle isolation) without further bloating the worker package.

## Decision

Extract harness logic into `pkgs/agents/harness` as a **concrete type** (`harness.Harness`) with a single `Run(ctx, task)` entry point. No `Harness` interface or strategy registry at this time — the same rule we applied to runners before the registry existed.

The worker remains the public surface for `cmd/taskapi`: `worker.NewWorker`, `worker.CancelCurrentRun`, and type aliases for `Options`, `RunMetrics`, `CycleChangeNotifier`, `ProgressNotifier`, and stable reason constants (`CancelledByOperatorReason`, `ShutdownReason`, etc.).

This is a **move-only** refactor: behavior, contracts, report formats, SSE frames, and metrics labels are unchanged.

## Consequences

### Positive

- Harness has an explicit name and package doc — contributors know where cycle choreography lives.
- Harness can be unit-tested without queue plumbing.
- Future expansion (plan phase, alternate strategies, per-cycle workspace) has a clear home.

### Negative / Trade-offs

- One more package in the agents subtree; worker delegates to harness internally.
- `funclogmeasure` allowlist paths must be updated for moved symbols.

## Alternatives Considered

| Alternative | Reason Rejected |
|-------------|-----------------|
| Define a `Harness` interface + registry now | No second implementation exists; premature abstraction |
| Reorganize files inside `worker/` only | Does not make the concept explicit at the package boundary |
| Merge harness into `pkgs/agents/runner` | Runners are dumb execution primitives; harness orchestrates runners and store |
