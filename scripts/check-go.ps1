# Hamix Go verification — source of truth for the CI backend job.
#
# Steps: gofmt, go vet, scheduling boundary, go test, funclogmeasure
#
# Usage (repo root): .\scripts\check-go.ps1 [flags]
#
# Flags:
#   -Verbose          Stream full tool output (CI uses this)
#   -SkipFunclog      Skip funclogmeasure -enforce
#   -Help             Show options
#
# CI: ./scripts/check-go.sh --verbose

param(
    [switch]$Help,
    [switch]$Verbose,
    [switch]$SkipFunclog
)

if ($Help -or $args -contains '--help' -or $args -contains '-h') {
    Get-Content $PSCommandPath | Select-Object -Skip 1 -First 13 | ForEach-Object { $_ -replace '^# ?', '' }
    exit 0
}

$ErrorActionPreference = "Stop"
$repo = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $repo

$CheckStart = Get-Date
$script:Step = 0
$script:Passed = 0
$script:Total = if ($SkipFunclog) { 5 } else { 6 }
$script:StepStats = ""

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
        [int]$Code = 1,
        [string]$Fix = ""
    )
    Write-Host ""
    Write-Host "check FAILED: $Name ($($script:Step)/$($script:Total))" -ForegroundColor Red
    if ($Fix) { Write-Host "  fix: $Fix" -ForegroundColor Red }
    exit $Code
}

function Complete-Ok {
    param([string]$Detail = "")
    $elapsed = (Get-Date) - $CheckStart
    Write-Host ""
    Write-Host "check OK  $($script:Passed)/$($script:Total) passed  $(Format-Duration $elapsed)" -ForegroundColor Green
    if ($Detail) { Write-Host "  ($Detail)" }
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
        [scriptblock]$Command,
        [scriptblock]$StatsParser = $null
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
        $stats = ""
        if ($StatsParser -and -not $Verbose -and (Test-Path $log)) {
            $stats = & $StatsParser $log
        }
        $script:Passed++
        Write-OkLine $Label $sw.Elapsed $stats
        Remove-Item $log -Force -ErrorAction SilentlyContinue
        return
    }

    Write-Host "FAILED" -ForegroundColor Red
    if (-not $Verbose -and (Test-Path $log)) { Get-Content $log }
    Remove-Item $log -Force -ErrorAction SilentlyContinue
    Fail-Step $Label $code
}

function Get-GoTestStats {
    param([string]$LogPath)
    $content = Get-Content $LogPath -Raw
    $count = ([regex]::Matches($content, '(?m)^(ok|FAIL|\?)')).Count
    if ($count -gt 0) { return "$count packages" }
    return ""
}

function Step-Gofmt {
    $label = "gofmt"
    Write-StepPrefix
    Write-Host -NoNewline "$label "

    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    $unformatted = [System.Collections.Generic.List[string]]::new()
    Get-ChildItem -Recurse -Filter '*.go' -File |
        Where-Object { $_.FullName -notmatch '\\vendor\\' } |
        ForEach-Object {
            $line = & gofmt -l $_.FullName
            if ($line) {
                foreach ($path in ($line -split "`n")) {
                    if ($path) { [void]$unformatted.Add($path) }
                }
            }
        }
    $sw.Stop()

    if ($unformatted.Count -gt 0) {
        Write-Host "FAILED" -ForegroundColor Red
        $unformatted
        Fail-Step $label 1 "gofmt -w on the files above"
    }

    $script:Passed++
    Write-OkLine $label $sw.Elapsed
}

function Step-SchedulingBoundary {
    $label = "scheduling boundary"
    Write-StepPrefix
    Write-Host -NoNewline "$label "

    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    $boundaryHits = & rg -n "gorm|store/|handler/|agents/" pkgs/tasks/scheduling/ -g "*.go" -g "!*_test.go" 2>$null
    $sw.Stop()

    if ($boundaryHits) {
        Write-Host "FAILED" -ForegroundColor Red
        Write-Host "scheduling must not import persistence or transport:" -ForegroundColor Red
        $boundaryHits
        Fail-Step $label 1
    }

    $script:Passed++
    Write-OkLine $label $sw.Elapsed
}

Write-Host "Hamix check (Go)"
Write-Host ""

Invoke-CapturedStep "check-brand" { & "$PSScriptRoot\check-brand.ps1" }
Step-Gofmt
Invoke-CapturedStep "go vet" { go vet ./... }
Step-SchedulingBoundary
Invoke-CapturedStep "go test" { go test ./... -count=1 } { param($p) Get-GoTestStats $p }

if (-not $SkipFunclog) {
    Invoke-CapturedStep "funclogmeasure" { go run ./cmd/funclogmeasure -enforce }
}

Complete-Ok
