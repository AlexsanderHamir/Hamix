# Schema migrate — step 1 before dev servers. See CONTRIBUTING.md.
$ErrorActionPreference = "Stop"
$repo = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Push-Location $repo
try {
    Write-Host "=== schema migrate ==="
    & go run ./cmd/dbcheck -migrate
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} finally {
    Pop-Location
}
