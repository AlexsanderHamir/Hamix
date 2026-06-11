# pkgs/agents/harness

Cycle choreography around `runner.Run`. The worker (`pkgs/agents/worker`) handles queue admission; the harness drives one task from `StartCycle` through terminal `TerminateCycle`.

See [docs/architecture.md](../../docs/architecture.md) (Agent worker and harness) and [ADR-0005](../../docs/adr/ADR-0005-extract-agent-harness.md).

## File map

| File | Responsibility |
|------|----------------|
| `harness.go` | `Harness`, `New`, `Options`, `CancelCurrentRun`, SSE notifiers, metrics interface |
| `cycle.go` | `Run`, execute/verify loop, runner invocation, phase completion, outcome classification |
| `verification.go` | Verify pipeline, LLM verify agent, criteria/verify report persistence |
| `verify_integrity.go` | Pre/post git snapshot; tamper detection during verify |
| `criteria_prompt.go` | Criteria injection and verify feedback in execute prompts |
| `criteria_parse.go` | Report file paths, parse `criteria-report.json` / `verify-report.json` |
| `project_context.go` | Project context selection and prompt injection |
| `meta.go` | Cycle `MetaJSON` and phase `details_json` normalization |
| `metrics.go` | `RunMetrics` seam and observation helpers |
| `recovery.go` | Panic, shutdown, and best-effort cycle closeout paths |

## Public entry point

```go
h := harness.New(store, runner, harness.Options{...})
h.Run(ctx, task) // task must already be StatusRunning
```

Callers outside tests typically use `worker.NewWorker`, which constructs the harness internally.
