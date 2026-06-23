# Hamix documentation site verification — source of truth for the CI docs job.
#
# Steps: npm ci (-Install), docusaurus build
#
# Usage (repo root): .\scripts\check-docs.ps1 [flags]
#
# Flags:
#   -Verbose     Stream full tool output (CI uses this)
#   -Install     Run npm ci in website/ before build
#   -Help        Show options
#
# CI: ./scripts/check-docs.sh --install --verbose

param(
    [switch]$Help,
    [switch]$Verbose,
    [switch]$Install
)

if ($Help -or $args -contains '--help' -or $args -contains '-h') {
    Get-Content $PSCommandPath | Select-Object -Skip 1 -First 13 | ForEach-Object { $_ -replace '^# ?', '' }
    exit 0
}

$ErrorActionPreference = "Stop"
$repo = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $repo

$websiteDir = Join-Path $repo "website"
if (-not (Test-Path (Join-Path $websiteDir "package.json"))) {
    Write-Error "website/package.json not found"
    exit 1
}

$CheckStart = Get-Date
$script:Step = 0
$script:Passed = 0
$script:Total = if ($Install) { 2 } else { 1 }

function Format-Duration {
    param([TimeSpan]$Span)
    $secs = [int][Math]::Round($Span.TotalSeconds)
    if ($secs -lt 60) { return "${secs}s" }
    return "{0}m{1:D2}s" -f [Math]::Floor($secs / 60), ($secs % 60)
}

function Write-StepPrefix {
    $script:Step++
    Write-Host -NoNewline "[$($script:Step)/$($script:Total)] "
}

function Fail-Step {
    param(
        [string]$Name,
        [int]$Code = 1
    )
    Write-Host ""
    Write-Host "check FAILED: $Name ($($script:Step)/$($script:Total))" -ForegroundColor Red
    exit $Code
}

function Complete-Ok {
    $elapsed = (Get-Date) - $CheckStart
    Write-Host ""
    Write-Host "check OK  $($script:Passed)/$($script:Total) passed  $(Format-Duration $elapsed)" -ForegroundColor Green
    exit 0
}

function Write-OkLine {
    param(
        [string]$Label,
        [TimeSpan]$Elapsed,
        [string]$Stats = ""
    )
    $pad = [Math]::Max(1, 22 - $Label.Length)
    $line = (" " * $pad) + "ok $(Format-Duration $Elapsed)"
    if ($Stats) { $line += "  ($Stats)" }
    Write-Host $line -ForegroundColor Green
}

function Invoke-CapturedStep {
    param(
        [string]$Label,
        [scriptblock]$Command
    )
    Write-StepPrefix
    Write-Host -NoNewline "$Label "

    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    $log = [System.IO.Path]::GetTempFileName()
    $code = 0
    $prevEap = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'

    try {
        if ($Verbose) {
            Write-Host "..." -ForegroundColor Cyan
            & $Command
            $code = $LASTEXITCODE
        } else {
            & $Command 2>&1 | Out-File -FilePath $log -Encoding utf8
            $code = $LASTEXITCODE
        }
        if ($null -eq $code) { $code = 0 }
    } catch {
        $code = 1
        if (-not $Verbose) { $_ | Out-File -FilePath $log -Encoding utf8 -Append }
    } finally {
        $ErrorActionPreference = $prevEap
        $sw.Stop()
    }

    if ($code -eq 0) {
        $script:Passed++
        Write-OkLine $Label $sw.Elapsed
        Remove-Item $log -Force -ErrorAction SilentlyContinue
        return
    }

    Write-Host "FAILED" -ForegroundColor Red
    if (-not $Verbose -and (Test-Path $log)) { Get-Content $log }
    Remove-Item $log -Force -ErrorAction SilentlyContinue
    Fail-Step $Label $code
}

Write-Host "Hamix check (docs)"
Write-Host ""

if ($Install) {
    Invoke-CapturedStep "npm ci" { Push-Location $websiteDir; try { npm ci } finally { Pop-Location } }
}

Push-Location $websiteDir
try {
    Invoke-CapturedStep "docs build" { npm run build }
} finally {
    Pop-Location
}

Complete-Ok
