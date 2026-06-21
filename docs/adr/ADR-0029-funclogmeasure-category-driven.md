# ADR-0029: Category-Driven funclogmeasure Enforcement

> **Note** - Product renamed T2A to Hamix; identifiers below reflect the name at decision time unless updated inline.

**Date:** 2026-06-19
**Status:** Accepted
**Deciders:** Engineering

## Context

`cmd/funclogmeasure/analyze.go` grew to ~1010 lines, with ~757 lines devoted to a central `skipSlogRequirement` map listing 561 symbol keys. Every new pure helper, hot-path accessor, or refactor required editing the tool instead of the code it described. Maintenance cost dominated the value of CI enforcement.

The **trace-line contract** itself remains valuable: production functions should emit structured traces at operation boundaries or explicitly document why they omit them.

## Decision

Replace the monolithic analyzer and central skip map with a **category-driven satisfaction pipeline**:

1. **Direct slog** — type-resolved `log/slog` in the function body.
2. **Trace delegate** — calls to `calltrace.RunObserved` / `HelperIOIn` / `HelperIOOut`, or depth-1 thin wrappers to same-package callees that already satisfy.
3. **Structural auto-exempt** — `go/types` detection of standard boilerplate (`error.Error`, `sql.Scanner`, GORM `TableName`, heap/prometheus hooks, `cmd/main` → `run()`, etc.).
4. **Co-located directive** — `//funclogmeasure:skip category=<cat> reason="..."` on the function, with validated category and minimum reason length.

**Delete** `skipSlogRequirement` entirely. No legacy.tsv, burn-down metrics, or phased migration loader.

Split the tool into focused files (`scan.go`, `satisfy*.go`, `skip_auto.go`, `skip_directive.go`, `report.go`) each under the CODE_STANDARDS green zone.

JSON reports expose `satisfaction` counts (`direct_slog`, `trace_delegate`, `auto_exempt`, `directive`) instead of `legacy_skipped`.

## Consequences

### Positive

- New exempt functions: add a directive at the call site only — no tool edit.
- Boilerplate interface methods auto-pass without manual listing.
- `calltrace` wrappers satisfy without per-symbol configuration.
- Analyzer files stay reviewable; policy is data-driven from AST/types, not a static map.

### Negative / Trade-offs

- One-time repo pass added ~450 co-located directives for functions previously listed in the central map.
- Depth-1 wrapper detection is conservative; deeper delegate chains still need slog or a directive.
- Invalid directives fail the same as missing slog — contributors must follow syntax rules.

## Alternatives Considered

| Alternative | Reason Rejected |
| --- | --- |
| Keep central map, split file only | Does not fix maintenance bottleneck |
| legacy.tsv + burn-down migration | User rejected legacy layer; co-located directives are the source of truth |
| golangci-lint plugin only | Deferred; standalone `-enforce` in CI remains the gate |

## See also

- [observability-trace-lines.md](../domain/observability-trace-lines.md)
- `cmd/funclogmeasure/`
