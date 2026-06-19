# Live resume quality scorecard — run after feature commits land (not default CI).
# Prerequisites: taskapi on -base-url, Postgres, repo_root, Cursor CLI when using real runner.
$ErrorActionPreference = "Stop"
$repo = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

$baseURL = if ($env:T2A_RESUME_QUALITY_BASE_URL) { $env:T2A_RESUME_QUALITY_BASE_URL } else { "http://127.0.0.1:8080" }
$scenario = if ($env:T2A_RESUME_QUALITY_SCENARIO) { $env:T2A_RESUME_QUALITY_SCENARIO } else { "all" }
$out = if ($env:T2A_RESUME_QUALITY_OUT) { $env:T2A_RESUME_QUALITY_OUT } else { "logs/resume-quality.json" }
$minScore = if ($env:T2A_RESUME_QUALITY_MIN_SCORE) { [double]$env:T2A_RESUME_QUALITY_MIN_SCORE } else { 70 }

$env:T2A_TEST_RESUME_QUALITY = "1"
if (-not $env:T2A_TEST_REAL_CURSOR) {
    Write-Host "Note: T2A_TEST_REAL_CURSOR is not set; scorecard uses stub checks unless extended."
}

Push-Location $repo
try {
    & go run ./cmd/resumequality `
        -base-url $baseURL `
        -scenario $scenario `
        -out $out `
        -min-score $minScore
    exit $LASTEXITCODE
} finally {
    Pop-Location
}
