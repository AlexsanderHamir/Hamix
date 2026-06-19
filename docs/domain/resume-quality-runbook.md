# Resume quality runbook

Live validation runs **once** after feature commits land — not in default CI.

## Prerequisites

- Local Postgres (`DATABASE_URL` in `.env`)
- `taskapi` via `scripts/dev.ps1`
- Cursor CLI on PATH
- `/health/ready` OK, `repo_root` configured

## Command

```powershell
$env:T2A_TEST_REAL_CURSOR='1'
$env:T2A_TEST_RESUME_QUALITY='1'
go run ./cmd/resumequality -base-url http://127.0.0.1:8080 -scenario all -out logs/resume-quality-final.json -min-score 70
```

## Pass criteria

- Overall score ≥ **70%**
- Block **Q1 + Q5 + Q6** ≥ **80%** (discovery scope lock, verify-only skip, observed commits visible)

Scenarios S1–S4 are documented in the plan; extend `pkgs/agents/resumequality` for full live rubric.
