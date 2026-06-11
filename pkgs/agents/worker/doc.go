// Package worker is the V1 in-process consumer of the ready-task queue.
//
// The worker owns queue mechanics: Receive, admission checks (reload,
// readiness, ready→running), AckAfterRecv ordering, and the startup
// orphan sweep (SweepOrphanRunningCycles). Cycle choreography — execute/
// verify phases, prompt injection, verification, integrity checks, and
// crash recovery — lives in pkgs/agents/harness. See docs/architecture.md
// and docs/adr/ADR-0005-extract-agent-harness.md.
package worker
