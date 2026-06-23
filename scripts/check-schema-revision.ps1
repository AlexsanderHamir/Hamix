# Fail when domain or postgres.Migrate changes without a SchemaRevision bump.
$ErrorActionPreference = "Stop"
$repo = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Push-Location $repo
try {
    & bash "./scripts/check-schema-revision.sh"
    exit $LASTEXITCODE
} finally {
    Pop-Location
}
